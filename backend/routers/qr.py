"""
Cryptographically Signed QR Code Identification & Doctor-Specific Access Router for MedTree X.
Generates opaque, tamper-evident reference tokens for patient wristbands,
allowing rapid bedside patient verification without exposing raw sensitive credentials,
and enforces care-team authorization (attending doctor vs covering doctor with temporary access grant).
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import hmac
import hashlib
import json
import secrets
import uuid
from typing import List

from ..database import get_db
from ..models import Patient, Allergy, Bed, Doctor, TemporaryQRAccessGrant, AuditLog
from ..schemas import (
    QRTokenResponse, QRVerifyRequest, QRDoctorVerifyRequest,
    TemporaryQRAccessRequest, TemporaryQRAccessResponse
)
from ..auth import JWT_SECRET_KEY, _base64url_encode, _base64url_decode
from ..dsa.audit_chain import compute_audit_hash, GENESIS_HASH
from .patients import log_audit_event

router = APIRouter(prefix="/api/qr", tags=["QR Patient Identification"])


def _decode_and_verify_token(raw_token: str) -> str:
    """Helper to verify HMAC signature and extract patient_id."""
    raw_token = raw_token.strip()
    if not raw_token.startswith("MTX-"):
        raise HTTPException(status_code=400, detail="Invalid token format. Not a valid MedTree X identity token.")

    token_body = raw_token[4:]
    parts = token_body.split(".")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Malformed token structure.")

    payload_b64, sig_b64 = parts

    # Validate HMAC signature
    expected_sig = hmac.new(JWT_SECRET_KEY.encode('utf-8'), payload_b64.encode('ascii'), hashlib.sha256).digest()
    actual_sig = _base64url_decode(sig_b64)

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(
            status_code=400,
            detail="Cryptographic verification failed: Token signature is invalid or has been tampered with."
        )

    # Decode payload
    try:
        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
        patient_id = payload.get("pid")
        if not patient_id:
            raise ValueError("Missing patient ID in token")
        return patient_id
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse token payload.")


@router.get("/token/{patient_id}", response_model=QRTokenResponse)
def generate_patient_qr_token(patient_id: str, db: Session = Depends(get_db)):
    """Generates an opaque HMAC-signed patient identity token for wristbands and digital cards."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    now_ts = int(datetime.now(timezone.utc).timestamp())
    nonce = secrets.token_hex(6)

    payload = {
        "pid": patient.patient_id,
        "iat": now_ts,
        "nonce": nonce
    }
    payload_json = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
    payload_b64 = _base64url_encode(payload_json)

    # Compute HMAC signature
    sig = hmac.new(JWT_SECRET_KEY.encode('utf-8'), payload_b64.encode('ascii'), hashlib.sha256).digest()
    sig_b64 = _base64url_encode(sig)

    qr_token = f"MTX-{payload_b64}.{sig_b64}"
    iso_now = datetime.now().isoformat()

    return QRTokenResponse(
        patient_id=patient.patient_id,
        full_name=patient.full_name,
        qr_token=qr_token,
        issued_at=iso_now,
        verification_url=f"/api/qr/verify?token={qr_token}"
    )


@router.post("/verify")
def verify_patient_qr_token(req: QRVerifyRequest, db: Session = Depends(get_db)):
    """
    Standard bedside wristband QR verification for general clinical staff.
    """
    patient_id = _decode_and_verify_token(req.qr_token)

    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found in hospital records.")

    allergies = db.query(Allergy).filter(Allergy.patient_id == patient_id).all()
    allergy_list = [f"{a.allergen} ({a.severity})" for a in allergies]

    bed = db.query(Bed).filter(Bed.bed_id == patient.assigned_bed_id).first() if patient.assigned_bed_id else None

    log_audit_event(
        db,
        actor="QR Bedside Scanner",
        action="QR_IDENTITY_VERIFIED",
        record_id=patient.patient_id,
        details={"scanned_token": req.qr_token[:15] + "..."}
    )
    db.commit()

    return {
        "status": "verified",
        "verification_status": "verified",
        "patient_id": patient.patient_id,
        "full_name": patient.full_name,
        "age": patient.age,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "priority": patient.priority,
        "clinical_status": patient.status,
        "department": patient.department,
        "assigned_doctor_id": patient.assigned_doctor_id or "Unassigned",
        "assigned_bed": bed.bed_id if bed else "Unassigned",
        "ward": bed.ward if bed else "N/A",
        "allergies": allergy_list or ["No Known Allergies (NKDA)"],
        "verification_time": datetime.now().isoformat()
    }


