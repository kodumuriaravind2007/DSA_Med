from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(String, primary_key=True, index=True)  # e.g., "PT-101"
    full_name = Column(String, nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    phone = Column(String, index=True)
    email = Column(String, index=True)
    govt_id = Column(String, index=True)  # National ID / Aadhaar
    address = Column(String)
    blood_group = Column(String)
    priority = Column(Integer, default=3, index=True)  # 1: Critical, 2: Urgent, 3: Normal
    status = Column(String, default="Waiting", index=True)  # Waiting, In Treatment, Lab Requested, Observation, Completed, Referred
    department = Column(String, default="Emergency", index=True)
    reported_concern = Column(String, default="")
    assigned_doctor_id = Column(String, ForeignKey("doctors.doctor_id"), nullable=True)
    assigned_bed_id = Column(String, ForeignKey("beds.bed_id"), nullable=True)
    arrival_time = Column(Float, default=lambda: datetime.utcnow().timestamp(), index=True)
    registration_date = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    is_duplicate_flag = Column(Boolean, default=False)
    triage_notes = Column(Text, default="")

    # Relationships
    vitals = relationship("VitalSign", back_populates="patient", cascade="all, delete-orphan")
    allergies = relationship("Allergy", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    lab_orders = relationship("LabOrder", back_populates="patient", cascade="all, delete-orphan")
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    mar_tasks = relationship("MARTask", back_populates="patient", cascade="all, delete-orphan")
    post_op_plans = relationship("PostOpCarePlan", back_populates="patient", cascade="all, delete-orphan")
    diet_orders = relationship("DietOrder", back_populates="patient", cascade="all, delete-orphan")
    critical_followups = relationship("CriticalResultFollowUp", back_populates="patient", cascade="all, delete-orphan")
    history_change_alerts = relationship("PatientHistoryChangeAlert", back_populates="patient", cascade="all, delete-orphan")
    clinical_handovers = relationship("ClinicalHandover", back_populates="patient", cascade="all, delete-orphan")
    medical_corrections = relationship("MedicalCorrectionRecord", back_populates="patient", cascade="all, delete-orphan")
    temporary_qr_grants = relationship("TemporaryQRAccessGrant", back_populates="patient", cascade="all, delete-orphan")
    assigned_doctor = relationship("Doctor", back_populates="assigned_patients")
    assigned_bed = relationship("Bed", back_populates="current_patient")


class VitalSign(Base):
    __tablename__ = "vitals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    blood_pressure_systolic = Column(Integer)
    blood_pressure_diastolic = Column(Integer)
    heart_rate = Column(Integer)
    temperature_f = Column(Float)
    respiratory_rate = Column(Integer)
    oxygen_saturation_spo2 = Column(Integer)
    pain_score = Column(Integer, default=0)  # 0 to 10 visual analog scale
    recorded_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    patient = relationship("Patient", back_populates="vitals")


class Allergy(Base):
    __tablename__ = "allergies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    allergen = Column(String, nullable=False)
    severity = Column(String, default="Moderate")  # Mild, Moderate, Severe
    reaction = Column(String, default="")

    patient = relationship("Patient", back_populates="allergies")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    frequency = Column(String, default="Once daily")
    status = Column(String, default="Active")  # Active, Discontinued
    prescribed_by = Column(String, default="")
    prescribed_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    patient = relationship("Patient", back_populates="medications")


class LabOrder(Base):
    __tablename__ = "lab_orders"

    id = Column(String, primary_key=True)  # e.g., "LAB-701"
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    test_name = Column(String, nullable=False)
    order_date = Column(String, default=lambda: datetime.utcnow().isoformat())
    status = Column(String, default="Pending")  # Requested, Sample Collected, Processing, Result Ready, Clinician Review Pending, Clinician Reviewed, Cancelled
    ordering_doctor = Column(String, default="")
    is_released_to_patient = Column(Boolean, default=False)

    patient = relationship("Patient", back_populates="lab_orders")
    results = relationship("LabResult", back_populates="order", cascade="all, delete-orphan")


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lab_order_id = Column(String, ForeignKey("lab_orders.id"), nullable=False, index=True)
    patient_id = Column(String, nullable=False, index=True)
    test_name = Column(String, nullable=False)
    parameter_name = Column(String, nullable=False)
    result_value = Column(String, nullable=False)
    unit = Column(String, default="")
    reference_range = Column(String, default="")
    flag = Column(String, default="Normal")  # Normal, High, Low, Critical
    verified_by = Column(String, default="")
    verified_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    order = relationship("LabOrder", back_populates="results")


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    visit_date = Column(String, default=lambda: datetime.utcnow().isoformat())
    department = Column(String, nullable=False)
    doctor_id = Column(String, default="")
    doctor_name = Column(String, default="")
    diagnosis = Column(String, default="")
    notes = Column(Text, default="")
    outcome = Column(String, default="Treated")

    patient = relationship("Patient", back_populates="visits")


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat(), index=True)
    event_type = Column(String, nullable=False)  # Registration, Triage, Doctor Assigned, Vitals, Lab, Status Change, Bed
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    actor = Column(String, default="System")

    patient = relationship("Patient", back_populates="timeline_events")


class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id = Column(String, primary_key=True)  # e.g., "DOC-101"
    name = Column(String, nullable=False)
    specialty = Column(String, nullable=False)
    department = Column(String, nullable=False, index=True)
    duty_status = Column(String, default="On Duty", index=True)  # On Duty, Off Duty, On Call, In Consultation
    is_available = Column(Boolean, default=True)
    max_active_patients = Column(Integer, default=5)
    phone = Column(String, default="")
    email = Column(String, default="")

    assigned_patients = relationship("Patient", back_populates="assigned_doctor")


class Bed(Base):
    __tablename__ = "beds"

    bed_id = Column(String, primary_key=True)  # e.g., "BED-ICU-01"
    ward = Column(String, nullable=False, index=True)  # ICU, Emergency, Surgery, General Male, General Female, Pediatrics
    department = Column(String, nullable=False, index=True)
    status = Column(String, default="Available", index=True)  # Available, Occupied, Cleaning, Reserved
    current_patient_id = Column(String, nullable=True)
    last_cleaned_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    current_patient = relationship("Patient", back_populates="assigned_bed", uselist=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat(), index=True)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False, index=True)
    record_id = Column(String, nullable=False, index=True)
    details = Column(Text, default="")
    prev_hash = Column(String, nullable=False)
    current_hash = Column(String, nullable=False, index=True)


