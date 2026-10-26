"""
Interoperable Medical Records Export Router (FHIR-Inspired & CSV).

Safety & Conformance Notice:
This module outputs structured healthcare data inspired by HL7 FHIR R4 resource models
(Bundle, Patient, Encounter, Observation) for academic interoperability demonstration.
It is explicitly labeled as FHIR-inspired and does not claim to operate a certified FHIR server.
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Dict, Any
import json
import csv
import io
from datetime import datetime

from ..database import get_db
from ..models import Patient, VitalSign, LabOrder, LabResult, TimelineEvent, Doctor, Bed

router = APIRouter(prefix="/api/export", tags=["Interoperable Data Export"])


def build_fhir_bundle(patient: Patient) -> Dict[str, Any]:
    """Builds a structured FHIR-inspired JSON Bundle for a patient."""
    entries = []

    # 1. FHIR Patient Resource
    patient_resource = {
        "fullUrl": f"urn:uuid:patient-{patient.patient_id}",
        "resource": {
            "resourceType": "Patient",
            "id": patient.patient_id,
            "identifier": [
                {"system": "https://medtree-x.hospital/patients", "value": patient.patient_id},
                {"system": "https://gov.in/identity", "value": patient.govt_id or "N/A"},
            ],
            "active": True,
            "name": [{"use": "official", "text": patient.full_name}],
            "telecom": [
                {"system": "phone", "value": patient.phone, "use": "mobile"} if patient.phone else None,
                {"system": "email", "value": patient.email, "use": "home"} if patient.email else None,
            ],
            "gender": patient.gender.lower() if patient.gender in ["Male", "Female"] else "other",
            "address": [{"text": patient.address or "Hospital Residence Zone"}],
            "extension": [
                {"url": "https://medtree-x.hospital/blood-group", "valueString": patient.blood_group or "Unknown"},
                {"url": "https://medtree-x.hospital/triage-priority", "valueInteger": patient.priority},
            ],
        }
    }
    # Filter None telecoms
    patient_resource["resource"]["telecom"] = [t for t in patient_resource["resource"]["telecom"] if t]
    entries.append(patient_resource)

    # 2. FHIR Encounter Resource
    encounter_resource = {
        "fullUrl": f"urn:uuid:encounter-{patient.patient_id}-current",
        "resource": {
            "resourceType": "Encounter",
            "id": f"ENC-{patient.patient_id}",
            "status": "in-progress" if patient.status in ["Waiting", "In Treatment", "Lab Requested", "Observation"] else "finished",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": "EMER" if patient.department == "Emergency" else "AMB",
                "display": "Emergency" if patient.department == "Emergency" else "Ambulatory",
            },
            "subject": {"reference": f"Patient/{patient.patient_id}", "display": patient.full_name},
            "reasonCode": [{"text": patient.reported_concern or "Routine Assessment"}],
            "serviceProvider": {"display": f"MedTree X — {patient.department} Department"},
            "period": {"start": patient.registration_date},
        }
    }
    entries.append(encounter_resource)

    # 3. FHIR Observations for Vitals
    for v in patient.vitals:
        if v.blood_pressure_systolic and v.blood_pressure_diastolic:
            entries.append({
                "fullUrl": f"urn:uuid:obs-bp-{v.id}",
                "resource": {
                    "resourceType": "Observation",
                    "id": f"OBS-BP-{v.id}",
                    "status": "final",
                    "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs"}]}],
                    "code": {"coding": [{"system": "http://loinc.org", "code": "85354-9", "display": "Blood Pressure Panel"}]},
                    "subject": {"reference": f"Patient/{patient.patient_id}"},
                    "effectiveDateTime": v.recorded_at,
                    "component": [
                        {"code": {"text": "Systolic Blood Pressure"}, "valueQuantity": {"value": v.blood_pressure_systolic, "unit": "mmHg"}},
                        {"code": {"text": "Diastolic Blood Pressure"}, "valueQuantity": {"value": v.blood_pressure_diastolic, "unit": "mmHg"}},
                    ]
                }
            })
        if v.oxygen_saturation_spo2:
            entries.append({
                "fullUrl": f"urn:uuid:obs-spo2-{v.id}",
                "resource": {
                    "resourceType": "Observation",
                    "id": f"OBS-SPO2-{v.id}",
                    "status": "final",
                    "category": [{"coding": [{"code": "vital-signs"}]}],
                    "code": {"coding": [{"system": "http://loinc.org", "code": "2708-6", "display": "Oxygen Saturation in Arterial Blood by Pulse Oximetry"}]},
                    "subject": {"reference": f"Patient/{patient.patient_id}"},
                    "effectiveDateTime": v.recorded_at,
                    "valueQuantity": {"value": v.oxygen_saturation_spo2, "unit": "%", "system": "http://unitsofmeasure.org"},
                }
            })

    # 4. FHIR Observations for Lab Results
    for order in patient.lab_orders:
        for res in order.results:
            entries.append({
                "fullUrl": f"urn:uuid:obs-lab-{res.id}",
                "resource": {
                    "resourceType": "Observation",
                    "id": f"OBS-LAB-{res.id}",
                    "status": "final",
                    "category": [{"coding": [{"code": "laboratory"}]}],
                    "code": {"text": f"{res.test_name} — {res.parameter_name}"},
                    "subject": {"reference": f"Patient/{patient.patient_id}"},
                    "effectiveDateTime": res.verified_at,
                    "valueString": f"{res.result_value} {res.unit}".strip(),
                    "referenceRange": [{"text": res.reference_range}],
                    "interpretation": [{"text": res.flag}],
                    "performer": [{"display": res.verified_by or "Pathologist"}],
                }
            })

    bundle = {
        "resourceType": "Bundle",
        "id": f"BUNDLE-{patient.patient_id}",
        "type": "collection",
        "timestamp": datetime.utcnow().isoformat(),
        "meta": {
            "source": "MedTree X Hospital System",
            "versionId": "1.0",
            "disclaimer": "FHIR-inspired interoperability model. Not a certified HL7 FHIR server.",
        },
        "total": len(entries),
        "entry": entries,
    }
    return bundle


@router.get("/patient/{patient_id}/fhir")
def export_patient_fhir(patient_id: str, db: Session = Depends(get_db)):
    """Returns FHIR-inspired JSON representation of a patient 360 record."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return build_fhir_bundle(patient)


@router.get("/patient/{patient_id}/fhir/download")
def download_patient_fhir(patient_id: str, db: Session = Depends(get_db)):
    """Downloads FHIR JSON bundle as an attachment."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    bundle = build_fhir_bundle(patient)
    json_bytes = json.dumps(bundle, indent=2).encode("utf-8")
    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=medtree_fhir_{patient_id}.json"}
    )


@router.get("/patients/csv")
def export_patients_csv(db: Session = Depends(get_db)):
    """Exports patient registry as downloadable CSV."""
    patients = db.query(Patient).all()
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Patient ID", "Full Name", "Age", "Gender", "Phone", "Email",
        "Priority", "Status", "Department", "Reported Concern",
        "Assigned Doctor", "Assigned Bed", "Registration Date"
    ])

    for p in patients:
        writer.writerow([
            p.patient_id, p.full_name, p.age, p.gender, p.phone, p.email,
            p.priority, p.status, p.department, p.reported_concern,
            p.assigned_doctor_id or "Unassigned", p.assigned_bed_id or "Unassigned",
            p.registration_date
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=medtree_patients.csv"}
    )