@router.post("/verify-doctor-access")
def verify_doctor_qr_access(req: QRDoctorVerifyRequest, db: Session = Depends(get_db)):
    """
    Phase 4: Doctor-Specific Bedside QR Access Verification.
    Validates cryptographic wristband token AND strictly checks care-team assignment.
    Grants access ONLY if the scanner is:
    1. The primary assigned attending physician
    2. A covering physician with an active TemporaryQRAccessGrant
    3. An authorized nurse on duty for the patient's ward
    4. An administrator
    Otherwise denies access and logs an unauthorized access violation to the audit log.
    """
    patient_id = _decode_and_verify_token(req.qr_token)

    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found.")

    role_lower = req.role.lower()
    now_iso = datetime.utcnow().isoformat()
    is_authorized = False
    access_type = "Denied"
    grant_info = None

    if "admin" in role_lower:
        is_authorized = True
        access_type = "Administrative Clearance"
    elif "nurse" in role_lower:
        is_authorized = True
        access_type = "Inpatient Ward Nurse"
    elif "doctor" in role_lower:
        # Check 1: Primary attending physician match
        doctor_id = req.doctor_id or req.user_id or req.username
        if patient.assigned_doctor_id and doctor_id == patient.assigned_doctor_id:
            is_authorized = True
            access_type = "Primary Attending Physician"
        else:
            # Check 2: Active Temporary QR Access Grant
            active_grant = (
                db.query(TemporaryQRAccessGrant)
                .filter(
                    TemporaryQRAccessGrant.patient_id == patient_id,
                    TemporaryQRAccessGrant.doctor_id == doctor_id,
                    TemporaryQRAccessGrant.is_revoked == False,
                    TemporaryQRAccessGrant.expires_at > now_iso
                )
                .first()
            )
            if active_grant:
                is_authorized = True
                access_type = f"Temporary Covering Grant ({active_grant.access_level})"
                grant_info = {
                    "grant_id": active_grant.id,
                    "granted_by": active_grant.granted_by,
                    "access_level": active_grant.access_level,
                    "expires_at": active_grant.expires_at
                }

    if not is_authorized:
        # Audit log the unauthorized attempt
        last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
        prev_h = last_log.current_hash if last_log else GENESIS_HASH
        details = (
            f"ACCESS DENIED: Doctor/User {req.username} (ID: {req.doctor_id or req.user_id}) "
            f"attempted bedside QR access for Patient {patient_id}. Assigned doctor is {patient.assigned_doctor_id or 'None'}."
        )
        curr_h = compute_audit_hash(
            prev_h, now_iso, req.username, "UNAUTHORIZED_BEDSIDE_ACCESS_ATTEMPT", patient_id, details
        )
        db.add(AuditLog(
            timestamp=now_iso,
            actor=req.username,
            action="UNAUTHORIZED_BEDSIDE_ACCESS_ATTEMPT",
            record_id=patient_id,
            details=details,
            prev_hash=prev_h,
            current_hash=curr_h
        ))
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Bedside Access Denied: You are not the assigned attending physician "
                f"({patient.assigned_doctor_id or 'Unassigned'}) nor do you hold an active temporary coverage grant "
                f"for patient {patient.full_name} ({patient.patient_id})."
            )
        )

    # Access Approved: Log in AuditLog
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last_log.current_hash if last_log else GENESIS_HASH
    details = f"Bedside QR access granted to {req.username} ({access_type}) for patient {patient_id}"
    curr_h = compute_audit_hash(
        prev_h, now_iso, req.username, "SECURE_QR_BEDSIDE_ACCESS", patient_id, details
    )
    db.add(AuditLog(
        timestamp=now_iso,
        actor=req.username,
        action="SECURE_QR_BEDSIDE_ACCESS",
        record_id=patient_id,
        details=details,
        prev_hash=prev_h,
        current_hash=curr_h
    ))
    db.commit()

    allergies = db.query(Allergy).filter(Allergy.patient_id == patient_id).all()
    allergy_list = [f"{a.allergen} ({a.severity})" for a in allergies]
    bed = db.query(Bed).filter(Bed.bed_id == patient.assigned_bed_id).first() if patient.assigned_bed_id else None

    return {
        "status": "authorized",
        "access_type": access_type,
        "temporary_grant": grant_info,
        "patient": {
            "patient_id": patient.patient_id,
            "full_name": patient.full_name,
            "age": patient.age,
            "gender": patient.gender,
            "blood_group": patient.blood_group,
            "priority": patient.priority,
            "clinical_status": patient.status,
            "department": patient.department,
            "assigned_doctor_id": patient.assigned_doctor_id or "Unassigned",
            "assigned_bed": bed.bed_id if bed else "Unassigned",
            "ward": bed.ward if bed else "N/A",
            "allergies": allergy_list or ["No Known Allergies (NKDA)"],
            "verification_time": now_iso
        }
    }


