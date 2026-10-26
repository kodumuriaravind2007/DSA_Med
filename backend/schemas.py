from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any


class VitalSignBase(BaseModel):
    blood_pressure_systolic: Optional[int] = Field(None, ge=50, le=260)
    blood_pressure_diastolic: Optional[int] = Field(None, ge=30, le=160)
    heart_rate: Optional[int] = Field(None, ge=30, le=250)
    temperature_f: Optional[float] = Field(None, ge=90.0, le=110.0)
    respiratory_rate: Optional[int] = Field(None, ge=8, le=60)
    oxygen_saturation_spo2: Optional[int] = Field(None, ge=50, le=100)
    pain_score: Optional[int] = Field(0, ge=0, le=10)


class VitalSignCreate(VitalSignBase):
    pass


class VitalSignResponse(VitalSignBase):
    id: int
    patient_id: str
    recorded_at: str
    model_config = ConfigDict(from_attributes=True)


class AllergyBase(BaseModel):
    allergen: str
    severity: str = "Moderate"
    reaction: Optional[str] = ""


class AllergyCreate(AllergyBase):
    pass


class AllergyResponse(AllergyBase):
    id: int
    patient_id: str
    model_config = ConfigDict(from_attributes=True)


class MedicationBase(BaseModel):
    name: str
    dosage: str
    frequency: str = "Once daily"
    status: str = "Active"
    prescribed_by: Optional[str] = ""


class MedicationCreate(MedicationBase):
    pass


class MedicationResponse(MedicationBase):
    id: int
    patient_id: str
    prescribed_at: str
    model_config = ConfigDict(from_attributes=True)


class LabResultCreate(BaseModel):
    parameter_name: str
    result_value: str
    unit: Optional[str] = ""
    reference_range: Optional[str] = ""
    flag: Optional[str] = "Normal"
    verified_by: Optional[str] = "Staff Pathologist"


class LabResultResponse(LabResultCreate):
    id: int
    lab_order_id: str
    patient_id: str
    test_name: str
    verified_at: str
    model_config = ConfigDict(from_attributes=True)


class LabOrderCreate(BaseModel):
    test_name: str
    ordering_doctor: Optional[str] = "Attending Physician"
    initial_results: Optional[List[LabResultCreate]] = None


class LabOrderResponse(BaseModel):
    id: str
    patient_id: str
    test_name: str
    order_date: str
    status: str
    ordering_doctor: str
    is_released_to_patient: bool = False
    results: List[LabResultResponse] = []
    model_config = ConfigDict(from_attributes=True)


class VisitResponse(BaseModel):
    id: int
    patient_id: str
    visit_date: str
    department: str
    doctor_name: str
    diagnosis: str
    notes: str
    outcome: str
    model_config = ConfigDict(from_attributes=True)


class TimelineEventResponse(BaseModel):
    id: int
    patient_id: str
    timestamp: str
    event_type: str
    title: str
    description: str
    actor: str
    model_config = ConfigDict(from_attributes=True)


class PatientCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=0, le=125)
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    phone: Optional[str] = ""
    email: Optional[str] = ""
    govt_id: Optional[str] = ""
    address: Optional[str] = ""
    blood_group: Optional[str] = ""
    priority: int = Field(default=3, ge=1, le=3)
    department: str = "Emergency"
    reported_concern: str = ""
    triage_notes: Optional[str] = ""
    initial_vitals: Optional[VitalSignCreate] = None
    initial_allergies: Optional[List[AllergyCreate]] = None


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    blood_group: Optional[str] = None
    reported_concern: Optional[str] = None
    department: Optional[str] = None
    triage_notes: Optional[str] = None


class PatientResponse(BaseModel):
    patient_id: str
    full_name: str
    age: int
    gender: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    govt_id: Optional[str] = ""
    address: Optional[str] = ""
    blood_group: Optional[str] = ""
    priority: int
    status: str
    department: str
    reported_concern: str
    assigned_doctor_id: Optional[str] = None
    assigned_bed_id: Optional[str] = None
    arrival_time: float
    registration_date: str
    updated_at: str
    is_duplicate_flag: bool
    triage_notes: Optional[str] = ""

    model_config = ConfigDict(from_attributes=True)


