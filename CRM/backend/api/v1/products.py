from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Product
from schemas.common import PaginatedResponse
from schemas.crm import ProductCreate, ProductOut, ProductUpdate

router = APIRouter(
    prefix="/products",
    tags=["products"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[ProductOut])
def list_products(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    line: str | None = None,
    search: str | None = None,
    active: bool | None = Query(default=None, alias="is_active"),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ProductOut]:
    query = db.query(Product)
    if line:
        query = query.filter(Product.line.ilike(f"%{line}%"))
    if search:
        lowered = f"%{search.lower()}%"
        query = query.filter(
            func.lower(Product.name).like(lowered) | func.lower(Product.code).like(lowered)
        )
    if active is not None:
        query = query.filter(Product.is_active.is_(active))

    page_size = clamp_page_size(page_size)
    products, total = paginate(query.order_by(Product.name.asc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=products,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/",
    response_model=ProductOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)) -> Product:
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put(
    "/{product_id}",
    response_model=ProductOut,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)) -> Product:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
    response_class=Response,
)
def deactivate_product(product_id: int, db: Session = Depends(get_db)) -> Response:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    product.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/export", dependencies=[Depends(require_roles("sales_manager", "admin"))])
def export_products(
    line: str | None = None,
    search: str | None = None,
    active: bool | None = Query(default=None, alias="is_active"),
    db: Session = Depends(get_db),
) -> Response:
    query = db.query(Product)
    if line:
        query = query.filter(Product.line.ilike(f"%{line}%"))
    if search:
        lowered = f"%{search.lower()}%"
        query = query.filter(
            func.lower(Product.name).like(lowered) | func.lower(Product.code).like(lowered)
        )
    if active is not None:
        query = query.filter(Product.is_active.is_(active))

    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "id",
            "code",
            "name",
            "line",
            "pack",
            "cost",
            "selling_price",
            "bonus_rules",
            "is_active",
        ],
    )
    writer.writeheader()
    for product in query.order_by(Product.name.asc()).all():
        writer.writerow(
            {
                "id": product.id,
                "code": product.code,
                "name": product.name,
                "line": product.line or "",
                "pack": product.pack or "",
                "cost": product.cost or "",
                "selling_price": product.selling_price or "",
                "bonus_rules": product.bonus_rules or "",
                "is_active": product.is_active,
            }
        )

    headers = {"Content-Disposition": 'attachment; filename="products.csv"'}
    return Response(content=buffer.getvalue(), media_type="text/csv", headers=headers)


@router.post(
    "/import",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
async def import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file.")

    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    created = 0
    updated = 0
    errors: list[str] = []

    for idx, row in enumerate(reader, start=2):
        code = (row.get("code") or "").strip()
        name = (row.get("name") or "").strip()
        if not code or not name:
            errors.append(f"Row {idx}: code and name are required.")
            continue
        product = db.query(Product).filter(Product.code == code).first()
        payload = {
            "code": code,
            "name": name,
            "line": (row.get("line") or "").strip() or None,
            "pack": (row.get("pack") or "").strip() or None,
            "bonus_rules": (row.get("bonus_rules") or "").strip() or None,
        }
        cost_raw = (row.get("cost") or "").strip()
        price_raw = (row.get("selling_price") or "").strip()
        if cost_raw:
            payload["cost"] = cost_raw
        if price_raw:
            payload["selling_price"] = price_raw
        is_active_raw = (row.get("is_active") or "").strip().lower()
        if is_active_raw in {"false", "0", "no"}:
            payload["is_active"] = False
        elif is_active_raw in {"true", "1", "yes"}:
            payload["is_active"] = True

        if product:
            for key, value in payload.items():
                setattr(product, key, value)
            updated += 1
        else:
            db.add(Product(**payload))
            created += 1

    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(errors))

    db.commit()
    return {"created": created, "updated": updated}