class CDSRecord(Base):
    __tablename__ = "cds_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, nullable=False, index=True)
    symptoms = Column(String, nullable=False)
    suggested_priority = Column(Integer, nullable=False)
    suggested_department = Column(String, nullable=False)
    triggered_rules = Column(Text, default="")
    missing_information = Column(Text, default="")
    clinician_decision = Column(String, default="Pending")  # Accepted, Overridden, Pending
    clinician_notes = Column(Text, default="")
    reviewed_by = Column(String, default="")
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, index=True)  # patient, doctor, receptionist, nurse, admin
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=True, index=True)
    doctor_id = Column(String, ForeignKey("doctors.doctor_id"), nullable=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, default="")
    phone = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True)  # e.g., "APT-501"
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id = Column(String, ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    department = Column(String, nullable=False)
    scheduled_time = Column(String, nullable=False)
    reason = Column(String, default="")
    status = Column(String, default="Scheduled", index=True)  # Scheduled, Checked In, In Progress, Completed, Cancelled
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor")


class MARTask(Base):
    __tablename__ = "mar_tasks"

    id = Column(String, primary_key=True)  # e.g., "MAR-801"
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    medication_name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    route = Column(String, default="Oral")  # Oral, IV, IM, SC, Topical, Inhalation
    scheduled_time = Column(String, nullable=False, index=True)
    administered_time = Column(String, nullable=True)
    status = Column(String, default="Due", index=True)  # Due, Due Soon, Administered, Delayed, Held, Omitted, Requires Review
    administered_by = Column(String, default="")
    hold_reason = Column(String, default="")
    notes = Column(Text, default="")
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    patient = relationship("Patient", back_populates="mar_tasks")


class PostOpCarePlan(Base):
    __tablename__ = "post_op_care_plans"

    id = Column(String, primary_key=True)  # e.g., "POP-601"
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id = Column(String, nullable=False)
    procedure_name = Column(String, nullable=False)
    surgery_date = Column(String, nullable=False)
    target_discharge_date = Column(String, nullable=True)
    status = Column(String, default="Active", index=True)  # Active, Discharged, Complication Observed
    wound_care_instructions = Column(Text, default="")
    mobility_goal = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    patient = relationship("Patient", back_populates="post_op_plans")
    tasks = relationship("PostOpTask", back_populates="plan", cascade="all, delete-orphan")


class PostOpTask(Base):
    __tablename__ = "post_op_tasks"

    id = Column(String, primary_key=True)  # e.g., "PTK-901"
    plan_id = Column(String, ForeignKey("post_op_care_plans.id"), nullable=False, index=True)
    patient_id = Column(String, nullable=False, index=True)
    task_type = Column(String, nullable=False)  # Observation, Wound Care, Drain Check, Mobility Assessment, Pain Review
    title = Column(String, nullable=False)
    due_time = Column(String, nullable=False, index=True)
    completed_time = Column(String, nullable=True)
    status = Column(String, default="Pending", index=True)  # Pending, Completed, Delayed
    notes = Column(Text, default="")
    nurse_name = Column(String, default="")

    plan = relationship("PostOpCarePlan", back_populates="tasks")


class DietOrder(Base):
    __tablename__ = "diet_orders"

    id = Column(String, primary_key=True)  # e.g., "DIET-401"
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    diet_type = Column(String, nullable=False)  # Regular, Diabetic, Renal, Cardiac, Soft, Clear Liquid, NPO
    allergens_restricted = Column(String, default="")  # comma-separated list
    texture = Column(String, default="Standard")  # Standard, Pureed, Minced & Moist, Liquid
    is_npo = Column(Boolean, default=False)
    status = Column(String, default="Active", index=True)  # Active, Suspended
    ordering_clinician = Column(String, default="")
    notes = Column(Text, default="")
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    patient = relationship("Patient", back_populates="diet_orders")
    deliveries = relationship("MealDelivery", back_populates="diet_order", cascade="all, delete-orphan")


class MealDelivery(Base):
    __tablename__ = "meal_deliveries"

    id = Column(String, primary_key=True)  # e.g., "MEAL-301"
    diet_order_id = Column(String, ForeignKey("diet_orders.id"), nullable=False, index=True)
    patient_id = Column(String, nullable=False, index=True)
    meal_period = Column(String, nullable=False)  # Breakfast, Lunch, Dinner, Snack
    scheduled_date = Column(String, nullable=False)
    scheduled_time = Column(String, nullable=False)
    delivery_status = Column(String, default="Scheduled", index=True)  # Scheduled, Prepared, Verified, Delivered, Refused, Conflict Blocked
    allergy_check_passed = Column(Boolean, default=True)
    conflict_details = Column(String, default="")
    delivered_by = Column(String, default="")
    delivered_at = Column(String, nullable=True)

    diet_order = relationship("DietOrder", back_populates="deliveries")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(String, primary_key=True)  # e.g., "INV-101"
    item_code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)  # Medication, IV Fluids, Surgical Supplies, PPE, Diagnostic Reagents
    unit = Column(String, default="Units")
    quantity_on_hand = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)
    reorder_threshold = Column(Integer, default=20)
    batch_number = Column(String, default="")
    expiry_date = Column(String, default="")
    location = Column(String, default="Central Pharmacy")  # Central Pharmacy, ICU Pyxis, ER Supply Room, Surgical Suite

    transactions = relationship("StockTransaction", back_populates="item", cascade="all, delete-orphan")


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(String, ForeignKey("inventory_items.id"), nullable=False, index=True)
    transaction_type = Column(String, nullable=False)  # Receipt, Issue, Adjustment, Reserved
    quantity = Column(Integer, nullable=False)
    reference_id = Column(String, default="")  # e.g., PT-101 or PO-400
    actor = Column(String, default="System")
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat())
    notes = Column(Text, default="")

    item = relationship("InventoryItem", back_populates="transactions")


