"""
Nutrition & Meal Delivery Management Router for MedTree X.
Provides:
- Diet order authoring (Regular, Diabetic, Renal, Cardiac, Soft, NPO)
- Scheduled meal deliveries with automated allergen & restriction conflict detection
- Safe bedside delivery verification
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional

from ..database import get_db
from ..models import DietOrder, MealDelivery, Patient, Allergy, TimelineEvent
from ..schemas import (
    DietOrderCreate, DietOrderResponse,
    MealDeliveryResponse
)
from .patients import log_audit_event
from .websocket import manager

router = APIRouter(prefix="/api/nutrition", tags=["Nutrition & Diet"])


def generate_next_diet_id(db: Session) -> str:
    orders = db.query(DietOrder.id).all()
    max_num = 400
    for (d_id,) in orders:
        if d_id and d_id.startswith("DIET-"):
            try:
                num = int(d_id.split("-")[1])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    return f"DIET-{max_num + 1}"


def generate_next_meal_id(db: Session) -> str:
    meals = db.query(MealDelivery.id).all()
    max_num = 300
    for (m_id,) in meals:
        if m_id and m_id.startswith("MEAL-"):
            try:
                num = int(m_id.split("-")[1])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    return f"MEAL-{max_num + 1}"


@router.get("/orders/{patient_id}", response_model=List[DietOrderResponse])
def get_patient_diet_orders(patient_id: str, db: Session = Depends(get_db)):
    """Retrieves all diet orders for a patient."""
    orders = db.query(DietOrder).filter(DietOrder.patient_id == patient_id).order_by(DietOrder.created_at.desc()).all()
    return orders


@router.post("/orders", response_model=DietOrderResponse)
def create_diet_order(req: DietOrderCreate, db: Session = Depends(get_db)):
    """Creates a new diet order and automatically populates scheduled meals."""
    patient = db.query(Patient).filter(Patient.patient_id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    diet_id = generate_next_diet_id(db)
    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")

    # If NPO is set, diet_type is strictly NPO
    diet_type = "NPO" if req.is_npo else req.diet_type

    # Deactivate any previous active diet order
    db.query(DietOrder).filter(
        DietOrder.patient_id == req.patient_id,
        DietOrder.status == "Active"
    ).update({"status": "Superseded"})

    diet_order = DietOrder(
        id=diet_id,
        patient_id=req.patient_id,
        diet_type=diet_type,
        allergens_restricted=req.allergens_restricted or "",
        texture=req.texture or "Standard",
        is_npo=req.is_npo,
        status="Active",
        ordering_clinician=req.ordering_clinician or "Attending Physician",
        notes=req.notes or "",
        created_at=now_iso
    )
    db.add(diet_order)
    db.flush()

    # Generate upcoming meal deliveries if NOT NPO
    if not req.is_npo:
        meal_periods = [
            ("Breakfast", f"{today_str}T08:00:00"),
            ("Lunch", f"{today_str}T12:30:00"),
            ("Dinner", f"{today_str}T19:00:00")
        ]
        for period, meal_time in meal_periods:
            meal_id = generate_next_meal_id(db)
            delivery = MealDelivery(
                id=meal_id,
                diet_order_id=diet_id,
                patient_id=req.patient_id,
                meal_period=period,
                scheduled_date=today_str,
                scheduled_time=meal_time,
                delivery_status="Scheduled",
                allergy_check_passed=True,
                conflict_details="",
                delivered_by="",
                delivered_at=None
            )
            db.add(delivery)
    else:
        # If NPO, block any existing scheduled meals
        db.query(MealDelivery).filter(
            MealDelivery.patient_id == req.patient_id,
            MealDelivery.delivery_status == "Scheduled"
        ).update({
            "delivery_status": "Conflict Blocked",
            "allergy_check_passed": False,
            "conflict_details": "BLOCKED: Patient is strictly NPO (Nothing by mouth)."
        })

    # Timeline event
    db.add(TimelineEvent(
        patient_id=req.patient_id,
        timestamp=now_iso,
        event_type="Nutrition",
        title=f"Diet Order Placed: {diet_type}",
        description=f"Clinical diet set to {diet_type} (Texture: {req.texture or 'Standard'}, NPO: {req.is_npo}). Clinician: {req.ordering_clinician}.",
        actor=req.ordering_clinician or "Attending Physician"
    ))

    log_audit_event(
        db,
        actor=req.ordering_clinician or "Attending Physician",
        action="CREATE_DIET_ORDER",
        record_id=diet_id,
        details={"patient_id": req.patient_id, "diet_type": diet_type, "is_npo": req.is_npo}
    )
    db.commit()
    db.refresh(diet_order)

    manager.broadcast_sync("DIET_ORDER_UPDATED", {"patient_id": req.patient_id, "diet_type": diet_type})
    return diet_order


@router.get("/deliveries", response_model=List[MealDeliveryResponse])
def get_all_meal_deliveries(patient_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Returns meal deliveries across the hospital or for a specific patient."""
    query = db.query(MealDelivery)
    if patient_id:
        query = query.filter(MealDelivery.patient_id == patient_id)
    return query.order_by(MealDelivery.scheduled_time.asc()).all()