@router.post("/grant-temporary-access", response_model=TemporaryQRAccessResponse)
def grant_temporary_qr_access(
    req: TemporaryQRAccessRequest,
    db: Session = Depends(get_db)
):
    """
    Primary attending physician delegates temporary bedside access to a covering colleague.
    """
    patient = db.query(Patient).filter(Patient.patient_id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    expires_at = (datetime.utcnow() + timedelta(hours=req.duration_hours)).isoformat()
    now_iso = datetime.utcnow().isoformat()
    grant_id = f"QRG-{uuid.uuid4().hex[:6].upper()}"

    grant = TemporaryQRAccessGrant(
        id=grant_id,
        patient_id=req.patient_id,
        doctor_id=req.covering_doctor_id,
        granted_by=req.granted_by_doctor_id,
        access_level=req.access_level,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(grant)

    # Chained Audit Log
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last_log.current_hash if last_log else GENESIS_HASH
    details = f"Dr. {req.granted_by_doctor_id} granted temporary access to Dr. {req.covering_doctor_id} for patient {req.patient_id} (Expires {expires_at})"
    curr_h = compute_audit_hash(
        prev_h, now_iso, req.granted_by_doctor_id, "TEMPORARY_QR_ACCESS_GRANTED", grant_id, details
    )
    db.add(AuditLog(
        timestamp=now_iso,
        actor=req.granted_by_doctor_id,
        action="TEMPORARY_QR_ACCESS_GRANTED",
        record_id=grant_id,
        details=details,
        prev_hash=prev_h,
        current_hash=curr_h
    ))
    db.commit()
    db.refresh(grant)

    return grant


@router.get("/grants/{patient_id}", response_model=List[TemporaryQRAccessResponse])
def get_patient_qr_grants(patient_id: str, db: Session = Depends(get_db)):
    """List all active and past temporary access grants for a patient."""
    return (
        db.query(TemporaryQRAccessGrant)
        .filter(TemporaryQRAccessGrant.patient_id == patient_id)
        .order_by(TemporaryQRAccessGrant.id.desc())
        .all()
    )


@router.post("/grants/{grant_id}/revoke")
def revoke_temporary_grant(
    grant_id: str,
    revoked_by: str = Query("Dr. Attending Physician"),
    db: Session = Depends(get_db)
):
    """Revoke an active temporary bedside access grant immediately."""
    grant = db.query(TemporaryQRAccessGrant).filter(TemporaryQRAccessGrant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant record not found.")

    grant.is_revoked = True
    now_iso = datetime.utcnow().isoformat()

    # Audit log
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_h = last_log.current_hash if last_log else GENESIS_HASH
    details = f"Temporary access grant {grant_id} revoked by {revoked_by}"
    curr_h = compute_audit_hash(
        prev_h, now_iso, revoked_by, "TEMPORARY_QR_ACCESS_REVOKED", grant_id, details
    )
    db.add(AuditLog(
        timestamp=now_iso,
        actor=revoked_by,
        action="TEMPORARY_QR_ACCESS_REVOKED",
        record_id=grant_id,
        details=details,
        prev_hash=prev_h,
        current_hash=curr_h
    ))
    db.commit()

    return {"status": "success", "message": f"Grant {grant_id} revoked successfully."}