# =====================================================================
# INTELLIGENT CLINICAL FEATURES: MODELS
# =====================================================================

class CriticalResultFollowUp(Base):
    """
    Feature A: Critical Diagnostic Result Follow-Up System.
    Persistent tracking of critical / panic laboratory and diagnostic flags.
    """
    __tablename__ = "critical_result_followups"

    id = Column(String, primary_key=True)  # e.g., "CRF-101"
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    lab_order_id = Column(String, ForeignKey("lab_orders.id"), nullable=False, index=True)
    lab_result_id = Column(Integer, nullable=True)
    test_name = Column(String, nullable=False)
    parameter_name = Column(String, nullable=False)
    result_value = Column(String, nullable=False)
    unit = Column(String, default="")
    reference_range = Column(String, default="")
    critical_rationale = Column(Text, default="")
    status = Column(String, default="Awaiting Acknowledgement", index=True)
    # Statuses: Awaiting Acknowledgement, Acknowledged, Follow-up in Progress, Resolved, Escalated
    deadline = Column(String, default="")
    acknowledged_by = Column(String, default="")
    acknowledged_at = Column(String, nullable=True)
    assigned_doctor_id = Column(String, nullable=True)
    action_taken = Column(Text, default="")
    resolution_details = Column(Text, default="")
    resolved_by = Column(String, default="")
    resolved_at = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat(), index=True)

    patient = relationship("Patient", back_populates="critical_followups")


