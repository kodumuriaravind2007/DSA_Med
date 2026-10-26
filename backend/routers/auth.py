"""
Authentication & User Identity Router for MedTree X.
Provides:
- Patient and Staff Login (JWT tokens with RBAC claims)
- Patient Self-Registration (linking account to new Patient ID)
- User Profile and Demographic Updates
- Pre-configured Demo Credential Directory
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List, Dict, Any

from ..database import get_db
from ..models import User, Patient, TimelineEvent
from ..schemas import (
    UserLoginRequest, PatientRegisterRequest, AuthTokenResponse,
    UserProfileResponse, PatientProfileUpdateRequest
)
from ..auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, verify_patient_access
)
from ..dsa.duplicate_detector import DuplicateDetector
from .patients import generate_next_patient_id, log_audit_event
from .websocket import manager

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=AuthTokenResponse)
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticates username/password and issues an RFC 7519 HMAC-SHA256 access token."""
    user = db.query(User).filter(User.username == req.username.strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    token_data = {
        "sub": user.username,
        "role": user.role,
        "user_id": user.id,
        "patient_id": user.patient_id,
        "doctor_id": user.doctor_id,
        "full_name": user.full_name,
    }
    access_token = create_access_token(token_data)

    log_audit_event(
        db,
        actor=user.username,
        action="USER_LOGIN",
        record_id=str(user.id),
        details={"role": user.role, "timestamp": datetime.now().isoformat()}
    )
    db.commit()

    return AuthTokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        role=user.role,
        patient_id=user.patient_id,
        doctor_id=user.doctor_id,
        full_name=user.full_name
    )


