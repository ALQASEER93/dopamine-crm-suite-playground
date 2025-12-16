from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Role, SalesRep, Territory, User
from schemas.user import AdminUserPayload, AdminUserUpdate
from services.auth import hash_password, seed_default_roles

router = APIRouter(
    prefix="/admin/users",
    tags=["admin_users"],
    dependencies=[Depends(get_current_user), Depends(require_roles("sales_manager", "admin"))],
)


ROLE_MAP = {
    "admin": "admin",
    "manager": "sales_manager",
    "medical_rep": "medical_rep",
    "sales_rep": "medical_rep",
}


def _get_role(db: Session, user_type: str) -> Role:
    roles = seed_default_roles(db)
    slug = ROLE_MAP.get(user_type, "medical_rep")
    role = roles.get(slug)
    if not role:
        role = db.query(Role).filter(Role.slug == slug).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not found")
    return role


def _serialize_user(user: User) -> dict:
    sales_rep = None
    if user.sales_rep_profile:
        territory = user.sales_rep_profile.territory
        sales_rep = {
            "id": user.sales_rep_profile.id,
            "repType": user.sales_rep_profile.rep_type,
            "territoryId": user.sales_rep_profile.territory_id,
            "territoryName": territory.name if territory else None,
        }
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "isActive": user.is_active,
        "role": {"id": user.role.id, "slug": user.role.slug, "name": user.role.name},
        "salesRep": sales_rep,
    }


@router.get("/")
def list_users(db: Session = Depends(get_db)) -> dict:
    users = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.sales_rep_profile).joinedload(SalesRep.territory))
        .order_by(User.name.asc())
        .all()
    )
    data = [_serialize_user(u) for u in users]
    return {"data": data}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(payload: AdminUserPayload, db: Session = Depends(get_db)) -> dict:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")

    role = _get_role(db, payload.userType)
    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password or "password"),
        is_active=payload.isActive if payload.isActive is not None else True,
        role_id=role.id,
    )
    db.add(user)
    db.flush()

    if payload.userType in {"medical_rep", "sales_rep"}:
        territory = db.get(Territory, payload.territoryId) if payload.territoryId else None
        db.add(
            SalesRep(
                user_id=user.id,
                rep_type=payload.userType,
                territory_id=territory.id if territory else None,
            )
        )

    db.commit()
    db.refresh(user)
    return {"data": _serialize_user(user)}


@router.patch("/{user_id:int}")
def update_user(user_id: int, payload: AdminUserUpdate, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).options(joinedload(User.sales_rep_profile)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    updates = payload.model_dump(exclude_unset=True)
    if "email" in updates:
        new_email = updates["email"].lower()
        existing = db.query(User).filter(User.email == new_email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
        user.email = new_email

    if "name" in updates:
        user.name = updates["name"] or user.name
    if updates.get("password"):
        user.password_hash = hash_password(updates["password"])
    if "isActive" in updates and updates["isActive"] is not None:
        user.is_active = bool(updates["isActive"])

    user_type = updates.get("userType")
    if user_type:
        role = _get_role(db, user_type)
        user.role_id = role.id

    territory_id = updates.get("territoryId") if "territoryId" in updates else None
    if user_type or territory_id is not None:
        sales_rep = user.sales_rep_profile
        if user_type in {"medical_rep", "sales_rep"}:
            if not sales_rep:
                sales_rep = SalesRep(user_id=user.id)
                db.add(sales_rep)
            sales_rep.rep_type = user_type or sales_rep.rep_type
            sales_rep.territory_id = territory_id if territory_id is not None else sales_rep.territory_id
        elif sales_rep:
            db.delete(sales_rep)

    db.commit()
    db.refresh(user)
    return {"data": _serialize_user(user)}
