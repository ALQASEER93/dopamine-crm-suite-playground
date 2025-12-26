from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import RepProfile, Role, Territory, User
from schemas.user import AdminUserCreate, AdminUserOut, AdminUserUpdate, SalesRepInfo
from services.auth import hash_password

router = APIRouter(
    prefix="/admin/users",
    tags=["admin_users"],
    dependencies=[Depends(get_current_user), Depends(require_roles("sales_manager", "admin"))],
)


def _resolve_role_slug(user_type: str) -> str:
    normalized = (user_type or "").strip().lower()
    if normalized in {"manager", "sales_manager"}:
        return "sales_manager"
    if normalized in {"admin"}:
        return "admin"
    if normalized in {"medical_rep", "sales_rep"}:
        return "medical_rep"
    return "medical_rep"


def _get_role(db: Session, role_slug: str) -> Role:
    role = db.query(Role).filter(Role.slug == role_slug).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not found.")
    return role


def _build_sales_rep_info(rep_profile: RepProfile | None) -> SalesRepInfo | None:
    if not rep_profile:
        return None
    territory = rep_profile.territory
    return SalesRepInfo(
        repType=rep_profile.rep_type,
        territoryId=territory.id if territory else None,
        territoryName=territory.name if territory else None,
    )


def _serialize_admin_user(user: User) -> AdminUserOut:
    rep_profile = user.rep_profile
    sales_rep = _build_sales_rep_info(rep_profile)
    return AdminUserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        isActive=user.is_active,
        role=user.role,
        salesRep=sales_rep,
    )


def _ensure_rep_profile(
    db: Session,
    user: User,
    *,
    rep_type: str,
    territory_id: int | None,
) -> RepProfile:
    profile = db.query(RepProfile).filter(RepProfile.user_id == user.id).first()
    if not profile:
        profile = RepProfile(user_id=user.id, rep_type=rep_type)
        db.add(profile)
    profile.rep_type = rep_type
    profile.territory_id = territory_id
    return profile


@router.get("", response_model=list[AdminUserOut])
def list_admin_users(db: Session = Depends(get_db)) -> list[AdminUserOut]:
    users = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.rep_profile).joinedload(RepProfile.territory))
        .order_by(User.name.asc())
        .all()
    )
    return [_serialize_admin_user(user) for user in users]


@router.post("", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED)
def create_admin_user(payload: AdminUserCreate, db: Session = Depends(get_db)) -> AdminUserOut:
    existing = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use.")

    role_slug = _resolve_role_slug(payload.userType)
    role = _get_role(db, role_slug)
    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        is_active=True,
        role_id=role.id,
    )
    db.add(user)
    db.flush()

    if role_slug == "medical_rep":
        territory_id = payload.territoryId
        if territory_id:
            territory = db.get(Territory, territory_id)
            if not territory:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Territory not found.")
        _ensure_rep_profile(
            db,
            user,
            rep_type=payload.userType if payload.userType in {"medical_rep", "sales_rep"} else "medical_rep",
            territory_id=territory_id,
        )

    db.commit()
    db.refresh(user)
    return _serialize_admin_user(user)


@router.patch("/{user_id}", response_model=AdminUserOut)
def update_admin_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
) -> AdminUserOut:
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.rep_profile).joinedload(RepProfile.territory))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    updates = payload.model_dump(exclude_unset=True)

    if "email" in updates and updates["email"]:
        email = updates["email"].lower()
        existing = db.query(User).filter(func.lower(User.email) == email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use.")
        user.email = email

    if "name" in updates and updates["name"]:
        user.name = updates["name"]

    if "password" in updates and updates["password"]:
        user.password_hash = hash_password(updates["password"])

    if "isActive" in updates and updates["isActive"] is not None:
        user.is_active = updates["isActive"]

    if "userType" in updates and updates["userType"]:
        role_slug = _resolve_role_slug(updates["userType"])
        role = _get_role(db, role_slug)
        user.role_id = role.id

    territory_id = (
        updates["territoryId"]
        if "territoryId" in updates
        else (user.rep_profile.territory_id if user.rep_profile else None)
    )
    if user.role and user.role.slug == "medical_rep":
        rep_type = updates.get("userType") or (user.rep_profile.rep_type if user.rep_profile else "medical_rep")
        _ensure_rep_profile(db, user, rep_type=rep_type, territory_id=territory_id)
    else:
        if user.rep_profile:
            db.delete(user.rep_profile)

    db.commit()
    db.refresh(user)
    return _serialize_admin_user(user)
