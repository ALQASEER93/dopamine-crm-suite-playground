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
    legacy_sales_reps = db.query(User).join(Role).filter(Role.slug == "sales_rep").all()
    for rep in legacy_sales_reps:
        rep.role_id = roles["medical_rep"].id

    default_users = [
        (
            "admin@example.com",
            "Admin User",
            "admin",
            "password",
            ["admin@dopaminepharma.com", "admin@dpm.test"],
        ),
        (
            "manager@example.com",
            "Sales Manager",
            "sales_manager",
            "password",
            ["manager@dopaminepharma.com"],
        ),
        (
            "rep@example.com",
            "Medical Rep",
            "medical_rep",
            "password",
            ["rep@dopaminepharma.com", "rep@dpm.test"],
        ),
    ]

    for email, name, role_slug, password, aliases in default_users:
        role_id = roles[role_slug].id
        candidates = [email, *aliases]

        user = db.query(User).filter(User.email.in_(candidates)).first()
        if not user:
            user = db.query(User).filter(User.role_id == role_id).first()

        if not user:
            user = User(email=email, name=name, role_id=role_id, is_active=True, password_hash="")
            db.add(user)

        user.email = email
        user.name = name
        user.role_id = role_id
        user.is_active = True
        user.password_hash = hash_password(password)
    db.commit()


def seed_admin_and_rep(db: Session) -> None:
    roles = seed_default_roles(db)
    seed_default_users(db, roles)
