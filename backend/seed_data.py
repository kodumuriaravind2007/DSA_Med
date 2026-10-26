"""
Synthetic Clinical Demo Dataset for MedTree X.

Provides:
- 12 clinically rich patient cases spanning Critical, Urgent, and Normal priorities
- 1 intentional duplicate suspect pair (demonstrates Feature 4)
- 6 doctors across hospital specialties with diverse duty statuses
- 16 hospital beds across ICU, Emergency, Surgery, General, and Pediatric wards
- Tamper-evident SHA-256 audit log chain starting from Genesis Block
- Safe database reset and seeding functionality
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import time
import random

from .database import Base, engine, SessionLocal
from .models import (
    Patient, VitalSign, Allergy, Medication, LabOrder, LabResult,
    Visit, TimelineEvent, Doctor, Bed, AuditLog, CDSRecord,
    User, Appointment, MARTask, PostOpCarePlan, PostOpTask,
    DietOrder, MealDelivery, InventoryItem, StockTransaction,
    CriticalResultFollowUp, PatientHistoryChangeAlert, ClinicalHandover,
    DuplicateReviewRecord, MedicalCorrectionRecord, TemporaryQRAccessGrant
)
from .dsa.audit_chain import compute_audit_hash, GENESIS_HASH
from .auth import hash_password


def seed_database(db: Session, force_reset: bool = False):
    """Initializes or resets database with comprehensive synthetic clinical data."""
    if force_reset:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        Base.metadata.create_all(bind=engine)
        if db.query(Patient).count() > 0:
            seed_new_intelligent_features(db)
            return  # Already seeded

    now = datetime.utcnow()
    now_ts = now.timestamp()

    # --- 1. SEED DOCTORS ---
    doctors_data = [
        ("DOC-101", "Dr. Ayesha Mukherjee", "Emergency Medicine", "Emergency", "On Duty", True, 6, "+91 98111-22334", "ayesha.m@medtree.org"),
        ("DOC-102", "Dr. Vikram Sethi", "Interventional Cardiology", "Cardiology", "On Duty", True, 4, "+91 98222-33445", "vikram.s@medtree.org"),
        ("DOC-103", "Dr. Radhika Nair", "Orthopedic Surgery", "Orthopedics", "In Consultation", True, 5, "+91 98333-44556", "radhika.n@medtree.org"),
        ("DOC-104", "Dr. Sanjeev Kapoor", "Pediatrics & Neonatology", "Pediatrics", "On Duty", True, 6, "+91 98444-55667", "sanjeev.k@medtree.org"),
        ("DOC-105", "Dr. Sunita Rao", "Internal Medicine", "General Medicine", "On Duty", True, 8, "+91 98555-66778", "sunita.r@medtree.org"),
        ("DOC-106", "Dr. Farhan Qureshi", "Critical Care & Pulmonology", "ICU", "Off Duty", False, 4, "+91 98666-77889", "farhan.q@medtree.org"),
    ]

    for d_id, name, spec, dept, duty, avail, max_p, ph, em in doctors_data:
        db.add(Doctor(
            doctor_id=d_id,
            name=name,
            specialty=spec,
            department=dept,
            duty_status=duty,
            is_available=avail,
            max_active_patients=max_p,
            phone=ph,
            email=em
        ))
    db.flush()

    # --- 2. SEED BEDS ---
    beds_data = [
        ("BED-ICU-01", "ICU", "ICU", "Occupied"),
        ("BED-ICU-02", "ICU", "ICU", "Available"),
        ("BED-ICU-03", "ICU", "ICU", "Cleaning"),
        ("BED-EMG-01", "Emergency", "Emergency", "Occupied"),
        ("BED-EMG-02", "Emergency", "Emergency", "Available"),
        ("BED-EMG-03", "Emergency", "Emergency", "Available"),
        ("BED-EMG-04", "Emergency", "Emergency", "Cleaning"),
        ("BED-SURG-01", "Surgery", "Orthopedics", "Occupied"),
        ("BED-SURG-02", "Surgery", "Orthopedics", "Available"),
        ("BED-GENM-01", "General Male", "General Medicine", "Occupied"),
        ("BED-GENM-02", "General Male", "General Medicine", "Available"),
        ("BED-GENM-03", "General Male", "General Medicine", "Reserved"),
        ("BED-GENF-01", "General Female", "General Medicine", "Available"),
        ("BED-GENF-02", "General Female", "General Medicine", "Occupied"),
        ("BED-PED-01", "Pediatrics", "Pediatrics", "Available"),
        ("BED-PED-02", "Pediatrics", "Pediatrics", "Cleaning"),
    ]

    for b_id, ward, dept, status in beds_data:
        db.add(Bed(
            bed_id=b_id,
            ward=ward,
            department=dept,
            status=status,
            current_patient_id=None,
            last_cleaned_at=(now - timedelta(hours=4)).isoformat()
        ))
    db.flush()

    # --- 3. SEED AUDIT LOG GENESIS ---
    prev_hash = GENESIS_HASH
    audit_chain = []

    def append_audit(actor: str, action: str, rec_id: str, details: str, event_time: str):
        nonlocal prev_hash
        curr_h = compute_audit_hash(prev_hash, event_time, actor, action, rec_id, details)
        entry = AuditLog(
            timestamp=event_time,
            actor=actor,
            action=action,
            record_id=rec_id,
            details=details,
            prev_hash=prev_hash,
            current_hash=curr_h,
        )
        db.add(entry)
        db.flush()
        prev_hash = curr_h
        return entry

    # System boot audit
    append_audit("System", "SYSTEM_BOOT", "SYS-001", "MedTree X Core Engine initialized with SHA-256 chain", (now - timedelta(hours=10)).isoformat())

    # --- 4. SEED PATIENTS ---
    patients_data = [
        # 1. Critical cases (Priority 1)
        {
            "id": "PT-101",
            "name": "Sara Khan",
            "age": 58,
            "gender": "Female",
            "phone": "+91 98765-43210",
            "email": "sara.khan@gmail.com",
            "govt_id": "AADHAAR-8921-3312",
            "blood_group": "B+",
            "priority": 1,
            "status": "In Treatment",
            "department": "Cardiology",
            "concern": "Chest pain radiating to left arm with diaphoresis",
            "doc_id": "DOC-102",
            "bed_id": "BED-ICU-01",
            "arr_offset_mins": 95,
            "triage_notes": "Possible Acute Coronary Syndrome. Stat ECG and troponin ordered.",
            "vitals": {"sbp": 85, "dbp": 55, "hr": 118, "temp": 98.4, "rr": 26, "spo2": 91},
            "allergies": [("Penicillin", "Severe", "Anaphylactic shock")],
            "meds": [("Aspirin 300mg", "Stat chewable", "Once", "Active", "Dr. Vikram Sethi")],
            "labs": [
                ("Complete Blood Count (CBC)", "Dr. Vikram Sethi", [
                    ("Hemoglobin", "13.2", "g/dL", "12.0 - 17.5", "Normal"),
                    ("WBC Count", "12.4", "10^3/uL", "4.5 - 11.0", "High"),
                ]),
                ("Lipid Profile", "Dr. Vikram Sethi", [
                    ("Total Cholesterol", "240", "mg/dL", "< 200", "High"),
                    ("Triglycerides", "190", "mg/dL", "< 150", "High"),
                ]),
            ],
        },
        {
            "id": "PT-102",
            "name": "Rohan Das",
            "age": 42,
            "gender": "Male",
            "phone": "+91 98123-98765",
            "email": "rohan.das@yahoo.com",
            "govt_id": "AADHAAR-5544-2211",
            "blood_group": "O+",
            "priority": 1,
            "status": "Waiting",
            "department": "Emergency",
            "concern": "Difficulty breathing with audible wheezing and stridor",
            "doc_id": "DOC-101",
            "bed_id": None,
            "arr_offset_mins": 40,
            "triage_notes": "Severe acute asthma exacerbation. Peak flow reduced.",
            "vitals": {"sbp": 135, "dbp": 88, "hr": 122, "temp": 99.1, "rr": 32, "spo2": 88},
            "allergies": [("Aspirin", "Moderate", "Bronchospasm")],
            "meds": [("Salbutamol Nebulization 2.5mg", "Nebulized", "Every 20 mins", "Active", "Dr. Ayesha Mukherjee")],
            "labs": [],
        },
        # 2. Urgent cases (Priority 2)
        {
            "id": "PT-103",
            "name": "Amit Patel",
            "age": 29,
            "gender": "Male",
            "phone": "+91 98450-11223",
            "email": "amit.patel@outlook.com",
            "govt_id": "AADHAAR-3321-4455",
            "blood_group": "A+",
            "priority": 2,
            "status": "In Treatment",
            "department": "Orthopedics",
            "concern": "Wounds and cuts with suspected forearm fracture after bike skid",
            "doc_id": "DOC-103",
            "bed_id": "BED-SURG-01",
            "arr_offset_mins": 75,
            "triage_notes": "Right distal radius deformity. Splint applied.",
            "vitals": {"sbp": 128, "dbp": 82, "hr": 92, "temp": 98.6, "rr": 18, "spo2": 98},
            "allergies": [],
            "meds": [("Tramadol 50mg", "Oral", "SOS", "Active", "Dr. Radhika Nair")],
            "labs": [],
        },
        {
            "id": "PT-104",
            "name": "Ananya Sen",
            "age": 7,
            "gender": "Female",
            "phone": "+91 97111-55667",
            "email": "sen.family@gmail.com",
            "govt_id": "AADHAAR-9988-1122",
            "blood_group": "AB+",
            "priority": 2,
            "status": "Waiting",
            "department": "Pediatrics",
            "concern": "Fever (103.5 F) with persistent vomiting and lethargy",
            "doc_id": "DOC-104",
            "bed_id": None,
            "arr_offset_mins": 55,
            "triage_notes": "High febrile state in pediatric patient. Monitor hydration.",
            "vitals": {"sbp": 95, "dbp": 60, "hr": 130, "temp": 103.6, "rr": 24, "spo2": 97},
            "allergies": [("Sulfa drugs", "Mild", "Urticarial rash")],
            "meds": [("Paracetamol Syrup 250mg", "Oral", "TDS", "Active", "Dr. Sanjeev Kapoor")],
            "labs": [
                ("Complete Blood Count (CBC)", "Dr. Sanjeev Kapoor", [
                    ("Hemoglobin", "11.5", "g/dL", "11.0 - 14.5", "Normal"),
                    ("WBC Count", "14.8", "10^3/uL", "5.0 - 12.0", "High"),
                ])
            ],
        },
        {
            "id": "PT-105",
            "name": "Priya Sharma",
            "age": 34,
            "gender": "Female",
            "phone": "+91 98765-88899",
            "email": "priya.sharma@gmail.com",
            "govt_id": "AADHAAR-4411-9988",
            "blood_group": "O-",
            "priority": 2,
            "status": "Lab Requested",
            "department": "Emergency",
            "concern": "Abdominal pain in right iliac fossa with nausea",
            "doc_id": "DOC-101",
            "bed_id": "BED-EMG-01",
            "arr_offset_mins": 85,
            "triage_notes": "Rebound tenderness at McBurney's point. Suspected appendicitis.",
            "vitals": {"sbp": 118, "dbp": 76, "hr": 96, "temp": 100.8, "rr": 20, "spo2": 99},
            "allergies": [],
            "meds": [("Pantoprazole 40mg IV", "Intravenous", "Once daily", "Active", "Dr. Ayesha Mukherjee")],
            "labs": [
                ("Complete Blood Count (CBC)", "Dr. Ayesha Mukherjee", [
                    ("Hemoglobin", "12.8", "g/dL", "12.0 - 15.5", "Normal"),
                    ("WBC Count", "16.2", "10^3/uL", "4.5 - 11.0", "Critical"),
                ]),
                ("C-Reactive Protein (CRP)", "Dr. Ayesha Mukherjee", [
                    ("High-Sensitivity CRP", "28.5", "mg/L", "< 3.0", "High"),
                ]),
            ],
        },
        # 3. Normal cases (Priority 3)
        {
            "id": "PT-106",
            "name": "Kavita Reddy",
            "age": 45,
            "gender": "Female",
            "phone": "+91 99000-44332",
            "email": "kavita.reddy@yahoo.com",
            "govt_id": "AADHAAR-7711-2299",
            "blood_group": "A-",
            "priority": 3,
            "status": "Waiting",
            "department": "General Medicine",
            "concern": "Fever, cough and sore throat for 3 days",
            "doc_id": "DOC-105",
            "bed_id": None,
            "arr_offset_mins": 50,
            "triage_notes": "Viral upper respiratory tract infection. Stable vitals.",
            "vitals": {"sbp": 122, "dbp": 78, "hr": 78, "temp": 100.2, "rr": 16, "spo2": 99},
            "allergies": [],
            "meds": [],
            "labs": [],
        },
        {
            "id": "PT-107",
            "name": "Vikram Malhotra",
            "age": 52,
            "gender": "Male",
            "phone": "+91 98888-22331",
            "email": "v.malhotra@corp.com",
            "govt_id": "AADHAAR-6622-4411",
            "blood_group": "B+",
            "priority": 3,
            "status": "Waiting",
            "department": "General Medicine",
            "concern": "Diabetes follow-up and mild fatigue",
            "doc_id": "DOC-105",
            "bed_id": None,
            "arr_offset_mins": 35,
            "triage_notes": "Quarterly diabetic checkup. Fasting and HbA1c required.",
            "vitals": {"sbp": 138, "dbp": 86, "hr": 74, "temp": 98.4, "rr": 16, "spo2": 98},
            "allergies": [],
            "meds": [("Metformin 500mg", "Oral", "BD after meals", "Active", "Dr. Sunita Rao")],
            "labs": [
                ("Blood Glucose", "Dr. Sunita Rao", [
                    ("Fasting Blood Glucose", "148", "mg/dL", "70 - 99", "High"),
                ]),
                ("HbA1c", "Dr. Sunita Rao", [
                    ("Glycated Hemoglobin (HbA1c)", "7.4", "%", "4.0 - 5.6", "High"),
                ]),
            ],
        },
        {
            "id": "PT-108",
            "name": "Neha Gupta",
            "age": 27,
            "gender": "Female",
            "phone": "+91 97777-11223",
            "email": "neha.g@outlook.com",
            "govt_id": "AADHAAR-1133-5577",
            "blood_group": "O+",
            "priority": 3,
            "status": "In Treatment",
            "department": "General Medicine",
            "concern": "Skin rash or allergy on forearm with itching",
            "doc_id": "DOC-105",
            "bed_id": "BED-GENF-02",
            "arr_offset_mins": 110,
            "triage_notes": "Contact dermatitis suspected from new topical cosmetic.",
            "vitals": {"sbp": 115, "dbp": 72, "hr": 76, "temp": 98.2, "rr": 14, "spo2": 99},
            "allergies": [("Nickel", "Mild", "Eczematous rash")],
            "meds": [("Cetirizine 10mg", "Oral", "Once daily at night", "Active", "Dr. Sunita Rao")],
            "labs": [],
        },
        {
            "id": "PT-109",
            "name": "Manoj Tiwari",
            "age": 64,
            "gender": "Male",
            "phone": "+91 96666-44556",
            "email": "manoj.tiwari@gmail.com",
            "govt_id": "AADHAAR-8833-2211",
            "blood_group": "AB-",
            "priority": 2,
            "status": "Observation",
            "department": "General Medicine",
            "concern": "High blood pressure (180/105) with occipital headache",
            "doc_id": "DOC-105",
            "bed_id": "BED-GENM-01",
            "arr_offset_mins": 130,
            "triage_notes": "Hypertensive urgency. Titrating anti-hypertensives.",
            "vitals": {"sbp": 182, "dbp": 106, "hr": 84, "temp": 98.6, "rr": 18, "spo2": 97},
            "allergies": [],
            "meds": [("Amlodipine 5mg", "Oral", "Once daily", "Active", "Dr. Sunita Rao")],
            "labs": [
                ("Kidney Function Test (KFT)", "Dr. Sunita Rao", [
                    ("Serum Creatinine", "1.1", "mg/dL", "0.6 - 1.2", "Normal"),
                    ("Blood Urea Nitrogen (BUN)", "18", "mg/dL", "7 - 20", "Normal"),
                ]),
            ],
        },
        # 4. DUPLICATE PAIR (Feature 4 demo)
        {
            "id": "PT-110",
            "name": "Rajesh Kumar",
            "age": 38,
            "gender": "Male",
            "phone": "+91 98999-00112",
            "email": "rajesh.k@gmail.com",
            "govt_id": "AADHAAR-9090-8080",
            "blood_group": "B+",
            "priority": 3,
            "status": "Waiting",
            "department": "General Medicine",
            "concern": "Joint pain and stiffness in bilateral knees",
            "doc_id": "DOC-105",
            "bed_id": None,
            "arr_offset_mins": 25,
            "triage_notes": "Routine osteoarthritis review.",
            "vitals": {"sbp": 120, "dbp": 80, "hr": 72, "temp": 98.4, "rr": 16, "spo2": 99},
            "allergies": [],
            "meds": [],
            "labs": [],
            "is_dup": True,
        },
        {
            "id": "PT-111",
            "name": "Rajesh K. Kumar",
            "age": 38,
            "gender": "Male",
            "phone": "+91 98999-00112",  # Identical normalized phone!
            "email": "rajesh.kumar38@gmail.com",
            "govt_id": "AADHAAR-9090-8080",
            "blood_group": "B+",
            "priority": 3,
            "status": "Waiting",
            "department": "Orthopedics",
            "concern": "Joint pain follow-up",
            "doc_id": "DOC-103",
            "bed_id": None,
            "arr_offset_mins": 10,
            "triage_notes": "Suspected re-registration under secondary phone/email variation.",
            "vitals": {"sbp": 122, "dbp": 82, "hr": 74, "temp": 98.6, "rr": 16, "spo2": 99},
            "allergies": [],
            "meds": [],
            "labs": [],
            "is_dup": True,
        },
        # 5. Completed discharge case
        {
            "id": "PT-112",
            "name": "Sunil Verma",
            "age": 49,
            "gender": "Male",
            "phone": "+91 98111-99887",
            "email": "s.verma@gmail.com",
            "govt_id": "AADHAAR-3344-5566",
            "blood_group": "O+",
            "priority": 3,
            "status": "Completed",
            "department": "General Medicine",
            "concern": "Routine check-up and lipid screening",
            "doc_id": "DOC-105",
            "bed_id": None,
            "arr_offset_mins": 240,
            "triage_notes": "General wellness check completed. Lifestyle advice provided.",
            "vitals": {"sbp": 118, "dbp": 78, "hr": 70, "temp": 98.4, "rr": 15, "spo2": 99},
            "allergies": [],
            "meds": [],
            "labs": [],
        },
    ]

    lab_order_counter = 701
    for p_info in patients_data:
        arr_ts = now_ts - (p_info["arr_offset_mins"] * 60)
        reg_iso = (now - timedelta(minutes=p_info["arr_offset_mins"])).isoformat()

        patient = Patient(
            patient_id=p_info["id"],
            full_name=p_info["name"],
            age=p_info["age"],
            gender=p_info["gender"],
            phone=p_info["phone"],
            email=p_info["email"],
            govt_id=p_info["govt_id"],
            address="New Delhi, India",
            blood_group=p_info["blood_group"],
            priority=p_info["priority"],
            status=p_info["status"],
            department=p_info["department"],
            reported_concern=p_info["concern"],
            assigned_doctor_id=p_info["doc_id"],
            assigned_bed_id=p_info["bed_id"],
            arrival_time=arr_ts,
            registration_date=reg_iso,
            updated_at=reg_iso,
            is_duplicate_flag=p_info.get("is_dup", False),
            triage_notes=p_info["triage_notes"],
        )
        db.add(patient)
        db.flush()

        # Update bed current_patient_id if assigned
        if p_info["bed_id"]:
            bed = db.query(Bed).filter(Bed.bed_id == p_info["bed_id"]).first()
            if bed:
                bed.current_patient_id = patient.patient_id

        # Vitals
        v = p_info["vitals"]
        db.add(VitalSign(
            patient_id=patient.patient_id,
            blood_pressure_systolic=v.get("sbp"),
            blood_pressure_diastolic=v.get("dbp"),
            heart_rate=v.get("hr"),
            temperature_f=v.get("temp"),
            respiratory_rate=v.get("rr"),
            oxygen_saturation_spo2=v.get("spo2"),
            recorded_at=reg_iso,
        ))

        # Allergies
        for allergen, sev, reac in p_info["allergies"]:
            db.add(Allergy(
                patient_id=patient.patient_id,
                allergen=allergen,
                severity=sev,
                reaction=reac,
            ))

        # Medications
        for m_name, dos, freq, stat, pres in p_info["meds"]:
            db.add(Medication(
                patient_id=patient.patient_id,
                name=m_name,
                dosage=dos,
                frequency=freq,
                status=stat,
                prescribed_by=pres,
                prescribed_at=reg_iso,
            ))

        # Lab Orders & Results
        for l_idx, (test_name, doctor, results) in enumerate(p_info["labs"]):
            order_id = f"LAB-{lab_order_counter}"
            lab_order_counter += 1
            order = LabOrder(
                id=order_id,
                patient_id=patient.patient_id,
                test_name=test_name,
                order_date=reg_iso,
                status="Completed" if results else "Pending",
                ordering_doctor=doctor,
            )
            db.add(order)
            db.flush()

            for param, val, unit, ref, flag in results:
                db.add(LabResult(
                    lab_order_id=order_id,
                    patient_id=patient.patient_id,
                    test_name=test_name,
                    parameter_name=param,
                    result_value=val,
                    unit=unit,
                    reference_range=ref,
                    flag=flag,
                    verified_by="Dr. Anirudh Pathak (Chief Pathologist)",
                    verified_at=reg_iso,
                ))

        # Timeline events
        db.add(TimelineEvent(
            patient_id=patient.patient_id,
            timestamp=reg_iso,
            event_type="Registration",
            title="Patient Registration & Triage",
            description=f"Admitted via {p_info['department']}. Complaint: {p_info['concern']}. Triage Priority {p_info['priority']}.",
            actor="Triage Officer",
        ))

        if p_info["doc_id"]:
            db.add(TimelineEvent(
                patient_id=patient.patient_id,
                timestamp=(now - timedelta(minutes=p_info["arr_offset_mins"] - 5)).isoformat(),
                event_type="Doctor Assignment",
                title=f"Assigned to {p_info['doc_id']}",
                description="Clinical responsibility established.",
                actor="Department Coordinator",
            ))

        if p_info["bed_id"]:
            db.add(TimelineEvent(
                patient_id=patient.patient_id,
                timestamp=(now - timedelta(minutes=p_info["arr_offset_mins"] - 10)).isoformat(),
                event_type="Bed Allocation",
                title=f"Allocated Bed {p_info['bed_id']}",
                description=f"Transferred to {p_info['department']} care unit.",
                actor="Ward Staff",
            ))

        # Audit entry
        append_audit(
            "Triage Officer",
            "REGISTER_PATIENT",
            patient.patient_id,
            f"Registered {patient.full_name} with Priority {patient.priority} in {patient.department}",
            reg_iso
        )

    # --- 5. SEED USER ACCOUNTS ---
    users_data = [
        ("patient101", hash_password("password123"), "patient", "PT-101", None, "Sara Khan", "sara.khan@gmail.com", "+91 98765-43210"),
        ("patient102", hash_password("password123"), "patient", "PT-102", None, "David Miller", "david.m@example.com", "+91 98234-56789"),
        ("patient103", hash_password("password123"), "patient", "PT-103", None, "Priya Sharma", "priya.s@example.com", "+91 98345-67890"),
        ("receptionist", hash_password("reception123"), "receptionist", None, None, "Elena Rostova", "elena.r@medtree.org", "+91 98456-78901"),
        ("dr_smith", hash_password("doctor123"), "doctor", None, "DOC-101", "Dr. Ayesha Mukherjee", "ayesha.m@medtree.org", "+91 98111-22334"),
        ("dr_sharma", hash_password("doctor123"), "doctor", None, "DOC-102", "Dr. Vikram Sethi", "vikram.s@medtree.org", "+91 98222-33445"),
        ("dr_adams", hash_password("doctor123"), "doctor", None, "DOC-103", "Dr. Radhika Nair", "radhika.n@medtree.org", "+91 98333-44556"),
        ("nurse_sarah", hash_password("nurse123"), "nurse", None, None, "Nurse Sarah Jenkins, RN", "sarah.jenkins@medtree.org", "+91 98567-89012"),
        ("admin", hash_password("admin123"), "admin", None, None, "Chief Operations Officer", "admin@medtree.org", "+91 98678-90123"),
    ]

    for un, pwd, role, pid, doc_id, full_name, email, phone in users_data:
        db.add(User(
            username=un,
            password_hash=pwd,
            role=role,
            patient_id=pid,
            doctor_id=doc_id,
            full_name=full_name,
            email=email,
            phone=phone,
            created_at=now.isoformat()
        ))
    db.flush()

    # --- 6. SEED APPOINTMENTS ---
    tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    today_str = now.strftime("%Y-%m-%d")
    appointments_data = [
        ("APT-501", "PT-101", "DOC-102", "Cardiology", f"{tomorrow_str}T10:00:00", "Post-coronary intervention cardiology follow-up", "Scheduled"),
        ("APT-502", "PT-102", "DOC-101", "Emergency", f"{today_str}T11:30:00", "Acute chest pain & dyspnea reassessment", "Checked In"),
        ("APT-503", "PT-103", "DOC-103", "Orthopedics", f"{tomorrow_str}T14:00:00", "Post-fracture joint immobilization check", "Scheduled"),
        ("APT-504", "PT-104", "DOC-105", "General Medicine", f"{today_str}T16:00:00", "Diabetic ketoacidosis follow-up evaluation", "Scheduled"),
    ]

    for a_id, p_id, d_id, dept, sched_time, reason, status in appointments_data:
        db.add(Appointment(
            id=a_id,
            patient_id=p_id,
            doctor_id=d_id,
            department=dept,
            scheduled_time=sched_time,
            reason=reason,
            status=status,
            created_at=now.isoformat()
        ))
    db.flush()

    # --- 7. SEED MAR TASKS (Medication Administration Records) ---
    mar_data = [
        ("MAR-801", "PT-101", "Heparin Sodium IV", "5000 IU", "IV", (now - timedelta(hours=2)).isoformat(), (now - timedelta(hours=2)).isoformat(), "Administered", "Nurse Sarah Jenkins, RN", "", "Therapeutic anticoagulation IV bolus verified."),
        ("MAR-802", "PT-101", "Metoprolol Tartrate", "25mg", "Oral", (now - timedelta(hours=4)).isoformat(), (now - timedelta(hours=4)).isoformat(), "Administered", "Nurse Sarah Jenkins, RN", "", "Administered with post-op water sip."),
        ("MAR-803", "PT-101", "Atorvastatin Calcium", "40mg", "Oral", (now + timedelta(minutes=45)).isoformat(), None, "Due Soon", "", "", "Evening lipid stabilisation dose."),
        ("MAR-804", "PT-101", "Heparin Sodium IV", "5000 IU", "IV", (now + timedelta(hours=6)).isoformat(), None, "Due", "", "", "Routine anticoagulation infusion round."),
        ("MAR-805", "PT-104", "Regular Insulin SubQ", "8 Units", "SC", (now - timedelta(hours=1)).isoformat(), None, "Delayed", "", "Patient off ward for diagnostic imaging.", "Scheduled pre-meal sliding scale dose."),
    ]

    for m_id, p_id, med_name, dose, route, sched, admin_t, status, admin_by, hold_r, notes in mar_data:
        db.add(MARTask(
            id=m_id,
            patient_id=p_id,
            medication_name=med_name,
            dosage=dose,
            route=route,
            scheduled_time=sched,
            administered_time=admin_t,
            status=status,
            administered_by=admin_by,
            hold_reason=hold_r,
            notes=notes,
            created_at=now.isoformat()
        ))
    db.flush()

    # --- 8. SEED POST-OP CARE PLANS & TASKS ---
    pop_plan = PostOpCarePlan(
        id="POP-601",
        patient_id="PT-101",
        doctor_id="DOC-102",
        procedure_name="Emergency Percutaneous Transluminal Coronary Angioplasty",
        surgery_date=(now - timedelta(hours=8)).strftime("%Y-%m-%d"),
        target_discharge_date=(now + timedelta(days=2)).strftime("%Y-%m-%d"),
        status="Active",
        wound_care_instructions="Right groin arterial puncture site: Maintain compressive pressure dressing intact for 6 hours. Check for hematoma or active oozing every 2 hours.",
        mobility_goal="Complete bed rest for first 6 hours post-sheath removal, sitting up at Day 1, assisted room ambulation Day 2.",
        created_at=(now - timedelta(hours=8)).isoformat()
    )
    db.add(pop_plan)
    db.flush()

    post_op_tasks = [
        ("PTK-901", "POP-601", "PT-101", "Observation", "Continuous 12-Lead ECG & Rhythm Telemetry", (now - timedelta(hours=6)).isoformat(), (now - timedelta(hours=6)).isoformat(), "Completed", "Sinus rhythm maintained. ST segments stable.", "Nurse Sarah Jenkins, RN"),
        ("PTK-902", "POP-601", "PT-101", "Wound Care", "Femoral Puncture Site & Hematoma Inspection", (now - timedelta(hours=4)).isoformat(), (now - timedelta(hours=4)).isoformat(), "Completed", "Dressing dry and intact. Distal pedal pulses +2 bilaterally.", "Nurse Sarah Jenkins, RN"),
        ("PTK-903", "POP-601", "PT-101", "Pain Review", "Chest & Puncture Site Visual Analog Pain Scale", (now + timedelta(hours=2)).isoformat(), None, "Pending", "Assess pain score 0-10; titrate analgesia if > 4.", ""),
        ("PTK-904", "POP-601", "PT-101", "Observation", "Incentive Spirometry & Pulmonary Assessment", (now + timedelta(hours=4)).isoformat(), None, "Pending", "Goal: 10 breaths every waking hour.", ""),
        ("PTK-905", "POP-601", "PT-101", "Mobility Assessment", "First Stage Assisted Bedside Sitting Protocol", (now + timedelta(hours=8)).isoformat(), None, "Pending", "Verify blood pressure before and during sitting.", ""),
    ]

    for t_id, pl_id, p_id, t_type, title, due_t, comp_t, status, notes, n_name in post_op_tasks:
        db.add(PostOpTask(
            id=t_id,
            plan_id=pl_id,
            patient_id=p_id,
            task_type=t_type,
            title=title,
            due_time=due_t,
            completed_time=comp_t,
            status=status,
            notes=notes,
            nurse_name=n_name
        ))
    db.flush()

    # --- 9. SEED DIET ORDERS & MEAL DELIVERIES ---
    diet_pt101 = DietOrder(
        id="DIET-401",
        patient_id="PT-101",
        diet_type="Cardiac",
        allergens_restricted="Peanuts, Shellfish",
        texture="Standard",
        is_npo=False,
        status="Active",
        ordering_clinician="Dr. Vikram Sethi",
        notes="Low-sodium (<2g/day), low-saturated fat cardiac rehabilitation diet.",
        created_at=(now - timedelta(hours=7)).isoformat()
    )
    db.add(diet_pt101)

    diet_pt104 = DietOrder(
        id="DIET-402",
        patient_id="PT-104",
        diet_type="Diabetic",
        allergens_restricted="Penicillin-derived traces",
        texture="Standard",
        is_npo=False,
        status="Active",
        ordering_clinician="Dr. Sunita Rao",
        notes="Consistent-carbohydrate diabetic meal plan with glycemic tracking.",
        created_at=(now - timedelta(hours=10)).isoformat()
    )
    db.add(diet_pt104)
    db.flush()

    meals_data = [
        ("MEAL-301", "DIET-401", "PT-101", "Breakfast", today_str, f"{today_str}T08:30:00", "Delivered", True, "Zero allergen conflict. Delivered oats & fruit.", "Dietary Aide Anita", (now - timedelta(hours=3)).isoformat()),
        ("MEAL-302", "DIET-401", "PT-101", "Lunch", today_str, f"{today_str}T12:45:00", "Scheduled", True, "Pre-checked: Low-sodium steamed vegetables and brown rice.", "", None),
        ("MEAL-303", "DIET-401", "PT-101", "Dinner", today_str, f"{today_str}T19:30:00", "Scheduled", True, "Planned cardiac evening dinner.", "", None),
        ("MEAL-304", "DIET-402", "PT-104", "Lunch", today_str, f"{today_str}T13:00:00", "Scheduled", True, "Diabetic consistent-carb meal package.", "", None),
    ]

    for m_id, do_id, p_id, period, s_date, s_time, d_status, a_pass, conf, d_by, d_at in meals_data:
        db.add(MealDelivery(
            id=m_id,
            diet_order_id=do_id,
            patient_id=p_id,
            meal_period=period,
            scheduled_date=s_date,
            scheduled_time=s_time,
            delivery_status=d_status,
            allergy_check_passed=a_pass,
            conflict_details=conf,
            delivered_by=d_by,
            delivered_at=d_at
        ))
    db.flush()

    # --- 10. SEED PHARMACY & MEDICAL INVENTORY ---
    inventory_items_data = [
        ("INV-101", "MED-HEP-5K", "Heparin Sodium 5,000 IU/mL (10mL)", "Medication", "Vials", 85, 0, 25, "HEP-2026-08", "2027-08-31", "Central Pharmacy"),
        ("INV-102", "MED-MET-25", "Metoprolol Tartrate 25mg", "Medication", "Tablets", 320, 0, 50, "MET-2025-11", "2027-04-15", "Central Pharmacy"),
        ("INV-103", "MED-ATV-40", "Atorvastatin Calcium 40mg", "Medication", "Tablets", 210, 0, 40, "ATV-2026-01", "2027-06-30", "Central Pharmacy"),
        ("INV-104", "MED-CEF-1G", "Ceftriaxone 1g IV Sterile Powder", "Medication", "Vials", 45, 0, 30, "CEF-2025-09", "2026-11-20", "Central Pharmacy"),
        ("INV-105", "IVF-NS-500", "Normal Saline 0.9% 500mL Infusion Bag", "IV Fluids", "Bags", 140, 0, 60, "NS-2026-04", "2027-12-31", "Emergency Pyxis"),
        ("INV-106", "IVF-RL-500", "Ringer's Lactate 500mL Infusion Bag", "IV Fluids", "Bags", 95, 0, 50, "RL-2026-02", "2027-10-31", "ICU Pyxis"),
        ("INV-107", "DIA-TROP-I", "High-Sensitivity Troponin I Rapid Cartridges", "Diagnostic Reagents", "Tests", 8, 0, 20, "TROP-2025-07", "2026-11-15", "Emergency Lab"),
        ("INV-108", "SUR-GLV-75", "Sterile Surgical Powder-Free Gloves 7.5", "Surgical Supplies", "Pairs", 180, 0, 50, "GLV-2026-03", "2028-05-31", "Surgical Suite"),
        ("INV-109", "PPE-N95-FL", "N95 Particulate Respirator Masks (Fluid Resistant)", "PPE", "Boxes", 60, 0, 30, "N95-2025-12", "2028-12-31", "Central Store"),
        ("INV-110", "SUR-DRS-PK", "Post-Op Sterile Surgical Wound Dressing Packs", "Surgical Supplies", "Kits", 35, 0, 25, "DRS-2026-05", "2027-09-30", "Inpatient Floor"),
    ]

    for inv_id, code, name, cat, unit, qoh, res_q, reorder_th, batch, exp_d, loc in inventory_items_data:
        db.add(InventoryItem(
            id=inv_id,
            item_code=code,
            name=name,
            category=cat,
            unit=unit,
            quantity_on_hand=qoh,
            reserved_quantity=res_q,
            reorder_threshold=reorder_th,
            batch_number=batch,
            expiry_date=exp_d,
            location=loc
        ))
    db.flush()

    # Initial stock transactions for inventory
    db.add(StockTransaction(
        item_id="INV-107",
        transaction_type="Receipt",
        quantity=50,
        reference_id="PO-2026-901",
        actor="Pharmacy Inventory Manager",
        timestamp=(now - timedelta(days=45)).isoformat(),
        notes="Initial quarterly batch receipt."
    ))
    db.add(StockTransaction(
        item_id="INV-107",
        transaction_type="Issue",
        quantity=42,
        reference_id="EMG-USAGE-OCT",
        actor="Emergency Lab Staff",
        timestamp=(now - timedelta(days=2)).isoformat(),
        notes="Dispensed for emergency cardiac triage admissions."
    ))

    db.commit()
    seed_new_intelligent_features(db)
    print("MedTree X database successfully seeded with synthetic clinical records.")


def seed_new_intelligent_features(db: Session):
    """Ensures the 5 new intelligent feature tables have initial demo data."""
    now = datetime.utcnow()

    # 1. Critical Result Follow-Ups
    if db.query(CriticalResultFollowUp).count() == 0:
        db.add(CriticalResultFollowUp(
            id="CRF-101",
            patient_id="PT-101",
            lab_order_id="LAB-101",
            test_name="Troponin-I (High Sensitivity)",
            parameter_name="Troponin-I",
            result_value="0.08 ng/mL",
            unit="ng/mL",
            reference_range="< 0.04 ng/mL",
            critical_rationale="High-sensitivity Troponin-I above diagnostic ischemic threshold. High risk of Acute Myocardial Infarction.",
            status="Awaiting Acknowledgement",
            deadline=(now + timedelta(minutes=15)).isoformat(),
            assigned_doctor_id="DOC-101",
            created_at=(now - timedelta(minutes=10)).isoformat()
        ))
        db.add(CriticalResultFollowUp(
            id="CRF-102",
            patient_id="PT-102",
            lab_order_id="LAB-102",
            test_name="Electrolytes",
            parameter_name="Serum Potassium (K+)",
            result_value="6.2 mEq/L",
            unit="mEq/L",
            reference_range="3.5 - 5.0 mEq/L",
            critical_rationale="Hyperkalemia (>6.0 mEq/L). Life-threatening cardiac dysrhythmia danger.",
            status="Acknowledged",
            deadline=(now + timedelta(minutes=45)).isoformat(),
            assigned_doctor_id="DOC-102",
            acknowledged_by="Dr. Vikram Sethi",
            acknowledged_at=(now - timedelta(minutes=5)).isoformat(),
            action_taken="Administered Calcium Gluconate 10% IV and ordered repeat stat panel.",
            created_at=(now - timedelta(minutes=25)).isoformat()
        ))
        db.flush()

    # 2. Patient History Change Alerts
    if db.query(PatientHistoryChangeAlert).count() == 0:
        db.add(PatientHistoryChangeAlert(
            id="PCA-101",
            patient_id="PT-101",
            record_type="Allergy",
            record_id="ALG-101",
            field_name="Allergies",
            old_value="NKDA",
            new_value="Penicillin (Anaphylaxis)",
            author_name="Dr. Ayesha Mukherjee",
            author_role="doctor",
            reason="Patient reported severe hives and bronchospasm upon past amoxicillin exposure.",
            is_reviewed=False,
            created_at=(now - timedelta(minutes=40)).isoformat()
        ))
        db.add(PatientHistoryChangeAlert(
            id="PCA-102",
            patient_id="PT-102",
            record_type="Medication",
            record_id="MED-102",
            field_name="Dosage",
            old_value="Metoprolol 25mg PO",
            new_value="Metoprolol 50mg PO BID",
            author_name="Dr. Vikram Sethi",
            author_role="doctor",
            reason="Dose escalated to control refractory resting tachycardia.",
            is_reviewed=True,
            reviewed_by="Dr. Vikram Sethi",
            reviewed_at=(now - timedelta(minutes=15)).isoformat(),
            created_at=(now - timedelta(hours=2)).isoformat()
        ))
        db.flush()

    # 3. Clinical Handovers
    if db.query(ClinicalHandover).count() == 0:
        db.add(ClinicalHandover(
            id="HND-201",
            patient_id="PT-101",
            ward="ICU",
            outgoing_staff_id="DOC-101",
            outgoing_staff_name="Dr. Ayesha Mukherjee",
            outgoing_role="doctor",
            incoming_staff_name="Nurse Sarah Jenkins, RN",
            incoming_role="nurse",
            status="Submitted",
            clinical_summary="Sara Khan (62y/F), Bed BED-ICU-01. Acute Coronary Syndrome under STAT evaluation. Elevated Troponin-I. BP stable at 145/90.",
            pending_tasks='["Obtain repeat Troponin-I at 2 hours", "Monitor telemetry for ST segment elevation", "Administer chewable aspirin 325mg"]',
            critical_concerns="Elevated cardiac biomarkers; high risk of progression to STEMI.",
            contingency_plans="If chest pain recurs or BP drops below 90 mmHg, notify cardiology on-call and activate cath lab team immediately.",
            version=1,
            created_at=(now - timedelta(minutes=30)).isoformat(),
            notes="Patient is resting comfortably; spouse is in waiting area."
        ))
        db.flush()

    # 4. Duplicate Review Records
    if db.query(DuplicateReviewRecord).count() == 0:
        db.add(DuplicateReviewRecord(
            patient_id_1="PT-102",
            patient_id_2="PT-107",
            decision="Requires Further Review",
            similarity_percentage=84.5,
            matched_fields="Full Name (Levenshtein 0.92), Year of Birth, Partial Phone match",
            reviewed_by="Records Officer Elena Rostova",
            reviewed_at=(now - timedelta(hours=3)).isoformat(),
            notes="Matching name phonetics and identical phone prefix. Awaiting physical photo ID verification at discharge."
        ))
        db.flush()

    # 5. Medical Corrections
    if db.query(MedicalCorrectionRecord).count() == 0:
        db.add(MedicalCorrectionRecord(
            id="CORR-301",
            patient_id="PT-101",
            record_type="Diagnosis",
            record_id="DIAG-101",
            field_name="diagnosis",
            previous_value="Atypical Angina Pectoris",
            new_value="Non-ST-Elevation Myocardial Infarction (NSTEMI)",
            author_name="Dr. Ayesha Mukherjee",
            author_role="doctor",
            reason="Confirmed positive Troponin-I results (0.08 ng/mL) and ischemic T-wave inversions on 12-lead ECG.",
            approval_status="Approved",
            approver_id="DOC-101",
            approver_name="Dr. Ayesha Mukherjee",
            approved_at=(now - timedelta(minutes=20)).isoformat(),
            timestamp=(now - timedelta(minutes=20)).isoformat(),
            audit_hash="6d729a8f43b5e821c97a55e2e811f5d63f9c6d48e02d0cfb43729864201a09ef"
        ))
        db.flush()

    # 6. Temporary QR Access Grants
    if db.query(TemporaryQRAccessGrant).count() == 0:
        db.add(TemporaryQRAccessGrant(
            id="QRG-401",
            patient_id="PT-101",
            doctor_id="DOC-102",  # Dr. Vikram Sethi
            granted_by="DOC-101",  # Dr. Ayesha Mukherjee
            access_level="Clinical Read/Write",
            expires_at=(now + timedelta(hours=12)).isoformat(),
            is_revoked=False
        ))
        db.flush()

    db.commit()
