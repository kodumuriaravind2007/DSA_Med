"""
Pharmacy & Medical Supply Inventory Router for MedTree X.
Tracks medications, IV fluids, surgical consumables, PPE, and reagents with:
- Batch numbers and expiration dates
- Reorder thresholds and real-time low-stock alerts
- Stock transactions (Receipt, Issue, Adjustment)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from ..database import get_db
from ..models import InventoryItem, StockTransaction
from ..schemas import (
    InventoryItemResponse, StockTransactionCreate, StockTransactionResponse
)
from .patients import log_audit_event
from .websocket import manager

router = APIRouter(prefix="/api/inventory", tags=["Pharmacy & Inventory"])


@router.get("/items", response_model=List[InventoryItemResponse])
def get_inventory_items(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieves all pharmacy and medical supply items."""
    query = db.query(InventoryItem)
    if category:
        query = query.filter(InventoryItem.category == category)
    return query.order_by(InventoryItem.name.asc()).all()


@router.post("/transaction", response_model=StockTransactionResponse)
def record_stock_transaction(req: StockTransactionCreate, db: Session = Depends(get_db)):
    """Records a stock movement: Receipt (+), Issue (-), Adjustment (=)."""
    item = db.query(InventoryItem).filter(InventoryItem.id == req.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Inventory item '{req.item_id}' not found.")

    if req.transaction_type == "Issue":
        if item.quantity_on_hand < req.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock on hand ({item.quantity_on_hand} {item.unit}) to issue {req.quantity} {item.unit}."
            )
        item.quantity_on_hand -= req.quantity
    elif req.transaction_type == "Receipt":
        item.quantity_on_hand += req.quantity
    elif req.transaction_type == "Adjustment":
        item.quantity_on_hand = req.quantity

    now_iso = datetime.now().isoformat()
    tx = StockTransaction(
        item_id=req.item_id,
        transaction_type=req.transaction_type,
        quantity=req.quantity,
        reference_id=req.reference_id or "",
        actor=req.actor or "Pharmacy Tech",
        timestamp=now_iso,
        notes=req.notes or ""
    )
    db.add(tx)

    log_audit_event(
        db,
        actor=req.actor or "Pharmacy Tech",
        action=f"INVENTORY_{req.transaction_type.upper()}",
        record_id=req.item_id,
        details={
            "item_name": item.name,
            "quantity": req.quantity,
            "new_balance": item.quantity_on_hand,
            "reference": req.reference_id
        }
    )
    db.commit()
    db.refresh(tx)

    # Check for low-stock threshold alert
    if item.quantity_on_hand <= item.reorder_threshold:
        manager.broadcast_sync("INVENTORY_LOW_STOCK_ALERT", {
            "item_id": item.id,
            "name": item.name,
            "quantity_on_hand": item.quantity_on_hand,
            "threshold": item.reorder_threshold,
            "location": item.location
        })

    return tx


@router.get("/alerts")
def get_inventory_alerts(db: Session = Depends(get_db)):
    """Returns all inventory items requiring immediate replenishment or near expiration."""
    items = db.query(InventoryItem).all()
    today_str = datetime.now().strftime("%Y-%m-%d")
    thirty_days_ahead = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

    low_stock = []
    near_expiry = []

    for item in items:
        if item.quantity_on_hand <= item.reorder_threshold:
            low_stock.append({
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "quantity": item.quantity_on_hand,
                "threshold": item.reorder_threshold,
                "unit": item.unit,
                "location": item.location
            })
        if item.expiry_date and item.expiry_date <= thirty_days_ahead:
            near_expiry.append({
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "batch_number": item.batch_number,
                "expiry_date": item.expiry_date,
                "quantity": item.quantity_on_hand,
                "location": item.location
            })

    return {
        "low_stock_count": len(low_stock),
        "near_expiry_count": len(near_expiry),
        "low_stock_items": low_stock,
        "near_expiry_items": near_expiry,
        "timestamp": datetime.now().isoformat()
    }
