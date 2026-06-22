from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from core.db import get_db
from core.security import require_roles
from models.crm import User
from services.customer_assignment import AssignmentApplyInput, plan_or_apply_route_assignments
from services.customer_import import export_customers_csv, import_customers_from_workbook

router = APIRouter(
    prefix="/admin/customers",
    tags=["admin-customers"],
)


class AssignmentApplyItem(BaseModel):
    staging_item_id: int = Field(..., alias="stagingItemId")
    review_status: str = Field(..., alias="reviewStatus")
    assigned_rep_email: str | None = Field(default=None, alias="assignedRepEmail")
    assigned_rep_id: int | None = Field(default=None, alias="assignedRepId")
    assigned_rep: str | None = Field(default=None, alias="assignedRep")
    route_id: int | None = Field(default=None, alias="routeId")
    monthly_frequency_target: int | None = Field(default=None, alias="monthlyFrequencyTarget")

    model_config = ConfigDict(populate_by_name=True)


class AssignmentApplyRequest(BaseModel):
    assignments: list[AssignmentApplyItem]

    model_config = ConfigDict(populate_by_name=True)


@router.post("/import")
async def import_customers(
    file: UploadFile = File(...),
    dry_run: bool = Query(True, alias="dryRun"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict:
    filename = file.filename or ""
    if not filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload an Excel workbook with .xlsx or .xlsm extension.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    try:
        return import_customers_from_workbook(
            db,
            content,
            dry_run=dry_run,
            actor_user_id=current_user.id,
            original_filename=filename,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/export")
def export_customers(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles("admin")),
) -> Response:
    csv_text = export_customers_csv(db)
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="dpm-customers.csv"'},
    )


@router.post("/assignments/apply")
def apply_customer_assignments(
    payload: AssignmentApplyRequest,
    dry_run: bool = Query(True, alias="dryRun"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> dict:
    assignments = [
        AssignmentApplyInput(
            staging_item_id=item.staging_item_id,
            review_status=item.review_status,
            assigned_rep_email=item.assigned_rep_email,
            assigned_rep_id=item.assigned_rep_id,
            assigned_rep=item.assigned_rep,
            route_id=item.route_id,
            monthly_frequency_target=item.monthly_frequency_target,
        )
        for item in payload.assignments
    ]
    return plan_or_apply_route_assignments(
        db,
        assignments,
        dry_run=dry_run,
        actor_user_id=current_user.id,
    )