class PatientHistoryChangeAlert(Base):
    """
    Feature B: Patient History & Clinical Change Alert.
    Tracks clinically relevant modifications made since clinician review.
    """
    __tablename__ = "patient_history_change_alerts"

    id = Column(String, primary_key=True)  # e.g., "PCA-201"
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    record_type = Column(String, nullable=False, index=True)  # Allergy, VitalSign, LabResult, Medication, Diagnosis, Correction, Status
    record_id = Column(String, default="")
    field_name = Column(String, nullable=False)
    old_value = Column(Text, default="")
    new_value = Column(Text, default="")
    author_name = Column(String, default="System")
    author_role = Column(String, default="doctor")
    reason = Column(Text, default="")
    is_reviewed = Column(Boolean, default=False, index=True)
    reviewed_by = Column(String, default="")
    reviewed_at = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat(), index=True)

    patient = relationship("Patient", back_populates="history_change_alerts")


class ClinicalHandover(Base):
    """
    Feature C: Intelligent Doctor-Nurse Handover.
    Structured clinical handoff capturing care context, vital trends, pending tasks, and contingencies.
    """
    __tablename__ = "clinical_handovers"

    id = Column(String, primary_key=True)  # e.g., "HND-301"
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    ward = Column(String, default="General Ward", index=True)
    outgoing_staff_id = Column(String, default="")
    outgoing_staff_name = Column(String, nullable=False)
    outgoing_role = Column(String, nullable=False)  # doctor, nurse
    incoming_staff_name = Column(String, default="")
    incoming_role = Column(String, default="nurse")  # doctor, nurse
    status = Column(String, default="Submitted", index=True)  # Draft, Submitted, Acknowledged
    clinical_summary = Column(Text, default="")
    pending_tasks = Column(Text, default="[]")  # JSON encoded list of tasks
    critical_concerns = Column(Text, default="")
    contingency_plans = Column(Text, default="")
    version = Column(Integer, default=1)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat(), index=True)
    acknowledged_at = Column(String, nullable=True)
    acknowledged_by = Column(String, default="")
    notes = Column(Text, default="")

    patient = relationship("Patient", back_populates="clinical_handovers")


class DuplicateReviewRecord(Base):
    """
    Feature D: Duplicate Patient Review Record.
    Persistent audit of records officer / clinician review decisions on duplicate candidate pairs.
    """
    __tablename__ = "duplicate_review_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id_1 = Column(String, nullable=False, index=True)
    patient_id_2 = Column(String, nullable=False, index=True)
    decision = Column(String, nullable=False, index=True)  # Confirmed Duplicate, Not a Duplicate, Requires Further Review
    similarity_percentage = Column(Float, default=0.0)
    matched_fields = Column(String, default="")
    reviewed_by = Column(String, nullable=False)
    reviewed_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    notes = Column(Text, default="")


class MedicalCorrectionRecord(Base):
    """
    Feature E: Medical Record Correction History & Immutable Audit Trail.
    Maintains full field-level lineage of clinical corrections with mandatory reason & doctor approval.
    """
    __tablename__ = "medical_correction_records"

    id = Column(String, primary_key=True)  # e.g., "CORR-501"
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    record_type = Column(String, nullable=False, index=True)  # Diagnosis, Prescription, VitalSign, Allergy, Demographics
    record_id = Column(String, nullable=False, index=True)
    field_name = Column(String, nullable=False)
    previous_value = Column(Text, default="")
    new_value = Column(Text, nullable=False)
    user_id = Column(String, default="")
    author_name = Column(String, nullable=False)
    author_role = Column(String, nullable=False)  # doctor, nurse, receptionist, admin
    reason = Column(Text, nullable=False)
    approval_status = Column(String, default="Approved", index=True)  # Approved, Pending Approval, Rejected
    approver_id = Column(String, default="")
    approver_name = Column(String, default="")
    approved_at = Column(String, nullable=True)
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat(), index=True)
    audit_hash = Column(String, default="")

    patient = relationship("Patient", back_populates="medical_corrections")


class TemporaryQRAccessGrant(Base):
    """
    Phase 4: Doctor-Specific Temporary QR Bedside Access Grant.
    Permits assigned physician to delegate temporary emergency or covering clinical privileges.
    """
    __tablename__ = "temporary_qr_access_grants"

    id = Column(String, primary_key=True)  # e.g., "QRG-701"
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id = Column(String, nullable=False, index=True)  # Covering doctor ID
    granted_by = Column(String, nullable=False)  # Primary attending physician ID
    access_level = Column(String, default="Clinical Read/Write")  # Clinical Read/Write, Emergency Care, Observation Only
    expires_at = Column(String, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

    patient = relationship("Patient", back_populates="temporary_qr_grants")
