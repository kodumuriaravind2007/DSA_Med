import React, { useEffect, useState } from 'react';
import {
  User, Activity, Calendar, Clock, FileText, Download, ShieldAlert,
  AlertTriangle, Stethoscope, Pill, Beaker, CheckCircle2, ChevronRight,
  Heart, Thermometer, Wind, Droplets, Plus, Copy, Check,
  ShieldCheck, FileCheck, Hash, Link2, AlertOctagon, ClipboardList
} from 'lucide-react';
import { api } from '../services/api';
import {
  Patient360, Patient, LabOrder, MedicalCorrection,
  PatientHistoryChangeAlert, CriticalFollowUp, ClinicalHandover
} from '../types';
import { PriorityBadge, WorkflowBadge } from '../components/StatusBadge';

interface Patient360ViewProps {
  patientId: string;
  allPatients: Patient[];
  onSelectPatient: (patientId: string) => void;
}

export const Patient360View: React.FC<Patient360ViewProps> = ({
  patientId,
  allPatients,
  onSelectPatient,
}) => {
  const [data, setData] = useState<Patient360 | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FHIR Export state
  const [fhirJson, setFhirJson] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  // New Lab Order Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState('Complete Blood Count (CBC)');
  const [orderingDoctor, setOrderingDoctor] = useState('Attending Physician');
  const [isOrdering, setIsOrdering] = useState(false);

  // New Result Modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [paramName, setParamName] = useState('');
  const [paramVal, setParamVal] = useState('');
  const [paramUnit, setParamUnit] = useState('');
  const [paramRange, setParamRange] = useState('');
  const [paramFlag, setParamFlag] = useState('Normal');
  const [isSavingResult, setIsSavingResult] = useState(false);

  const loadProfile = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getPatient360(id);
      setData(res);

      // Load FHIR bundle preview
      const fhir = await api.getPatientFHIR(id);
      setFhirJson(fhir);
    } catch (err: any) {
      setError(err.message || 'Error loading Patient 360');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadProfile(patientId);
    }
  }, [patientId]);

  const handleCreateLabOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    try {
      setIsOrdering(true);
      await api.orderLabTest(data.patient.patient_id, selectedLabTest, orderingDoctor);
      setShowOrderModal(false);
      await loadProfile(data.patient.patient_id);
    } catch (err: any) {
      alert(err.message || 'Error creating lab order');
    } finally {
      setIsOrdering(false);
    }
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setIsSavingResult(true);
      await api.enterLabResult(selectedOrder.id, {
        parameter_name: paramName,
        result_value: paramVal,
        unit: paramUnit,
        reference_range: paramRange,
        flag: paramFlag,
        verified_by: 'Staff Pathologist',
      });
      setShowResultModal(false);
      setParamName('');
      setParamVal('');
      if (data) await loadProfile(data.patient.patient_id);
    } catch (err: any) {
      alert(err.message || 'Error saving result');
    } finally {
      setIsSavingResult(false);
    }
  };

  const handleCopyFHIR = () => {
    if (!fhirJson) return;
    navigator.clipboard.writeText(JSON.stringify(fhirJson, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  if (isLoading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#EC5E27] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-[#EC5E27]">Loading Patient 360 Longitudinal EHR...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="p-4 bg-[#FFF7F2] border border-[#EC5E27]/30 rounded-2xl text-[#EC5E27] text-sm font-semibold">
          Patient record not found or server error: {error}
        </div>
      </div>
    );
  }

  const {
    patient, vitals, allergies, medications, lab_orders, visits, timeline,
    estimated_wait_minutes, queue_position,
    critical_followups = [], change_alerts = [], handovers = [], corrections = []
  } = data;
  const latestVitals = vitals && vitals.length > 0 ? vitals[vitals.length - 1] : null;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Patient Selector Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E8E4C9] shadow-sm text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-[#736860] font-bold">Select Patient Record:</span>
          <select
            value={patient.patient_id}
            onChange={(e) => onSelectPatient(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] font-bold text-[#EC5E27] focus:outline-none focus:border-[#EC5E27]"
          >
            {allPatients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.patient_id} — {p.full_name} ({p.department}, Priority {p.priority})
              </option>
            ))}
          </select>
        </div>
        <span className="text-[11px] text-[#8E8278] font-medium">
          Single Source of Truth • 360° EHR Longitudinal Profile
        </span>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-[#E8E4C9] shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EC5E27] text-[#FFF3EC] flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
              {patient.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-[#251E1A]">{patient.full_name}</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#FDFDF1] text-[#EC5E27] font-bold border border-[#E8E4C9]">
                  {patient.patient_id}
                </span>
                <PriorityBadge priority={patient.priority} />
                <WorkflowBadge status={patient.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#736860] mt-1.5 font-medium">
                <span>{patient.gender}, {patient.age} years</span>
                <span>•</span>
                <span>Blood Group: <strong className="text-[#EC5E27]">{patient.blood_group || 'Unknown'}</strong></span>
                <span>•</span>
                <span>Phone: {patient.phone || 'N/A'}</span>
                <span>•</span>
                <span>Govt ID: {patient.govt_id || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Department & Status Badges */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="p-3 bg-[#FDFDF1]/80 rounded-xl border border-[#E8E4C9]">
              <div className="text-[10px] text-[#736860] uppercase font-bold">Department</div>
              <div className="font-bold text-[#EC5E27]">{patient.department}</div>
            </div>
            <div className="p-3 bg-[#FDFDF1]/80 rounded-xl border border-[#E8E4C9]">
              <div className="text-[10px] text-[#736860] uppercase font-bold">Assigned Bed</div>
              <div className="font-bold text-[#251E1A]">{patient.assigned_bed_id || 'Not Admitted'}</div>
            </div>
            <div className="p-3 bg-[#FDFDF1]/80 rounded-xl border border-[#E8E4C9]">
              <div className="text-[10px] text-[#736860] uppercase font-bold">Attending Doctor</div>
              <div className="font-bold text-[#251E1A]">{patient.assigned_doctor_id || 'Unassigned'}</div>
            </div>
          </div>
        </div>

        {/* Live Queue Position & Wait Alert (if waiting) */}
        {patient.status === 'Waiting' && queue_position && (
          <div className="p-3.5 bg-[#FFF7F2] border border-[#EC5E27]/20 rounded-xl text-xs text-[#EC5E27] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#EC5E27]" />
              <span>
                Currently <strong>#{queue_position}</strong> in waiting queue (Estimated wait: ~{estimated_wait_minutes} min)
              </span>
            </div>
            <span className="font-mono text-[10px] bg-[#EC5E27] text-[#FFF3EC] px-2 py-0.5 rounded-full font-bold">
              Min-Heap Ordered
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs (Bold Oval Buttons) */}
      <div className="flex items-center gap-2 border-b border-[#E8E4C9] overflow-x-auto text-xs pb-2">
        {[
          { id: 'overview', label: '1. Overview' },
          { id: 'timeline', label: '2. Medical Timeline' },
          { id: 'labs', label: `3. Lab Reports (${lab_orders.length})` },
          { id: 'meds', label: `4. Medications & Allergies (${allergies.length})` },
          { id: 'visits', label: `5. Visit History (${visits.length})` },
          { id: 'activity', label: '6. Record Activity' },
          { id: 'export', label: '7. Structured Export (FHIR)' },
          { id: 'corrections', label: `8. Audit Corrections (${corrections.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-bold transition-all rounded-full whitespace-nowrap shadow-2xs ${
              activeTab === tab.id
                ? 'bg-[#EC5E27] text-[#FFF3EC] border border-[#EC5E27]'
                : 'bg-white text-[#736860] border border-[#E8E4C9] hover:text-[#251E1A] hover:bg-[#FDFDF1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Vitals & Alerts */}
          <div className="md:col-span-2 space-y-6">
            {/* Critical Panic Diagnostic Alerts (Feature A) */}
            {critical_followups.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-red-300 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-red-200 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-red-600 animate-pulse" />
                    Critical Diagnostic Panic Alerts ({critical_followups.length})
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                    STAT Attention
                  </span>
                </div>
                <div className="space-y-2.5">
                  {critical_followups.map((cf) => (
                    <div
                      key={cf.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        cf.status === 'Resolved' ? 'bg-emerald-50/70 border-emerald-300' : 'bg-red-50/80 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#251E1A]">
                          {cf.parameter_name}: <strong className="text-red-700">{cf.result_value} {cf.unit}</strong>
                          <span className="text-[10px] text-[#8E8278] font-normal ml-1.5">(Ref: {cf.reference_range})</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cf.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-200 text-red-900'
                        }`}>
                          {cf.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#736860]">{cf.critical_rationale}</p>
                      {cf.action_taken && (
                        <div className="text-[10px] text-emerald-800 font-semibold bg-white/70 p-1.5 rounded-lg border border-black/5">
                          Action: {cf.action_taken} {cf.resolved_by ? `(by ${cf.resolved_by})` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patient History Change Alerts (Feature B) */}
            {change_alerts.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-amber-300 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Medical History Change Alerts ({change_alerts.length})
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Audited Changes
                  </span>
                </div>
                <div className="space-y-2">
                  {change_alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[#251E1A]">{alert.record_type}: <span className="text-[#EC5E27]">{alert.field_name}</span></span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          alert.is_reviewed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200 text-amber-900'
                        }`}>
                          {alert.is_reviewed ? 'Reviewed' : 'Pending Review'}
                        </span>
                      </div>
                      <div className="text-[11px]">
                        <span className="line-through text-red-600 mr-2">{alert.old_value || '(empty)'}</span>
                        <span className="font-semibold text-emerald-700">→ {alert.new_value}</span>
                      </div>
                      <div className="text-[10px] text-[#8E8278]">
                        Changed by {alert.author_name} ({alert.author_role}) • Reason: {alert.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vitals Grid */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#EC5E27] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#EC5E27]" />
                  Latest Recorded Vital Signs
                </h3>
                <span className="text-[11px] text-[#8E8278] font-medium">
                  {latestVitals ? latestVitals.recorded_at.slice(0, 16).replace('T', ' ') : 'No vitals'}
                </span>
              </div>

              {latestVitals ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#FDFDF1]/60 border border-[#E8E4C9]">
                    <div className="flex items-center gap-1.5 text-[#736860] text-xs mb-1 font-medium">
                      <Heart className="w-3.5 h-3.5 text-[#EC5E27]" />
                      Blood Pressure
                    </div>
                    <div className="text-lg font-bold text-[#251E1A]">
                      {latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic} <span className="text-xs font-normal text-[#736860]">mmHg</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FDFDF1]/60 border border-[#E8E4C9]">
                    <div className="flex items-center gap-1.5 text-[#736860] text-xs mb-1 font-medium">
                      <Activity className="w-3.5 h-3.5 text-[#EC5E27]" />
                      Heart Rate
                    </div>
                    <div className="text-lg font-bold text-[#251E1A]">
                      {latestVitals.heart_rate} <span className="text-xs font-normal text-[#736860]">bpm</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FDFDF1]/60 border border-[#E8E4C9]">
                    <div className="flex items-center gap-1.5 text-[#736860] text-xs mb-1 font-medium">
                      <Wind className="w-3.5 h-3.5 text-teal-600" />
                      Oxygen (SpO2)
                    </div>
                    <div className={`text-lg font-bold ${latestVitals.oxygen_saturation_spo2 && latestVitals.oxygen_saturation_spo2 < 90 ? 'text-[#EC5E27]' : 'text-emerald-700'}`}>
                      {latestVitals.oxygen_saturation_spo2}%
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FDFDF1]/60 border border-[#E8E4C9]">
                    <div className="flex items-center gap-1.5 text-[#736860] text-xs mb-1 font-medium">
                      <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                      Temperature
                    </div>
                    <div className="text-lg font-bold text-[#251E1A]">
                      {latestVitals.temperature_f}°F
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FDFDF1]/60 border border-[#E8E4C9]">
                    <div className="flex items-center gap-1.5 text-[#736860] text-xs mb-1 font-medium">
                      <Droplets className="w-3.5 h-3.5 text-[#EC5E27]" />
                      Respiratory Rate
                    </div>
                    <div className="text-lg font-bold text-[#251E1A]">
                      {latestVitals.respiratory_rate} <span className="text-xs font-normal text-[#736860]">/min</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#8E8278] p-4 bg-[#FDFDF1] rounded-xl border border-[#E8E4C9]">No vitals currently recorded.</div>
              )}
            </div>

            {/* Reported Concern & Triage Notes */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#EC5E27]">
                Clinical Concern & Triage Findings
              </h3>
              <div className="p-3.5 bg-[#FDFDF1]/60 rounded-xl border border-[#E8E4C9] text-xs space-y-1">
                <div className="text-[#736860] font-bold">Chief Reported Complaint:</div>
                <div className="text-[#251E1A] font-bold text-sm">{patient.reported_concern || 'None reported'}</div>
              </div>
              <div className="p-3.5 bg-[#FDFDF1]/60 rounded-xl border border-[#E8E4C9] text-xs space-y-1">
                <div className="text-[#736860] font-bold">Triage Officer Clinical Notes:</div>
                <div className="text-[#251E1A]">{patient.triage_notes || 'No preliminary notes recorded.'}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Allergies Alert & Contact */}
          <div className="space-y-6">
            {/* Allergies Box */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#EC5E27] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#EC5E27]" />
                Allergy Warnings
              </h3>
              {allergies.length > 0 ? (
                <div className="space-y-2">
                  {allergies.map((al) => (
                    <div key={al.id} className="p-3 rounded-xl bg-[#FFF7F2] border border-[#EC5E27]/20 text-xs">
                      <div className="font-bold text-[#EC5E27]">{al.allergen}</div>
                      <div className="text-[11px] text-[#251E1A] mt-0.5">Severity: <strong>{al.severity}</strong> • {al.reaction}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200">
                  No known drug or environmental allergies recorded.
                </div>
              )}
            </div>

            {/* Contact & Demographics Summary */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-3 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#EC5E27]">Contact & Address</h3>
              <div className="space-y-2 text-[#736860]">
                <div><strong className="text-[#251E1A]">Phone:</strong> {patient.phone || 'N/A'}</div>
                <div><strong className="text-[#251E1A]">Email:</strong> {patient.email || 'N/A'}</div>
                <div><strong className="text-[#251E1A]">Address:</strong> {patient.address || 'N/A'}</div>
                <div><strong className="text-[#251E1A]">Registration Date:</strong> {patient.registration_date.slice(0, 10)}</div>
              </div>
            </div>

            {/* Clinical Shift Handovers (Feature C) */}
            {handovers.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8E4C9] pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#EC5E27] flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-[#EC5E27]" />
                    Clinical Handovers ({handovers.length})
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {handovers.map((h) => (
                    <div key={h.id} className="p-3 rounded-xl bg-[#FDFDF1]/70 border border-[#E8E4C9] text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#251E1A]">{h.outgoing_staff_name} ({h.outgoing_role})</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          h.status === 'Acknowledged' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {h.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#736860] bg-white p-2 rounded-lg border border-[#E8E4C9]/60">
                        {h.clinical_summary}
                      </p>
                      {h.critical_concerns && (
                        <div className="text-[10px] text-red-700 font-bold">
                          Warning: {h.critical_concerns}
                        </div>
                      )}
                      <div className="text-[10px] text-[#8E8278]">
                        Submitted {h.created_at ? h.created_at.slice(0, 16).replace('T', ' ') : ''}
                        {h.acknowledged_by ? ` • Acknowledged by ${h.acknowledged_by}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MEDICAL TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8E4C9]">
            <div>
              <h3 className="text-sm font-bold text-[#EC5E27]">Unified Chronological Medical Timeline</h3>
              <p className="text-xs text-[#736860]">Immutable event stream of patient admissions, diagnoses, orders, and status transitions</p>
            </div>
            <span className="text-xs font-mono bg-[#FDFDF1] px-2.5 py-1 rounded-full text-[#EC5E27] border border-[#E8E4C9] font-bold">
              {timeline.length} Events Logged
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8E4C9]">
            {timeline.map((evt) => (
              <div key={evt.id} className="relative">
                {/* Node icon */}
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-[#EC5E27] text-[#FFF3EC] flex items-center justify-center text-[10px] ring-4 ring-white">
                  ●
                </div>
                <div className="p-4 rounded-xl bg-[#FDFDF1]/60 border border-[#E8E4C9] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#251E1A]">{evt.title}</span>
                    <span className="text-[11px] text-[#8E8278] font-mono">
                      {evt.timestamp.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <p className="text-[#251E1A]">{evt.description}</p>
                  <div className="text-[10px] text-[#736860] font-semibold pt-1">
                    Actor: {evt.actor} • Event Type: {evt.event_type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LAB REPORTS */}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#E8E4C9] shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-[#EC5E27]">Clinical Laboratory Orders & Results</h3>
              <p className="text-xs text-[#736860]">Diagnostic evaluations, standard reference ranges, and abnormal flags</p>
            </div>
            <button
              onClick={() => setShowOrderModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Order New Lab Test</span>
            </button>
          </div>

          {lab_orders.length > 0 ? (
            <div className="space-y-4">
              {lab_orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl border border-[#E8E4C9] shadow-sm overflow-hidden">
                  <div className="p-4 bg-[#FDFDF1]/80 border-b border-[#E8E4C9] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#EC5E27] text-xs">{order.id}</span>
                        <h4 className="font-bold text-[#251E1A] text-sm">{order.test_name}</h4>
                        <WorkflowBadge status={order.status} />
                      </div>
                      <div className="text-[11px] text-[#736860] mt-0.5">
                        Ordered: {order.order_date.slice(0, 16).replace('T', ' ')} • Ordering Doctor: {order.ordering_doctor}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowResultModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#FFF7F2] hover:bg-[#FFF3EC] text-[#EC5E27] text-xs font-bold transition border border-[#EC5E27]/20"
                    >
                      + Enter Result
                    </button>
                  </div>

                  {order.results.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FDFDF1] text-[#736860] uppercase font-semibold text-[10px] border-b border-[#E8E4C9]">
                          <tr>
                            <th className="py-2.5 px-4">Parameter</th>
                            <th className="py-2.5 px-4">Result</th>
                            <th className="py-2.5 px-4">Unit</th>
                            <th className="py-2.5 px-4">Reference Range</th>
                            <th className="py-2.5 px-4">Flag</th>
                            <th className="py-2.5 px-4">Verified By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E4C9]/40 text-[#251E1A]">
                          {order.results.map((res) => (
                            <tr key={res.id} className="hover:bg-[#FDFDF1]/60">
                              <td className="py-2.5 px-4 font-bold text-[#251E1A]">{res.parameter_name}</td>
                              <td className="py-2.5 px-4 font-bold">{res.result_value}</td>
                              <td className="py-2.5 px-4 text-[#736860]">{res.unit || '-'}</td>
                              <td className="py-2.5 px-4 text-[#736860] font-mono text-[11px]">{res.reference_range || '-'}</td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  res.flag === 'Critical' ? 'bg-[#FFF7F2] text-[#EC5E27] border border-[#EC5E27]/20' :
                                  res.flag === 'High' ? 'bg-amber-100 text-amber-800' :
                                  res.flag === 'Low' ? 'bg-blue-100 text-blue-800' :
                                  'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {res.flag}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-[11px] text-[#736860]">{res.verified_by}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-5 text-center text-xs text-[#8E8278]">
                      No results logged yet for this order. Click "+ Enter Result" to add findings.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-[#E8E4C9] text-center text-xs text-[#8E8278]">
              No laboratory diagnostic tests ordered for this patient yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MEDICATIONS & ALLERGIES */}
      {activeTab === 'meds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Medications Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EC5E27] flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-[#EC5E27]" />
              Active Prescribed Medications ({medications.length})
            </h3>
            {medications.length > 0 ? (
              <div className="space-y-2.5">
                {medications.map((m) => (
                  <div key={m.id} className="p-3.5 bg-[#FDFDF1]/60 rounded-xl border border-[#E8E4C9] text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-[#251E1A]">
                      <span>{m.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FFF7F2] text-[#EC5E27] font-bold border border-[#EC5E27]/20">{m.status}</span>
                    </div>
                    <div className="text-[#736860]">Dosage: <strong>{m.dosage}</strong> • Frequency: {m.frequency}</div>
                    <div className="text-[10px] text-[#8E8278]">Prescribed by {m.prescribed_by} on {m.prescribed_at.slice(0, 10)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#8E8278] p-4 bg-[#FDFDF1] rounded-xl border border-[#E8E4C9]">No active medications prescribed.</div>
            )}
          </div>

          {/* Allergies Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EC5E27] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#EC5E27]" />
              Recorded Patient Allergies ({allergies.length})
            </h3>
            {allergies.length > 0 ? (
              <div className="space-y-2.5">
                {allergies.map((al) => (
                  <div key={al.id} className="p-3.5 bg-[#FFF7F2] rounded-xl border border-[#EC5E27]/20 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-[#EC5E27]">
                      <span>{al.allergen}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#EC5E27] text-[#FFF3EC] font-bold">{al.severity}</span>
                    </div>
                    <div className="text-[#251E1A] text-[11px]">Allergic Manifestation: {al.reaction || 'Unspecified'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-emerald-800 p-4 bg-emerald-50 rounded-xl font-medium border border-emerald-200">
                No recorded drug, food, or environmental allergies.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: VISIT HISTORY */}
      {activeTab === 'visits' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E4C9]">
            <div>
              <h3 className="text-sm font-bold text-[#EC5E27]">Previous Clinical Visits & Encounters</h3>
              <p className="text-xs text-[#736860]">Longitudinal medical encounter history</p>
            </div>
          </div>
          {visits.length > 0 ? (
            <div className="space-y-3">
              {visits.map((v) => (
                <div key={v.id} className="p-4 bg-[#FDFDF1]/60 rounded-xl border border-[#E8E4C9] text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-[#251E1A]">
                    <span>Encounter #{v.id} • {v.department}</span>
                    <span className="text-[11px] text-[#8E8278] font-mono">{v.visit_date.slice(0, 10)}</span>
                  </div>
                  <div className="text-[#736860]">Diagnosis: <strong className="text-[#EC5E27]">{v.diagnosis || 'Undifferentiated'}</strong></div>
                  <p className="text-[#251E1A]">{v.notes}</p>
                  <div className="text-[11px] text-[#8E8278]">Attending: {v.doctor_name} • Outcome: {v.outcome}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[#8E8278] p-6 text-center">First recorded hospital admission. No prior historical encounters found.</div>
          )}
        </div>
      )}

      {/* TAB 6: RECORD ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[#EC5E27]">Record Audit & Access History</h3>
          <p className="text-xs text-[#736860]">Tamper-evident cryptographically chained audit events for patient {patient.patient_id}</p>
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FDFDF1] text-[#736860] uppercase font-semibold text-[10px] border-b border-[#E8E4C9]">
                <tr>
                  <th className="py-3 px-4">Event Time</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4C9]/40 text-[#251E1A]">
                {timeline.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#FDFDF1]/60">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#8E8278]">{evt.timestamp.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2.5 px-4 font-bold text-[#251E1A]">{evt.actor}</td>
                    <td className="py-2.5 px-4 font-mono text-[#EC5E27] font-bold">{evt.event_type}</td>
                    <td className="py-2.5 px-4 text-[#251E1A]">{evt.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: STRUCTURED EXPORT (FHIR) */}
      {activeTab === 'export' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E4C9]">
            <div>
              <h3 className="text-sm font-bold text-[#EC5E27]">HL7 FHIR R4-Inspired Structured JSON Bundle</h3>
              <p className="text-xs text-[#736860]">
                Interoperable healthcare resource bundle containing Patient, Encounter, and Observation resources.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyFHIR}
                className="px-4 py-2 rounded-xl border border-[#E8E4C9] text-[#EC5E27] hover:bg-[#FDFDF1] text-xs font-bold flex items-center gap-1.5 transition"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#EC5E27]" />}
                <span>{isCopied ? 'Copied JSON!' : 'Copy to Clipboard'}</span>
              </button>
              <a
                href={`/api/export/patient/${patient.patient_id}/fhir/download`}
                download
                className="px-4 py-2 rounded-xl bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download FHIR JSON</span>
              </a>
            </div>
          </div>

          <div className="p-3.5 bg-[#FDFDF1] border border-[#E8E4C9] rounded-xl text-xs text-[#EC5E27]">
            <strong>Compliance Disclaimer:</strong> This export utilizes a structured JSON format modeled on HL7 FHIR concepts for academic interoperability. MedTree X does not claim to operate a certified FHIR server.
          </div>

          {/* JSON Syntax Viewer */}
          <div className="bg-[#251E1A] text-[#FFF3EC] p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[500px]">
            <pre>{JSON.stringify(fhirJson, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* TAB 8: MEDICAL RECORD CORRECTIONS & CRYPTOGRAPHIC LINEAGE */}
      {activeTab === 'corrections' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E4C9] pb-3">
              <div>
                <h3 className="text-sm font-black text-[#EC5E27] flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#EC5E27]" />
                  Medical Record Field-Level Corrections & Immutable Lineage (Feature E)
                </h3>
                <p className="text-xs text-[#736860] mt-0.5">
                  To safeguard clinical safety and medicolegal audit integrity, clinical data cannot be silently overwritten.
                  Modifications maintain complete lineage with mandatory reason, doctor approval, and SHA-256 hash chaining.
                </p>
              </div>
            </div>

            {corrections.length > 0 ? (
              <div className="space-y-3.5">
                {corrections.map((corr: any) => (
                  <div
                    key={corr.id}
                    className="p-4 rounded-2xl bg-[#FDFDF1]/70 border border-[#E8E4C9] text-xs space-y-2.5 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E4C9]/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#E8E4C9] text-[#EC5E27]">
                          {corr.id}
                        </span>
                        <span className="font-bold text-[#251E1A]">
                          {corr.record_type} &gt; {corr.field_name}
                        </span>
                        <span className="text-[#8E8278]">
                          by <strong>{corr.author_name}</strong> ({corr.author_role})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                            corr.approval_status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {corr.approval_status}
                        </span>
                        <span className="text-[11px] font-medium text-[#8E8278]">
                          {new Date(corr.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-2.5 bg-white rounded-xl border border-[#E8E4C9] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-red-800 block">Previous Stored Value</span>
                        <p className="line-through text-red-900 font-medium">{corr.previous_value || '(Empty)'}</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-[#E8E4C9] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Corrected New Value</span>
                        <p className="text-emerald-950 font-bold">{corr.new_value}</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-[#E8E4C9] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#EC5E27] block">Mandatory Clinical Rationale</span>
                      <p className="text-[#251E1A] font-medium italic">{corr.reason}</p>
                    </div>

                    {corr.audit_hash && (
                      <div className="flex items-center gap-2 text-[11px] font-mono bg-[#251E1A] text-[#FFF3EC] p-2 rounded-xl overflow-x-auto">
                        <Hash className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-amber-300 font-bold">SHA-256:</span>
                        <span className="truncate">{corr.audit_hash}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-[#8E8278] text-center p-8 bg-[#FDFDF1]/50 rounded-2xl border border-[#E8E4C9]">
                No field-level medical corrections have been recorded for this patient.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Order Lab Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E4C9] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4C9]">
              <h3 className="text-sm font-bold text-[#EC5E27]">Order Clinical Laboratory Test</h3>
              <button onClick={() => setShowOrderModal(false)} className="text-[#8E8278] hover:text-[#251E1A]">✕</button>
            </div>
            <form onSubmit={handleCreateLabOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#736860] font-bold mb-1">Select Test Profile:</label>
                <select
                  value={selectedLabTest}
                  onChange={(e) => setSelectedLabTest(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none focus:border-[#EC5E27]"
                >
                  <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                  <option value="Blood Glucose">Blood Glucose (Fasting / Random)</option>
                  <option value="Lipid Profile">Lipid Profile</option>
                  <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                  <option value="Kidney Function Test (KFT)">Kidney Function Test (KFT)</option>
                  <option value="Thyroid Profile">Thyroid Profile (TSH, T3, T4)</option>
                  <option value="C-Reactive Protein (CRP)">C-Reactive Protein (CRP)</option>
                  <option value="Electrolytes">Electrolytes (Na+, K+, Cl-)</option>
                  <option value="Urinalysis">Urinalysis</option>
                  <option value="HbA1c">HbA1c</option>
                  <option value="Blood Culture">Blood Culture</option>
                  <option value="Hemoglobin">Hemoglobin (Spot)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#736860] font-bold mb-1">Ordering Physician:</label>
                <input
                  type="text"
                  value={orderingDoctor}
                  onChange={(e) => setOrderingDoctor(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none focus:border-[#EC5E27]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E4C9] text-[#736860] hover:bg-[#FDFDF1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOrdering}
                  className="px-5 py-2 rounded-xl bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] font-bold shadow-xs"
                >
                  {isOrdering ? 'Generating Order...' : 'Generate Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Result Modal */}
      {showResultModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E4C9] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4C9]">
              <h3 className="text-sm font-bold text-[#EC5E27]">
                Log Diagnostic Result: {selectedOrder.test_name}
              </h3>
              <button onClick={() => setShowResultModal(false)} className="text-[#8E8278] hover:text-[#251E1A]">✕</button>
            </div>
            <form onSubmit={handleSaveResult} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#736860] font-bold mb-1">Parameter Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hemoglobin, WBC Count, Creatinine"
                  value={paramName}
                  onChange={(e) => setParamName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none focus:border-[#EC5E27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#736860] font-bold mb-1">Result Value:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 13.5, 110, Negative"
                    value={paramVal}
                    onChange={(e) => setParamVal(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none focus:border-[#EC5E27]"
                  />
                </div>
                <div>
                  <label className="block text-[#736860] font-bold mb-1">Unit:</label>
                  <input
                    type="text"
                    placeholder="e.g. g/dL, mg/dL"
                    value={paramUnit}
                    onChange={(e) => setParamUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none focus:border-[#EC5E27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#736860] font-bold mb-1">Normal Reference Range:</label>
                  <input
                    type="text"
                    placeholder="e.g. 12.0 - 17.5"
                    value={paramRange}
                    onChange={(e) => setParamRange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none focus:border-[#EC5E27]"
                  />
                </div>
                <div>
                  <label className="block text-[#736860] font-bold mb-1">Diagnostic Flag:</label>
                  <select
                    value={paramFlag}
                    onChange={(e) => setParamFlag(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none focus:border-[#EC5E27]"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E4C9] text-[#736860] hover:bg-[#FDFDF1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingResult}
                  className="px-5 py-2 rounded-xl bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] font-bold shadow-xs"
                >
                  {isSavingResult ? 'Saving...' : 'Record Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