class Patient360Response(BaseModel):
    patient: PatientResponse
    vitals: List[VitalSignResponse] = []
    allergies: List[AllergyResponse] = []
    medications: List[MedicationResponse] = []
    lab_orders: List[LabOrderResponse] = []
    visits: List[VisitResponse] = []
    timeline: List[TimelineEventResponse] = []
    estimated_wait_minutes: Optional[int] = None
    queue_position: Optional[int] = None
    critical_followups: Optional[List[Dict[str, Any]]] = []
    change_alerts: Optional[List[Dict[str, Any]]] = []
    handovers: Optional[List[Dict[str, Any]]] = []
    corrections: Optional[List[Dict[str, Any]]] = []


class StatusTransitionRequest(BaseModel):
    new_status: str = Field(..., pattern="^(Waiting|In Treatment|Lab Requested|Observation|Completed|Referred|Discharged)$")
    actor: str = "Attending Clinician"
    notes: Optional[str] = ""


class PriorityUpdateRequest(BaseModel):
    new_priority: int = Field(..., ge=1, le=3)
    actor: str = "Triage Officer"
    reason: str


class BedAllocateRequest(BaseModel):
    patient_id: str
    actor: str = "Ward Staff"


class BedStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(Available|Occupied|Cleaning|Reserved)$")
    actor: str = "Housekeeping Staff"


class DoctorAssignRequest(BaseModel):
    patient_id: str
    actor: str = "Triage Staff"


class DoctorDutyUpdateRequest(BaseModel):
    duty_status: str = Field(..., pattern="^(On Duty|Off Duty|On Call|In Consultation)$")
    is_available: bool = True
    actor: str = "Department Administrator"


class CDSCheckRequest(BaseModel):
    reported_concern: str
    age: Optional[int] = None
    vitals: Optional[VitalSignCreate] = None
    known_conditions: Optional[List[str]] = None


class CDSReviewRequest(BaseModel):
    record_id: int
    decision: str = Field(..., pattern="^(Accepted|Overridden)$")
    clinician_notes: str
    reviewed_by: str = "Dr. Clinician"
    final_priority: int = Field(..., ge=1, le=3)


# --- Authentication & User Schemas ---
class UserLoginRequest(BaseModel):
    username: str
    password: str


class PatientRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)
    age: int = Field(..., ge=0, le=125)
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    phone: Optional[str] = ""
    email: Optional[str] = ""
    govt_id: Optional[str] = ""
    address: Optional[str] = ""
    blood_group: Optional[str] = ""
    department: Optional[str] = "Emergency"
    reported_concern: Optional[str] = ""


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    role: str
    patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
    full_name: str


class UserProfileResponse(BaseModel):
    id: int
    username: str
    role: str
    patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
    full_name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    created_at: str
    model_config = ConfigDict(from_attributes=True)


class PatientProfileUpdateRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    reported_concern: Optional[str] = None


# --- Appointment Schemas ---
class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    department: str
    scheduled_time: str
    reason: Optional[str] = ""


class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    department: str
    scheduled_time: str
    reason: str
    status: str
    created_at: str
    model_config = ConfigDict(from_attributes=True)


# --- MAR (Medication Administration Record) Schemas ---
class MARTaskResponse(BaseModel):
    id: str
    medication_id: Optional[int] = None
    patient_id: str
    medication_name: str
    dosage: str
    route: str
    scheduled_time: str
    administered_time: Optional[str] = None
    status: str  # Due, Due Soon, Administered, Delayed, Held, Omitted, Requires Review
    administered_by: str
    hold_reason: str
    notes: str
    created_at: str
    model_config = ConfigDict(from_attributes=True)


class MARAdministerRequest(BaseModel):
    administered_by: str = "Nurse"
    notes: Optional[str] = ""


class MARHoldRequest(BaseModel):
    reason: str
    action: str = Field("Held", pattern="^(Held|Delayed|Omitted)$")
    nurse_name: str = "Nurse"


# --- Post-Op Care Schemas ---
class PostOpTaskResponse(BaseModel):
    id: str
    plan_id: str
    patient_id: str
    task_type: str
    title: str
    due_time: str
    completed_time: Optional[str] = None
    status: str
    notes: str
    nurse_name: str
    model_config = ConfigDict(from_attributes=True)


class PostOpCarePlanResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    procedure_name: str
    surgery_date: str
    target_discharge_date: Optional[str] = None
    status: str
    wound_care_instructions: str
    mobility_goal: str
    created_at: str
    tasks: List[PostOpTaskResponse] = []
    model_config = ConfigDict(from_attributes=True)


class PostOpCarePlanCreate(BaseModel):
    patient_id: str
    doctor_id: str
    procedure_name: str
    surgery_date: str
    target_discharge_date: Optional[str] = None
    wound_care_instructions: Optional[str] = ""
    mobility_goal: Optional[str] = ""


