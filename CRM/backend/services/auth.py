from __future__ import annotations

import logging
import os
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


def is_admin_reset_enabled() -> bool:
    reset_flag = settings.default_admin_reset
    env_reset = os.getenv("DEFAULT_ADMIN_RESET")
    if env_reset is not None:
        env_value = env_reset.strip().lower() in {"true", "1", "yes", "y"}
        if reset_flag is None or env_value != reset_flag:
            reset_flag = env_value
    return bool(reset_flag)


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


DEFAULT_USERS = [
    (
        "admin@example.com",
        "Admin User",
        "admin",
        "Admin12345!",
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
        "Rep12345!",
        ["rep@dopaminepharma.com", "rep@dpm.test"],
    ),
]


def seed_default_users(db: Session, roles: dict[str, Role]) -> None:
    legacy_sales_reps = db.query(User).join(Role).filter(Role.slug == "sales_rep").all()
    for rep in legacy_sales_reps:
        rep.role_id = roles["medical_rep"].id

    for email, name, role_slug, password, aliases in DEFAULT_USERS:
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
    if not settings.seed_default_users:
        logger.info("Default user seeding disabled.")
        if settings.app_env.lower() == "production":
            deactivate_default_users_if_insecure(db)
        return
    seed_default_users(db, roles)


def ensure_admin_from_env(db: Session) -> None:
    if not is_admin_reset_enabled():
        return
    password = settings.default_admin_password or os.getenv("DEFAULT_ADMIN_PASSWORD")
    if not password:
        return

    email = (
        settings.default_admin_email
        or os.getenv("DEFAULT_ADMIN_EMAIL")
        or "admin@example.com"
    ).strip().lower()
    roles = seed_default_roles(db)
    admin_role = roles["admin"]

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name="Admin User", role_id=admin_role.id, is_active=True)
        db.add(user)
        logger.info("Created default admin from env (%s).", email)

    should_reset = True
    if should_reset:
        user.password_hash = hash_password(password)
        logger.info("Reset default admin password from env (%s).", email)

    user.name = user.name or "Admin User"
    user.role_id = admin_role.id
    user.is_active = True
    db.commit()


def ensure_default_admin(db: Session) -> None:
    email, name, role_slug, password, _aliases = DEFAULT_USERS[0]
    roles = seed_default_roles(db)
    role = roles[role_slug]

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=name, role_id=role.id, is_active=True)
        db.add(user)

    user.name = name
    user.role_id = role.id
    user.is_active = True
    user.password_hash = hash_password(password)
    db.commit()


def deactivate_default_users_if_insecure(db: Session) -> None:
    for email, _name, _role_slug, password, aliases in DEFAULT_USERS:
        candidates = [email, *aliases]
        users = db.query(User).filter(User.email.in_(candidates)).all()
        for user in users:
            if not user.is_active:
                continue
            if verify_password(password, user.password_hash):
                user.is_active = False
                logger.warning("Disabled default user %s with unchanged password.", user.email)
    db.commit()


def has_admin_user(db: Session) -> bool:
    return (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.slug == "admin", User.is_active.is_(True))
        .first()
        is not None
    )


def bootstrap_admin(
    db: Session,
    *,
    email: str,
    name: str,
    password: str,
) -> User:
    roles = seed_default_roles(db)
    admin_role = roles["admin"]
    user = db.query(User).filter(User.email == email.lower()).first()
    if user:
        raise ValueError("User already exists.")
    user = User(
        email=email.lower(),
        name=name,
        role_id=admin_role.id,
        is_active=True,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
