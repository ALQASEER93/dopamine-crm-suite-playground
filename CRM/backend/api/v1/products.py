from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
