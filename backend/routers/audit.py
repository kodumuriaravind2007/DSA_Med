"""
Tamper-Evident Audit Trail & Cryptographic Verification Router.

Features:
- Searchable audit log history with SHA-256 hash chains
- 1-click integrity verification walking from Genesis Block
- Educational tamper-detection demonstration
- Security architecture disclosure
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from ..database import get_db
from ..models import AuditLog
from ..dsa.audit_chain import AuditChainVerifier, compute_audit_hash, GENESIS_HASH

router = APIRouter(prefix="/api/audit", tags=["Security & Audit Trail"])


@router.get("/logs")
def get_audit_logs(
    action: Optional[str] = None,
    actor: Optional[str] = None,
    record_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieves paginated audit log entries ordered by chronological sequence."""
    query = db.query(AuditLog)
    if action and action != "All":
        query = query.filter(AuditLog.action == action)
    if actor and actor != "All":
        query = query.filter(AuditLog.actor.ilike(f"%{actor}%"))
    if record_id:
        query = query.filter(AuditLog.record_id.ilike(f"%{record_id}%"))

    logs = query.order_by(AuditLog.id.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp,
            "actor": l.actor,
            "action": l.action,
            "record_id": l.record_id,
            "details": l.details,
            "prev_hash": l.prev_hash,
            "current_hash": l.current_hash,
        }
        for l in logs
    ]


@router.get("/verify")
def verify_audit_trail_integrity(db: Session = Depends(get_db)):
    """
    Executes full O(N) linear cryptographic verification across all audit entries.
    Recalculates SHA-256 hashes and confirms parent pointers.
    """
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    events_data = [
        {
            "id": l.id,
            "timestamp": l.timestamp,
            "actor": l.actor,
            "action": l.action,
            "record_id": l.record_id,
            "details": l.details,
            "prev_hash": l.prev_hash,
            "current_hash": l.current_hash,
        }
        for l in logs
    ]

    verification_result = AuditChainVerifier.verify_chain(events_data)
    verification_result["genesis_hash"] = GENESIS_HASH
    verification_result["security_notice"] = (
        "Hash chaining provides mathematical proof of tamper-evidence (detectability). "
        "Production security also requires role-based access control (RBAC), "
        "database encryption at rest, TLS in transit, and immutable WORM storage."
    )
    return verification_result


@router.post("/simulate-tamper")
def simulate_tamper_demo(target_index: int = 2, db: Session = Depends(get_db)):
    """
    Educational demonstration: Creates an in-memory clone of the audit trail,
    subtly tampers with one record's details without updating its hash, and
    executes verification to demonstrate instant cryptographic detection.
    (Leaves the persistent database untouched!)
    """
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    if len(logs) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 audit logs to demonstrate tampering.")

    idx = min(target_index, len(logs) - 1)
    events_data = [
        {
            "id": l.id,
            "timestamp": l.timestamp,
            "actor": l.actor,
            "action": l.action,
            "record_id": l.record_id,
            "details": l.details,
            "prev_hash": l.prev_hash,
            "current_hash": l.current_hash,
        }
        for l in logs
    ]

    # Tamper with the details of block at idx
    original_details = events_data[idx]["details"]
    events_data[idx]["details"] = original_details + " [UNAUTHORIZED TAMPERED DATA]"

    detection = AuditChainVerifier.verify_chain(events_data)

    return {
        "tamper_simulation_success": True,
        "tampered_block_index": idx,
        "tampered_event_id": events_data[idx]["id"],
        "original_payload": original_details,
        "tampered_payload": events_data[idx]["details"],
        "verification_result": detection,
        "explanation": (
            f"The verification algorithm detected payload corruption at block #{idx} "
            f"because SHA-256(tampered_payload) does not match the stored hash {events_data[idx]['current_hash'][:16]}..."
        )
    }