@router.post("/patient/register", response_model=AuthTokenResponse)
def register_patient_portal(req: PatientRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new patient from the Patient Portal and creates an authenticated user account."""
    # Check if username exists
    existing_user = db.query(User).filter(User.username == req.username.strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{req.username}' is already in use. Please select a different username."
        )

    patient_id = generate_next_patient_id(db)

    # DSA Duplicate candidate pre-check
    existing_patients = db.query(Patient).all()
    detector = DuplicateDetector()
    existing_dicts = [
        {
            "patient_id": p.patient_id,
            "full_name": p.full_name,
            "phone": p.phone,
            "email": p.email,
            "date_of_birth": "",
            "gender": p.gender,
        }
        for p in existing_patients
    ]
    candidate_dict = {
        "patient_id": patient_id,
        "full_name": req.full_name,
        "phone": req.phone or "",
        "email": req.email or "",
        "date_of_birth": "",
        "gender": req.gender,
    }
    matches = detector.find_potential_duplicates(candidate_dict, existing_dicts, threshold=0.65)
    is_dup_flag = len(matches) > 0

    now_ts = datetime.now().timestamp()
    iso_now = datetime.now().isoformat()

    new_patient = Patient(
        patient_id=patient_id,
        full_name=req.full_name,
        age=req.age,
        gender=req.gender,
        phone=req.phone or "",
        email=req.email or "",
        govt_id=req.govt_id or "",
        address=req.address or "",
        blood_group=req.blood_group or "Unknown",
        priority=3,  # Default Normal priority
        status="Waiting",
        department=req.department or "General Medicine",
        reported_concern=req.reported_concern or "Self-registered via Patient Portal",
        arrival_time=now_ts,
        registration_date=iso_now,
        updated_at=iso_now,
        is_duplicate_flag=is_dup_flag,
        triage_notes=f"Self-registration via patient portal. Duplicate candidates detected: {len(matches)}."
    )
    db.add(new_patient)

    # Create User account
    pwd_hash = hash_password(req.password)
    new_user = User(
        username=req.username.strip(),
        password_hash=pwd_hash,
        role="patient",
        patient_id=patient_id,
        full_name=req.full_name,
        email=req.email or "",
        phone=req.phone or "",
        created_at=iso_now
    )
    db.add(new_user)

    # Initial timeline event
    timeline_event = TimelineEvent(
        patient_id=patient_id,
        timestamp=iso_now,
        event_type="Registration",
        title="Portal Self-Registration Completed",
        description=f"Patient registered via Patient Portal with assigned ID {patient_id}. Priority 3 (Normal) assigned.",
        actor="Patient Self-Service"
    )
    db.add(timeline_event)

    # Audit log
    log_audit_event(
        db,
        actor=req.username,
        action="PATIENT_PORTAL_REGISTER",
        record_id=patient_id,
        details={
            "full_name": req.full_name,
            "department": req.department,
            "duplicate_candidates_count": len(matches)
        }
    )
    db.commit()
    db.refresh(new_user)

    # Emit real-time WebSocket event to all receptionists & staff
    manager.broadcast_sync("NEW_PATIENT_REGISTRATION", {
        "patient_id": patient_id,
        "full_name": req.full_name,
        "department": req.department,
        "is_duplicate_flag": is_dup_flag,
        "timestamp": iso_now
    })
    manager.broadcast_sync("QUEUE_UPDATED", {"patient_id": patient_id, "action": "ENQUEUE"})

    # Issue access token
    token_data = {
        "sub": new_user.username,
        "role": new_user.role,
        "user_id": new_user.id,
        "patient_id": new_user.patient_id,
        "doctor_id": None,
        "full_name": new_user.full_name,
    }
    access_token = create_access_token(token_data)

    return AuthTokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=new_user.id,
        username=new_user.username,
        role=new_user.role,
        patient_id=new_user.patient_id,
        doctor_id=None,
        full_name=new_user.full_name
    )


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns profile information for the authenticated user."""
    return current_user


@router.put("/patient/profile")
def update_patient_profile(
    req: PatientProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows patient to update permitted demographic attributes."""
    if not current_user.patient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not linked to a patient profile."
        )

    patient = db.query(Patient).filter(Patient.patient_id == current_user.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient record not found.")

    updated_fields = []
    if req.phone is not None:
        patient.phone = req.phone
        current_user.phone = req.phone
        updated_fields.append("phone")
    if req.email is not None:
        patient.email = req.email
        current_user.email = req.email
        updated_fields.append("email")
    if req.address is not None:
        patient.address = req.address
        updated_fields.append("address")
    if req.reported_concern is not None:
        patient.reported_concern = req.reported_concern
        updated_fields.append("reported_concern")

    iso_now = datetime.now().isoformat()
    patient.updated_at = iso_now

    log_audit_event(
        db,
        actor=current_user.username,
        action="UPDATE_PATIENT_DEMOGRAPHICS",
        record_id=patient.patient_id,
        details={"updated_fields": updated_fields}
    )
    db.commit()

    return {
        "status": "success",
        "message": "Demographic profile successfully updated.",
        "updated_fields": updated_fields
    }


@router.get("/demo-users")
def get_demo_users():
    """Lists pre-configured demo user accounts for easy prototype evaluation."""
    return [
        {
            "role": "patient",
            "name": "Sara Khan",
            "username": "patient101",
            "password": "password123",
            "patient_id": "PT-101",
            "badge": "Patient Portal",
            "description": "Admitted Cardiac Patient (Bed BED-ICU-01, MAR active)"
        },
        {
            "role": "patient",
            "name": "David Miller",
            "username": "patient102",
            "password": "password123",
            "patient_id": "PT-102",
            "badge": "Patient Portal",
            "description": "Waiting Queue Patient (Priority 2 - Urgent)"
        },
        {
            "role": "receptionist",
            "name": "Elena Rostova",
            "username": "receptionist",
            "password": "reception123",
            "badge": "Staff Portal",
            "description": "Reception, Intake, Triage Verification, & Bed Dispatch"
        },
        {
            "role": "doctor",
            "name": "Dr. Sarah Mitchell, MD",
            "username": "dr_smith",
            "password": "doctor123",
            "doctor_id": "DOC-101",
            "badge": "Staff Portal",
            "description": "Senior Cardiologist & Emergency Physician"
        },
        {
            "role": "nurse",
            "name": "Nurse Sarah Jenkins, RN",
            "username": "nurse_sarah",
            "password": "nurse123",
            "badge": "Staff Portal",
            "description": "Inpatient Ward & MAR Medication Administration Specialist"
        },
        {
            "role": "admin",
            "name": "Chief Operations Officer",
            "username": "admin",
            "password": "admin123",
            "badge": "Staff Portal",
            "description": "Command Center, Surge Simulation, & Cryptographic Audit Integrity"
        }
    ]
