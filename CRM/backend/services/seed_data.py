from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from models.crm import (
    Collection,
    Doctor,
    Order,
    OrderLine,
    Pharmacy,
    Product,
    Route,
    RouteAccount,
    StockLocation,
    Target,
    User,
    Visit,
)
from services.auth import seed_admin_and_rep


def seed_reference_data(db: Session) -> None:
    seed_admin_and_rep(db)

    doctor = db.query(Doctor).filter(Doctor.name == "Dr. Lina Haddad").first()
    if not doctor:
        doctor = Doctor(
            name="Dr. Lina Haddad",
            specialty="Cardiology",
            clinic="Heart Center",
            city="Amman",
            area="Shmeisani",
            classification="A",
            phone="0790000001",
        )
        db.add(doctor)

    pharmacy = db.query(Pharmacy).filter(Pharmacy.name == "WellCare Pharmacy").first()
    if not pharmacy:
        pharmacy = Pharmacy(
            name="WellCare Pharmacy",
            city="Amman",
            area="Abdali",
            segment="Retail",
            credit_limit=Decimal("5000"),
            payment_terms="30 days",
        )
        db.add(pharmacy)

    product = db.query(Product).filter(Product.code == "DPM-001").first()
    if not product:
        product = Product(
            code="DPM-001",
            name="Dopamine Forte",
            line="Cardio",
            pack="30 tablets",
            cost=Decimal("8.50"),
            selling_price=Decimal("12.00"),
            bonus_rules="Buy 10 get 1",
        )
        db.add(product)

    db.commit()

    rep = db.query(User).filter(User.email == "rep@dpm.test").first()
    if rep:
        route = db.query(Route).filter(Route.name == "Amman North").first()
        if not route:
            route = Route(name="Amman North", rep_id=rep.id, frequency="weekly")
            db.add(route)
            db.flush()
            db.add(
                RouteAccount(
                    route_id=route.id,
                    account_type="doctor",
                    doctor_id=doctor.id if doctor else None,
                    visit_frequency="weekly",
                )
            )
            db.add(
                RouteAccount(
                    route_id=route.id,
                    account_type="pharmacy",
                    pharmacy_id=pharmacy.id if pharmacy else None,
                    visit_frequency="bi-weekly",
                )
            )

        visit = db.query(Visit).first()
        if not visit and doctor and pharmacy:
            db.add(
                Visit(
                    visit_date=date.today(),
                    rep_id=rep.id,
                    doctor_id=doctor.id,
                    notes="Introductory visit.",
                    samples_given="Starter pack",
                    next_action="Follow-up call",
                )
            )

        order = db.query(Order).first()
        if not order and pharmacy and product:
            order = Order(
                order_date=date.today(),
                pharmacy_id=pharmacy.id,
                status="confirmed",
                payment_status="pending",
                aljazeera_ref="ALJ-001",
                total_amount=Decimal("120.00"),
            )
            db.add(order)
            db.flush()
            db.add(
                OrderLine(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=10,
                    price=Decimal("12.00"),
                    discount=0,
                    bonus=1,
                )
            )

        collection = db.query(Collection).first()
        if not collection and pharmacy:
            db.add(
                Collection(
                    collection_date=date.today(),
                    amount=Decimal("50.00"),
                    method="cash",
                    pharmacy_id=pharmacy.id,
                    reference="RCPT-1001",
                )
            )

        target = db.query(Target).first()
        if not target and product:
            db.add(
                Target(
                    rep_id=rep.id,
                    product_id=product.id,
                    period="2025-01",
                    target_amount=Decimal("5000.00"),
                )
            )

        stock_loc = db.query(StockLocation).filter(StockLocation.name == "Central Warehouse").first()
        if not stock_loc:
            db.add(StockLocation(name="Central Warehouse", location_type="warehouse"))

    db.commit()