class PostOpTaskCompleteRequest(BaseModel):
    nurse_name: str = "Ward Nurse"
    notes: Optional[str] = ""


# --- Nutrition & Meal Delivery Schemas ---
class DietOrderCreate(BaseModel):
    patient_id: str
    diet_type: str = Field(..., pattern="^(Regular|Diabetic|Renal|Cardiac|Soft|Clear Liquid|NPO)$")
    allergens_restricted: Optional[str] = ""
    texture: Optional[str] = "Standard"
    is_npo: bool = False
    ordering_clinician: Optional[str] = "Attending Physician"
    notes: Optional[str] = ""


class DietOrderResponse(BaseModel):
    id: str
    patient_id: str
    diet_type: str
    allergens_restricted: str
    texture: str
    is_npo: bool
    status: str
    ordering_clinician: str
    notes: str
    created_at: str
    model_config = ConfigDict(from_attributes=True)


class MealDeliveryResponse(BaseModel):
    id: str
    diet_order_id: str
    patient_id: str
    meal_period: str
    scheduled_date: str
    scheduled_time: str
    delivery_status: str
    allergy_check_passed: bool
    conflict_details: str
    delivered_by: str
    delivered_at: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# --- Inventory & Supply Schemas ---
class InventoryItemResponse(BaseModel):
    id: str
    item_code: str
    name: str
    category: str
    unit: str
    quantity_on_hand: int
    reserved_quantity: int
    reorder_threshold: int
    batch_number: str
    expiry_date: str
    location: str
    model_config = ConfigDict(from_attributes=True)


class StockTransactionCreate(BaseModel):
    item_id: str
    transaction_type: str = Field(..., pattern="^(Receipt|Issue|Adjustment|Reserved)$")
    quantity: int
    reference_id: Optional[str] = ""
    actor: str = "Pharmacy Staff"
    notes: Optional[str] = ""


class StockTransactionResponse(BaseModel):
    id: int
    item_id: str
    transaction_type: str
    quantity: int
    reference_id: str
    actor: str
    timestamp: str
    notes: str
    model_config = ConfigDict(from_attributes=True)


# --- Hospital Surge Simulation Schemas ---
class SurgeSimulationRequest(BaseModel):
    arrival_surge_multiplier: float = Field(default=1.5, ge=0.5, le=5.0)
    doctor_shortage_pct: float = Field(default=20.0, ge=0.0, le=80.0)
    bed_capacity_reduction_pct: float = Field(default=15.0, ge=0.0, le=75.0)
    supply_strain_factor: float = Field(default=1.3, ge=1.0, le=4.0)


class SurgeSimulationResponse(BaseModel):
    scenario_params: Dict[str, Any]
    baseline_stats: Dict[str, Any]
    simulated_stats: Dict[str, Any]
    department_load: List[Dict[str, Any]]
    projected_queue: List[Dict[str, Any]]
    critical_bottleneck: str
    recommendations: List[str]


# --- QR Code Schemas ---
class QRTokenResponse(BaseModel):
    patient_id: str
    full_name: str
    qr_token: str
    issued_at: str
    verification_url: str


class QRVerifyRequest(BaseModel):
    qr_token: str


# =====================================================================
# INTELLIGENT CLINICAL FEATURES: PYDANTIC SCHEMAS
# =====================================================================

# --- Feature A: Critical Result Follow-Up Schemas ---
class CriticalFollowUpCreate(BaseModel):
    patient_id: str
    lab_order_id: str
    lab_result_id: Optional[int] = None
    test_name: str
    parameter_name: str
    result_value: str
    unit: Optional[str] = ""
    reference_range: Optional[str] = ""
    critical_rationale: str
    deadline: Optional[str] = ""
    assigned_doctor_id: Optional[str] = None


class CriticalFollowUpAcknowledge(BaseModel):
    acknowledged_by: str
    notes: Optional[str] = ""


class CriticalFollowUpAction(BaseModel):
    action_taken: str
    actor: str


class CriticalFollowUpResolve(BaseModel):
    resolution_details: str
    resolved_by: str


class CriticalFollowUpResponse(BaseModel):
    id: str
    patient_id: str
    lab_order_id: str
    lab_result_id: Optional[int] = None
    test_name: str
    parameter_name: str
    result_value: str
    unit: str
    reference_range: str
    critical_rationale: str
    status: str
    deadline: str
    acknowledged_by: str
    acknowledged_at: Optional[str] = None
    assigned_doctor_id: Optional[str] = None
    action_taken: str
    resolution_details: str
    resolved_by: str
    resolved_at: Optional[str] = None
    created_at: str
    model_config = ConfigDict(from_attributes=True)


