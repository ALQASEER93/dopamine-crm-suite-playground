from __future__ import annotations

import logging
from typing import List, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.db import get_db
from models.hcp import HCP
from schemas.hcp import HCPCreate, HCPOut, HCPUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


def _paginate(query, page: int, page_size: int) -> Tuple[List[HCP], int]:
    total = query.count()
    items = (
        query.order_by(HCP.last_name.asc(), HCP.first_name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


@router.get("", response_model=dict)
def list_hcps(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(HCP).filter(HCP.is_active.is_(True))
    hcps, total = _paginate(query, page, page_size)

    data = [HCPOut.model_validate(hcp) for hcp in hcps]
    meta = {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }
    return {"data": data, "meta": meta}


@router.get("/{hcp_id}", response_model=HCPOut)
def get_hcp(hcp_id: int, db: Session = Depends(get_db)):
    hcp = db.query(HCP).filter(HCP.id == hcp_id, HCP.is_active.is_(True)).first()
    if not hcp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HCP not found.")
    return hcp


@router.post("", response_model=HCPOut, status_code=status.HTTP_201_CREATED)
def create_hcp(payload: HCPCreate, db: Session = Depends(get_db)):
    hcp = HCP(**payload.model_dump())
    db.add(hcp)
    db.commit()
    db.refresh(hcp)
    logger.info("Created HCP id=%s name=%s %s", hcp.id, hcp.first_name, hcp.last_name)
    return hcp


@router.put("/{hcp_id}", response_model=HCPOut)
def update_hcp(hcp_id: int, payload: HCPUpdate, db: Session = Depends(get_db)):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HCP not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hcp, field, value)

    db.commit()
    db.refresh(hcp)
    logger.info("Updated HCP id=%s", hcp.id)
    return hcp


@router.delete("/{hcp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hcp(hcp_id: int, db: Session = Depends(get_db)):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp or not hcp.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HCP not found.")

    hcp.is_active = False
    db.commit()
    logger.info("Soft deleted HCP id=%s", hcp.id)
