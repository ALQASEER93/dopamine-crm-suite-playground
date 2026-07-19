from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from models.crm import (
    Collection,
    Doctor,
    Order,
    OrderLine,
    Pharmacy,
    Product,
    RepProfile,
    Role,
    Route,
    RouteAccount,
    StockLocation,
    Target,
    Territory,
    User,
    Visit,
)


def seed_test_reference_data(db: Session) -> None:
    """Seed tiny, unmistakable QA-only records for isolated pytest databases."""

    doctors = [
        Doctor(name=f"QA HCP {index}", specialty="QA Specialty", city="QA City", area="QA Area", classification="A")
        for index in range(1, 4)
    ]
    pharmacies = [
        Pharmacy(name=f"QA HCO {index}", city="QA City", area="QA Area", segment="QA Segment")
        for index in range(1, 4)
    ]
    for customer in [*doctors, *pharmacies]:
        model = type(customer)
        if not db.query(model).filter(model.name == customer.name).first():
            db.add(customer)

    product = db.query(Product).filter(Product.code == "QA-PRODUCT").first()
    if not product:
        product = Product(code="QA-PRODUCT", name="QA Product", line="QA Line", pack="QA Pack")
        db.add(product)
    db.commit()

    doctor = db.query(Doctor).filter(Doctor.name == "QA HCP 1").first()
    pharmacy = db.query(Pharmacy).filter(Pharmacy.name == "QA HCO 1").first()
    rep = db.query(User).join(Role).filter(Role.slug == "medical_rep").order_by(User.id.asc()).first()
    if not rep:
        return

    territory = db.query(Territory).filter(Territory.code == "QA-TERR").first()
    if not territory:
        territory = Territory(name="QA Territory", code="QA-TERR")
        db.add(territory)
        db.flush()

    rep_users = db.query(User).join(Role).filter(Role.slug == "medical_rep").all()
    for rep_user in rep_users:
        if not db.query(RepProfile).filter(RepProfile.user_id == rep_user.id).first():
            db.add(RepProfile(user_id=rep_user.id, rep_type="medical_rep", territory_id=territory.id))

    route = db.query(Route).filter(Route.name == "QA Route").first()
    if not route:
        route = Route(name="QA Route", rep_id=rep.id, frequency="weekly")
        db.add(route)
        db.flush()
        db.add(RouteAccount(route_id=route.id, account_type="doctor", doctor_id=doctor.id, visit_frequency="weekly"))
        db.add(RouteAccount(route_id=route.id, account_type="pharmacy", pharmacy_id=pharmacy.id, visit_frequency="bi-weekly"))

    if not db.query(Visit).first():
        started_at = datetime.now(timezone.utc) - timedelta(hours=2)
        ended_at = started_at + timedelta(minutes=35)
        db.add(
            Visit(
                visit_date=date.today(),
                rep_id=rep.id,
                doctor_id=doctor.id,
                notes="QA visit fixture.",
                samples_given="QA sample fixture",
                next_action="QA follow-up fixture",
                status="completed",
                started_at=started_at,
                ended_at=ended_at,
                start_lat=31.95,
                start_lng=35.91,
                end_lat=31.95,
                end_lng=35.91,
                start_accuracy=10.0,
                end_accuracy=10.0,
                duration_seconds=int((ended_at - started_at).total_seconds()),
            )
        )

    if not db.query(Order).first():
        order = Order(
            order_date=date.today(),
            pharmacy_id=pharmacy.id,
            status="confirmed",
            payment_status="pending",
            aljazeera_ref="QA-ORDER",
            total_amount=Decimal("1.00"),
        )
        db.add(order)
        db.flush()
        db.add(OrderLine(order_id=order.id, product_id=product.id, quantity=1, price=Decimal("1.00"), discount=0, bonus=0))

    if not db.query(Collection).first():
        db.add(Collection(collection_date=date.today(), amount=Decimal("1.00"), method="QA", pharmacy_id=pharmacy.id, reference="QA-COLLECTION"))

    if not db.query(Target).first():
        db.add(Target(rep_id=rep.id, product_id=product.id, period="2099-01", target_amount=Decimal("1.00")))

    if not db.query(StockLocation).filter(StockLocation.name == "QA Storage").first():
        db.add(StockLocation(name="QA Storage", location_type="test"))

    db.commit()