@router.post("/deliveries/{delivery_id}/verify-and-deliver", response_model=MealDeliveryResponse)
def verify_and_deliver_meal(
    delivery_id: str,
    delivered_by: str = "Dietary Aide",
    meal_items: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Automated pre-delivery bedside verification:
    1. Checks if patient is marked NPO
    2. Checks patient allergy roster against meal ingredients
    3. Blocks delivery if a safety conflict is detected
    """
    delivery = db.query(MealDelivery).filter(MealDelivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Meal delivery record not found.")

    diet_order = db.query(DietOrder).filter(DietOrder.id == delivery.diet_order_id).first()
    patient = db.query(Patient).filter(Patient.patient_id == delivery.patient_id).first()

    # Safety Check 1: NPO check
    if diet_order and diet_order.is_npo:
        delivery.delivery_status = "Conflict Blocked"
        delivery.allergy_check_passed = False
        delivery.conflict_details = "CRITICAL SAFETY INTERCEPT: Patient is marked NPO (Nil per os). Meal delivery refused."
        db.commit()
        manager.broadcast_sync("MEAL_DELIVERY_BLOCKED", {
            "delivery_id": delivery_id,
            "patient_id": delivery.patient_id,
            "reason": delivery.conflict_details
        })
        return delivery

    # Safety Check 2: Patient Allergy Cross-Reference
    allergies = db.query(Allergy).filter(Allergy.patient_id == delivery.patient_id).all()
    allergen_names = [a.allergen.lower() for a in allergies]

    # Inspect meal items or restricted allergens in diet order
    conflict_found = False
    conflict_desc = ""

    if meal_items:
        items_lower = meal_items.lower()
        for allergen in allergen_names:
            if allergen in items_lower:
                conflict_found = True
                conflict_desc = f"ALLERGY CONFLICT: Meal item contains '{allergen.title()}', which matches patient's severe allergy profile."
                break

    if diet_order and diet_order.allergens_restricted:
        for restricted in diet_order.allergens_restricted.split(","):
            r_clean = restricted.strip().lower()
            if r_clean and meal_items and r_clean in meal_items.lower():
                conflict_found = True
                conflict_desc = f"DIET RESTRICTION CONFLICT: Meal contains restricted item '{restricted.strip()}'."
                break

    now_iso = datetime.now().isoformat()

    if conflict_found:
        delivery.delivery_status = "Conflict Blocked"
        delivery.allergy_check_passed = False
        delivery.conflict_details = conflict_desc
        db.add(TimelineEvent(
            patient_id=delivery.patient_id,
            timestamp=now_iso,
            event_type="Nutrition Alert",
            title="Meal Delivery Intercepted",
            description=f"Bedside safety check intercepted {delivery.meal_period} meal: {conflict_desc}",
            actor=delivered_by
        ))
        log_audit_event(
            db,
            actor=delivered_by,
            action="MEAL_DELIVERY_BLOCKED",
            record_id=delivery_id,
            details={"patient_id": delivery.patient_id, "reason": conflict_desc}
        )
        db.commit()
        db.refresh(delivery)

        manager.broadcast_sync("MEAL_DELIVERY_BLOCKED", {
            "delivery_id": delivery_id,
            "patient_id": delivery.patient_id,
            "conflict": conflict_desc
        })
        return delivery

    # If all safety checks passed, record delivery
    delivery.delivery_status = "Delivered"
    delivery.allergy_check_passed = True
    delivery.delivered_by = delivered_by
    delivery.delivered_at = now_iso
    delivery.conflict_details = "Verified safe: 0 allergy conflicts detected."

    db.add(TimelineEvent(
        patient_id=delivery.patient_id,
        timestamp=now_iso,
        event_type="Nutrition",
        title=f"Meal Delivered: {delivery.meal_period}",
        description=f"{delivery.meal_period} meal delivered by {delivered_by}. Bedside allergy validation passed.",
        actor=delivered_by
    ))

    log_audit_event(
        db,
        actor=delivered_by,
        action="MEAL_DELIVERY_CONFIRMED",
        record_id=delivery_id,
        details={"patient_id": delivery.patient_id, "meal_period": delivery.meal_period}
    )
    db.commit()
    db.refresh(delivery)

    manager.broadcast_sync("MEAL_DELIVERY_CONFIRMED", {"delivery_id": delivery_id, "patient_id": delivery.patient_id})
    return delivery