# --- Feature B: Patient History Change Alert Schemas ---
class PatientHistoryChangeAlertCreate(BaseModel):
    patient_id: str
    record_type: str
    record_id: Optional[str] = ""
    field_name: str
    old_value: Optional[str] = ""
    new_value: str
    author_name: str = "System"
    author_role: str = "doctor"
    reason: Optional[str] = ""


class PatientHistoryChangeAlertResponse(BaseModel):
    id: str
    patient_id: str
    record_type: str
    record_id: str
    field_name: str
    old_value: str
    new_value: str
    author_name: str
    author_role: str
    reason: str
    is_reviewed: bool
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str
    model_config = ConfigDict(from_attributes=True)


# --- Feature C: Clinical Handover Schemas ---
class ClinicalHandoverCreate(BaseModel):
    patient_id: str
    ward: Optional[str] = "General Ward"
    outgoing_staff_id: Optional[str] = ""
    outgoing_staff_name: str
    outgoing_role: str = "doctor"  # doctor or nurse
    incoming_staff_name: Optional[str] = ""
    incoming_role: Optional[str] = "nurse"
    clinical_summary: str
    pending_tasks: Optional[str] = "[]"
    critical_concerns: Optional[str] = ""
    contingency_plans: Optional[str] = ""
    notes: Optional[str] = ""


class ClinicalHandoverAcknowledge(BaseModel):
    acknowledged_by: str
    notes: Optional[str] = ""


class ClinicalHandoverResponse(BaseModel):
    id: str
    patient_id: str
    ward: str
    outgoing_staff_id: str
    outgoing_staff_name: str
    outgoing_role: str
    incoming_staff_name: str
    incoming_role: str
    status: str
    clinical_summary: str
    pending_tasks: str
    critical_concerns: str
    contingency_plans: str
    version: int
    created_at: str
    acknowledged_at: Optional[str] = None
    acknowledged_by: str
    notes: str
    model_config = ConfigDict(from_attributes=True)


# --- Feature D: Duplicate Review & Data Quality Schemas ---
class DuplicateReviewCreate(BaseModel):
    patient_id_1: str
    patient_id_2: str
    decision: str  # "Confirmed Duplicate", "Not a Duplicate", "Requires Further Review"
    notes: Optional[str] = ""
    reviewed_by: str = "Records Officer"


class DataQualityIssue(BaseModel):
    patient_id: str
    patient_name: str
    issue_type: str  # Missing National ID, Unassigned Doctor, Missing Vitals, etc.
    severity: str    # High, Medium, Low
    description: str


class DataQualityReportResponse(BaseModel):
    total_records_analyzed: int
    data_quality_score: float
    issues_found: List[DataQualityIssue]
    duplicate_candidates_count: int
    timestamp: str


# --- Feature E: Medical Correction History Schemas ---
class MedicalCorrectionCreate(BaseModel):
    patient_id: str
    record_type: str  # Diagnosis, Prescription, VitalSign, Allergy, Demographics
    record_id: str
    field_name: str
    previous_value: Optional[str] = ""
    new_value: str
    reason: str
    author_name: str
    author_role: str


class MedicalCorrectionResponse(BaseModel):
    id: str
    patient_id: str
    record_type: str
    record_id: str
    field_name: str
    previous_value: str
    new_value: str
    user_id: str
    author_name: str
    author_role: str
    reason: str
    approval_status: str
    approver_id: str
    approver_name: str
    approved_at: Optional[str] = None
    timestamp: str
    audit_hash: str
    model_config = ConfigDict(from_attributes=True)


# --- Feature F (Phase 4): QR Doctor-Specific Access Schemas ---
class QRDoctorVerifyRequest(BaseModel):
    qr_token: str
    user_id: Optional[str] = None
    username: str
    role: str
    doctor_id: Optional[str] = None


class TemporaryQRAccessRequest(BaseModel):
    patient_id: str
    covering_doctor_id: str
    granted_by_doctor_id: str
    duration_hours: int = 12
    access_level: str = "Clinical Read/Write"


class TemporaryQRAccessResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    granted_by: str
    access_level: str
    expires_at: str
    is_revoked: bool
    created_at: str
    model_config = ConfigDict(from_attributes=True)
