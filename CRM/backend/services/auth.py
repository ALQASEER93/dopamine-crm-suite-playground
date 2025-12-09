from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from core.config import settings
from models.crm import Role, User

logger = logging.getLogger(__name__)

password_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def issue_token(user: User, expires_in_minutes: int = 60) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.slug if user.role else None,
        "exp": datetime.now(tz=timezone.utc) + timedelta(minutes=expires_in_minutes),
        "iat": datetime.now(tz=timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def find_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower()).first()


def authenticate(db: Session, email: str, password: str) -> Optional[User]:
    user = find_user_by_email(db, email)
    if not user or not user.is_active:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


def seed_default_roles(db: Session) -> dict[str, Role]:
    defaults = [
        ("admin", "Admin"),
        ("executive", "Executive"),
        ("sales_manager", "Sales Manager"),
        ("medical_rep", "Medical Representative"),
        ("accountant", "Accountant"),
    ]
    slug_to_role: dict[str, Role] = {}

    for slug, name in defaults:
        role = db.query(Role).filter(Role.slug == slug).first()
        if not role:
            role = Role(slug=slug, name=name)
            db.add(role)
            db.flush()
        slug_to_role[slug] = role

    db.commit()
    return slug_to_role


def seed_default_users(db: Session, roles: dict[str, Role]) -> None:
    # Normalize legacy emails and role slugs from earlier iterations.
    legacy_users = db.query(User).filter(User.email.ilike("%@dpm.test")).all()
    for legacy in legacy_users:
        legacy.email = legacy.email.replace("@dpm.test", "@dopaminepharma.com")

    legacy_sales_reps = db.query(User).join(Role).filter(Role.slug == "sales_rep").all()
    for rep in legacy_sales_reps:
        rep.role_id = roles["medical_rep"].id

    default_users = [
        ("admin@dopaminepharma.com", "Admin User", "admin", "admin123"),
        ("manager@dopaminepharma.com", "Sales Manager", "sales_manager", "manager123"),
        ("rep@dopaminepharma.com", "Medical Rep", "medical_rep", "rep123"),
    ]

    for email, name, role_slug, password in default_users:
        role_id = roles[role_slug].id
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.name = name
            user.role_id = role_id
            user.is_active = True
            user.password_hash = hash_password(password)
        else:
            existing_by_role = db.query(User).filter(User.role_id == role_id).first()
            if existing_by_role:
                existing_by_role.email = email
                existing_by_role.name = name
                existing_by_role.is_active = True
                existing_by_role.password_hash = hash_password(password)
            else:
                user = User(
                    email=email,
                    name=name,
                    role_id=role_id,
                    password_hash=hash_password(password),
                    is_active=True,
                )
                db.add(user)
    db.commit()


def seed_admin_and_rep(db: Session) -> None:
    roles = seed_default_roles(db)
    seed_default_users(db, roles)
