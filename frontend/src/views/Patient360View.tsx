import React, { useEffect, useState } from 'react';
import {
  User, Activity, Calendar, Clock, FileText, Download, ShieldAlert,
  AlertTriangle, Stethoscope, Pill, Beaker, CheckCircle2, ChevronRight,
  Heart, Thermometer, Wind, Droplets, Plus, Check,
  ShieldCheck, FileCheck, Hash, Link2, AlertOctagon, ClipboardList
} from 'lucide-react';
import { api } from '../services/api';
import {
  Patient360, Patient, LabOrder, MedicalCorrection,
  PatientHistoryChangeAlert, CriticalFollowUp, ClinicalHandover
} from '../types';
import { PriorityBadge, WorkflowBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

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

  // New Lab Order Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState('Complete Blood Count (CBC)');
  const [orderingDoctor, setOrderingDoctor] = useState('Attending Physician');
  const [isOrdering, setIsOrdering] = useState(false);

  const { user, role, doctorId } = useAuth();

  // New Result Modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [paramName, setParamName] = useState('');
  const [paramVal, setParamVal] = useState('');
  const [paramUnit, setParamUnit] = useState('');
  const [paramRange, setParamRange] = useState('');
  const [paramFlag, setParamFlag] = useState('Normal');
  const [isSavingResult, setIsSavingResult] = useState(false);

  // Feature E: Clinical Correction Modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [corrRecordType, setCorrRecordType] = useState('Diagnosis');
  const [corrFieldName, setCorrFieldName] = useState('diagnosis');
  const [corrPrevValue, setCorrPrevValue] = useState('');
  const [corrNewValue, setCorrNewValue] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [isSubmittingCorr, setIsSubmittingCorr] = useState(false);

  const loadProfile = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getPatient360(id);
      setData(res);
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

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !corrFieldName.trim() || !corrNewValue.trim() || corrReason.trim().length < 5) return;
    try {
      setIsSubmittingCorr(true);
      const author = user?.full_name || 'Dr. Attending Physician';
      const authorRole = role || 'doctor';
      await api.submitCorrection({
        patient_id: data.patient.patient_id,
        record_type: corrRecordType,
        field_name: corrFieldName.trim(),
        previous_value: corrPrevValue.trim(),
        new_value: corrNewValue.trim(),
        reason: corrReason.trim(),
        author_name: author,
        author_role: authorRole,
      });
      setShowCorrectionModal(false);
      setCorrPrevValue('');
      setCorrNewValue('');
      setCorrReason('');
      await loadProfile(data.patient.patient_id);
      alert('Field-level medical correction cryptographically submitted and committed to audit trail.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit correction');
    } finally {
      setIsSubmittingCorr(false);
    }
  };

  const handleApproveCorrection = async (correctionId: string, decision: 'Approved' | 'Rejected') => {
    if (!data) return;
    const docName = user?.full_name || 'Dr. Attending Physician';
    const docId = doctorId || String(user?.id || 'DOC-101');
    try {
      await api.approveCorrection(correctionId, docName, docId, decision);
      await loadProfile(data.patient.patient_id);
      alert(`Correction has been formally ${decision.toLowerCase()} and signed.`);
    } catch (err: any) {
      alert(err.message || 'Failed to process approval');
    }
  };

  if (isLoading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#7F011F] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-[#7F011F]">Loading Patient 360 Longitudinal EHR...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="p-4 bg-[#FAF0F2] border border-[#7F011F]/30 rounded-2xl text-[#7F011F] text-sm font-semibold">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E8DBC0] shadow-sm text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-[#6E5A5E] font-bold">Select Patient Record:</span>
          <select
            value={patient.patient_id}
            onChange={(e) => onSelectPatient(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] font-bold text-[#7F011F] focus:outline-none focus:border-[#7F011F]"
          >
            {allPatients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.patient_id} — {p.full_name} ({p.department}, Priority {p.priority})
              </option>
            ))}
          </select>
        </div>
        <span className="text-[11px] text-[#8C7B7E] font-medium">
          Single Source of Truth • 360° EHR Longitudinal Profile
        </span>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-[#E8DBC0] shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
              {patient.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-[#2A161B]">{patient.full_name}</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#FAF6EC] text-[#7F011F] font-bold border border-[#E8DBC0]">
                  {patient.patient_id}
                </span>
                <PriorityBadge priority={patient.priority} />
                <WorkflowBadge status={patient.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E5A5E] mt-1.5 font-medium">
                <span>{patient.gender}, {patient.age} years</span>
                <span>•</span>
                <span>Blood Group: <strong className="text-[#7F011F]">{patient.blood_group || 'Unknown'}</strong></span>
                <span>•</span>
                <span>Phone: {patient.phone || 'N/A'}</span>
                <span>•</span>
                <span>Govt ID: {patient.govt_id || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Department & Status Badges */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="p-3 bg-[#FAF6EC]/80 rounded-xl border border-[#E8DBC0]">
              <div className="text-[10px] text-[#6E5A5E] uppercase font-bold">Department</div>
              <div className="font-bold text-[#7F011F]">{patient.department}</div>
            </div>
            <div className="p-3 bg-[#FAF6EC]/80 rounded-xl border border-[#E8DBC0]">
              <div className="text-[10px] text-[#6E5A5E] uppercase font-bold">Assigned Bed</div>
              <div className="font-bold text-[#2A161B]">{patient.assigned_bed_id || 'Not Admitted'}</div>
            </div>
            <div className="p-3 bg-[#FAF6EC]/80 rounded-xl border border-[#E8DBC0]">
              <div className="text-[10px] text-[#6E5A5E] uppercase font-bold">Attending Doctor</div>
              <div className="font-bold text-[#2A161B]">{patient.assigned_doctor_id || 'Unassigned'}</div>
            </div>
          </div>
        </div>

        {/* Live Queue Position & Wait Alert (if waiting) */}
        {patient.status === 'Waiting' && queue_position && (
          <div className="p-3.5 bg-[#FAF0F2] border border-[#7F011F]/20 rounded-xl text-xs text-[#7F011F] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7F011F]" />
              <span>
                Currently <strong>#{queue_position}</strong> in waiting queue (Estimated wait: ~{estimated_wait_minutes} min)
              </span>
            </div>
            <span className="font-mono text-[10px] bg-[#7F011F] text-[#F5EBD0] px-2 py-0.5 rounded-full font-bold">
              Min-Heap Ordered
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs (Bold Oval Buttons) */}
      <div className="flex items-center gap-2 border-b border-[#E8DBC0] overflow-x-auto text-xs pb-2">
        {[
          { id: 'overview', label: '1. Overview' },
          { id: 'timeline', label: '2. Medical Timeline' },
          { id: 'labs', label: `3. Lab Reports (${lab_orders.length})` },
          { id: 'meds', label: `4. Medications & Allergies (${allergies.length})` },
          { id: 'activity', label: '5. Record Activity' },
          { id: 'corrections', label: `6. Audit Corrections (${corrections.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-bold transition-all rounded-full whitespace-nowrap shadow-2xs ${
              activeTab === tab.id
                ? 'bg-[#7F011F] text-[#F5EBD0] border border-[#7F011F]'
                : 'bg-white text-[#6E5A5E] border border-[#E8DBC0] hover:text-[#2A161B] hover:bg-[#FAF6EC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Vitals */}
          <div className="md:col-span-2 space-y-6">
            {/* Vitals Grid */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7F011F] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#7F011F]" />
                  Latest Recorded Vital Signs
                </h3>
                <span className="text-[11px] text-[#8C7B7E] font-medium">
                  {latestVitals ? latestVitals.recorded_at.slice(0, 16).replace('T', ' ') : 'No vitals'}
                </span>
              </div>

              {latestVitals ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#FAF6EC]/60 border border-[#E8DBC0]">
                    <div className="flex items-center gap-1.5 text-[#6E5A5E] text-xs mb-1 font-medium">
                      <Heart className="w-3.5 h-3.5 text-[#7F011F]" />
                      Blood Pressure
                    </div>
                    <div className="text-lg font-bold text-[#2A161B]">
                      {latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic} <span className="text-xs font-normal text-[#6E5A5E]">mmHg</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF6EC]/60 border border-[#E8DBC0]">
                    <div className="flex items-center gap-1.5 text-[#6E5A5E] text-xs mb-1 font-medium">
                      <Activity className="w-3.5 h-3.5 text-[#7F011F]" />
                      Heart Rate
                    </div>
                    <div className="text-lg font-bold text-[#2A161B]">
                      {latestVitals.heart_rate} <span className="text-xs font-normal text-[#6E5A5E]">bpm</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF6EC]/60 border border-[#E8DBC0]">
                    <div className="flex items-center gap-1.5 text-[#6E5A5E] text-xs mb-1 font-medium">
                      <Wind className="w-3.5 h-3.5 text-teal-600" />
                      Oxygen (SpO2)
                    </div>
                    <div className={`text-lg font-bold ${latestVitals.oxygen_saturation_spo2 && latestVitals.oxygen_saturation_spo2 < 90 ? 'text-[#7F011F]' : 'text-emerald-700'}`}>
                      {latestVitals.oxygen_saturation_spo2}%
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF6EC]/60 border border-[#E8DBC0]">
                    <div className="flex items-center gap-1.5 text-[#6E5A5E] text-xs mb-1 font-medium">
                      <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                      Temperature
                    </div>
                    <div className="text-lg font-bold text-[#2A161B]">
                      {latestVitals.temperature_f}°F
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF6EC]/60 border border-[#E8DBC0]">
                    <div className="flex items-center gap-1.5 text-[#6E5A5E] text-xs mb-1 font-medium">
                      <Droplets className="w-3.5 h-3.5 text-[#7F011F]" />
                      Respiratory Rate
                    </div>
                    <div className="text-lg font-bold text-[#2A161B]">
                      {latestVitals.respiratory_rate} <span className="text-xs font-normal text-[#6E5A5E]">/min</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#8C7B7E] p-4 bg-[#FAF6EC] rounded-xl border border-[#E8DBC0]">No vitals currently recorded.</div>
              )}
            </div>

            {/* Reported Concern & Triage Notes */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7F011F]">
                Clinical Concern & Triage Findings
              </h3>
              <div className="p-3.5 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] text-xs space-y-1">
                <div className="text-[#6E5A5E] font-bold">Chief Reported Complaint:</div>
                <div className="text-[#2A161B] font-bold text-sm">{patient.reported_concern || 'None reported'}</div>
              </div>
              <div className="p-3.5 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] text-xs space-y-1">
                <div className="text-[#6E5A5E] font-bold">Triage Officer Clinical Notes:</div>
                <div className="text-[#2A161B]">{patient.triage_notes || 'No preliminary notes recorded.'}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Allergies Alert & Contact */}
          <div className="space-y-6">
            {/* Allergies Box */}
            <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7F011F] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#7F011F]" />
                Allergy Warnings
              </h3>
              {allergies.length > 0 ? (
                <div className="space-y-2">
                  {allergies.map((al) => (
                    <div key={al.id} className="p-3 rounded-xl bg-[#FAF0F2] border border-[#7F011F]/20 text-xs">
                      <div className="font-bold text-[#7F011F]">{al.allergen}</div>
                      <div className="text-[11px] text-[#2A161B] mt-0.5">Severity: <strong>{al.severity}</strong> • {al.reaction}</div>
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
            <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-3 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7F011F]">Contact & Address</h3>
              <div className="space-y-2 text-[#6E5A5E]">
                <div><strong className="text-[#2A161B]">Phone:</strong> {patient.phone || 'N/A'}</div>
                <div><strong className="text-[#2A161B]">Email:</strong> {patient.email || 'N/A'}</div>
                <div><strong className="text-[#2A161B]">Address:</strong> {patient.address || 'N/A'}</div>
                <div><strong className="text-[#2A161B]">Registration Date:</strong> {patient.registration_date.slice(0, 10)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEDICAL TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8DBC0]">
            <div>
              <h3 className="text-sm font-bold text-[#7F011F]">Unified Chronological Medical Timeline</h3>
              <p className="text-xs text-[#6E5A5E]">Immutable event stream of patient admissions, diagnoses, orders, and status transitions</p>
            </div>
            <span className="text-xs font-mono bg-[#FAF6EC] px-2.5 py-1 rounded-full text-[#7F011F] border border-[#E8DBC0] font-bold">
              {timeline.length} Events Logged
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8DBC0]">
            {timeline.map((evt) => (
              <div key={evt.id} className="relative">
                {/* Node icon */}
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center text-[10px] ring-4 ring-white">
                  ●
                </div>
                <div className="p-4 rounded-xl bg-[#FAF6EC]/60 border border-[#E8DBC0] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2A161B]">{evt.title}</span>
                    <span className="text-[11px] text-[#8C7B7E] font-mono">
                      {evt.timestamp.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <p className="text-[#2A161B]">{evt.description}</p>
                  <div className="text-[10px] text-[#6E5A5E] font-semibold pt-1">
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
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#E8DBC0] shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-[#7F011F]">Clinical Laboratory Orders & Results</h3>
              <p className="text-xs text-[#6E5A5E]">Diagnostic evaluations, standard reference ranges, and abnormal flags</p>
            </div>
            <button
              onClick={() => setShowOrderModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Order New Lab Test</span>
            </button>
          </div>

          {/* Feature A: Critical Result Follow-ups */}
          {critical_followups.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-red-300 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-red-200 pb-2">
                <AlertOctagon className="w-4 h-4 text-red-600 animate-pulse" />
                <h4 className="text-xs font-black text-red-800">
                  Critical Diagnostic Panic Values ({critical_followups.length})
                </h4>
              </div>
              <div className="space-y-2">
                {critical_followups.map((cf: any) => (
                  <div key={cf.id} className="p-3 rounded-xl bg-red-50/70 border border-red-200 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#2A161B]">
                        {cf.parameter_name}: <strong className="text-red-700">{cf.result_value} {cf.unit}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-[#E8DBC0]">
                        {cf.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#2A161B]">{cf.critical_rationale}</p>
                    {cf.action_taken && (
                      <p className="text-[10px] text-[#6E5A5E] bg-white p-2 rounded-lg border border-[#E8DBC0]">
                        <strong>Clinical Action:</strong> {cf.action_taken}
                      </p>
                    )}
                    {cf.resolution_details && (
                      <p className="text-[10px] text-emerald-800 font-bold">
                        Resolved by {cf.resolved_by}: {cf.resolution_details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lab_orders.length > 0 ? (
            <div className="space-y-4">
              {lab_orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl border border-[#E8DBC0] shadow-sm overflow-hidden">
                  <div className="p-4 bg-[#FAF6EC]/80 border-b border-[#E8DBC0] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#7F011F] text-xs">{order.id}</span>
                        <h4 className="font-bold text-[#2A161B] text-sm">{order.test_name}</h4>
                        <WorkflowBadge status={order.status} />
                      </div>
                      <div className="text-[11px] text-[#6E5A5E] mt-0.5">
                        Ordered: {order.order_date.slice(0, 16).replace('T', ' ')} • Ordering Doctor: {order.ordering_doctor}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowResultModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#FAF0F2] hover:bg-[#F5EBD0] text-[#7F011F] text-xs font-bold transition border border-[#7F011F]/20"
                    >
                      + Enter Result
                    </button>
                  </div>

                  {order.results.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF6EC] text-[#6E5A5E] uppercase font-semibold text-[10px] border-b border-[#E8DBC0]">
                          <tr>
                            <th className="py-2.5 px-4">Parameter</th>
                            <th className="py-2.5 px-4">Result</th>
                            <th className="py-2.5 px-4">Unit</th>
                            <th className="py-2.5 px-4">Reference Range</th>
                            <th className="py-2.5 px-4">Flag</th>
                            <th className="py-2.5 px-4">Verified By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8DBC0]/40 text-[#2A161B]">
                          {order.results.map((res) => (
                            <tr key={res.id} className="hover:bg-[#FAF6EC]/60">
                              <td className="py-2.5 px-4 font-bold text-[#2A161B]">{res.parameter_name}</td>
                              <td className="py-2.5 px-4 font-bold">{res.result_value}</td>
                              <td className="py-2.5 px-4 text-[#6E5A5E]">{res.unit || '-'}</td>
                              <td className="py-2.5 px-4 text-[#6E5A5E] font-mono text-[11px]">{res.reference_range || '-'}</td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  res.flag === 'Critical' ? 'bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20' :
                                  res.flag === 'High' ? 'bg-amber-100 text-amber-800' :
                                  res.flag === 'Low' ? 'bg-blue-100 text-blue-800' :
                                  'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {res.flag}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-[11px] text-[#6E5A5E]">{res.verified_by}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-5 text-center text-xs text-[#8C7B7E]">
                      No results logged yet for this order. Click "+ Enter Result" to add findings.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-[#E8DBC0] text-center text-xs text-[#8C7B7E]">
              No laboratory diagnostic tests ordered for this patient yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MEDICATIONS & ALLERGIES */}
      {activeTab === 'meds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Medications Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7F011F] flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-[#7F011F]" />
              Active Prescribed Medications ({medications.length})
            </h3>
            {medications.length > 0 ? (
              <div className="space-y-2.5">
                {medications.map((m) => (
                  <div key={m.id} className="p-3.5 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-[#2A161B]">
                      <span>{m.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FAF0F2] text-[#7F011F] font-bold border border-[#7F011F]/20">{m.status}</span>
                    </div>
                    <div className="text-[#6E5A5E]">Dosage: <strong>{m.dosage}</strong> • Frequency: {m.frequency}</div>
                    <div className="text-[10px] text-[#8C7B7E]">Prescribed by {m.prescribed_by} on {m.prescribed_at.slice(0, 10)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#8C7B7E] p-4 bg-[#FAF6EC] rounded-xl border border-[#E8DBC0]">No active medications prescribed.</div>
            )}
          </div>

          {/* Allergies Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7F011F] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#7F011F]" />
              Recorded Patient Allergies ({allergies.length})
            </h3>
            {allergies.length > 0 ? (
              <div className="space-y-2.5">
                {allergies.map((al) => (
                  <div key={al.id} className="p-3.5 bg-[#FAF0F2] rounded-xl border border-[#7F011F]/20 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-[#7F011F]">
                      <span>{al.allergen}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#7F011F] text-[#F5EBD0] font-bold">{al.severity}</span>
                    </div>
                    <div className="text-[#2A161B] text-[11px]">Allergic Manifestation: {al.reaction || 'Unspecified'}</div>
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

      {/* TAB 5: RECORD ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[#7F011F]">Record Audit & Access History</h3>
          <p className="text-xs text-[#6E5A5E]">Tamper-evident cryptographically chained audit events for patient {patient.patient_id}</p>
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6EC] text-[#6E5A5E] uppercase font-semibold text-[10px] border-b border-[#E8DBC0]">
                <tr>
                  <th className="py-3 px-4">Event Time</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DBC0]/40 text-[#2A161B]">
                {timeline.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#FAF6EC]/60">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#8C7B7E]">{evt.timestamp.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2.5 px-4 font-bold text-[#2A161B]">{evt.actor}</td>
                    <td className="py-2.5 px-4 font-mono text-[#7F011F] font-bold">{evt.event_type}</td>
                    <td className="py-2.5 px-4 text-[#2A161B]">{evt.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: MEDICAL RECORD CORRECTIONS & CRYPTOGRAPHIC LINEAGE */}
      {activeTab === 'corrections' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DBC0] pb-3">
              <div>
                <h3 className="text-sm font-black text-[#7F011F] flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#7F011F]" />
                  Medical Record Field-Level Corrections & Immutable Lineage (Feature E)
                </h3>
                <p className="text-xs text-[#6E5A5E] mt-0.5">
                  To safeguard clinical safety and medicolegal audit integrity, clinical data cannot be silently overwritten.
                  Modifications maintain complete lineage with mandatory reason, doctor approval, and SHA-256 hash chaining.
                </p>
              </div>
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Clinical Correction</span>
              </button>
            </div>

            {corrections.length > 0 ? (
              <div className="space-y-3.5">
                {corrections.map((corr: any) => (
                  <div
                    key={corr.id}
                    className="p-4 rounded-2xl bg-[#FAF6EC]/70 border border-[#E8DBC0] text-xs space-y-2.5 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DBC0]/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#E8DBC0] text-[#7F011F]">
                          {corr.id}
                        </span>
                        <span className="font-bold text-[#2A161B]">
                          {corr.record_type} &gt; {corr.field_name}
                        </span>
                        <span className="text-[#8C7B7E]">
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
                        <span className="text-[11px] font-medium text-[#8C7B7E]">
                          {new Date(corr.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-2.5 bg-white rounded-xl border border-[#E8DBC0] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-red-800 block">Previous Stored Value</span>
                        <p className="line-through text-red-900 font-medium">{corr.previous_value || '(Empty)'}</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-[#E8DBC0] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Corrected New Value</span>
                        <p className="text-emerald-950 font-bold">{corr.new_value}</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-[#E8DBC0] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#7F011F] block">Mandatory Clinical Rationale</span>
                      <p className="text-[#2A161B] font-medium italic">{corr.reason}</p>
                    </div>

                    {corr.approval_status === 'Pending Approval' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 p-2.5 rounded-xl border border-amber-300">
                        <span className="text-[11px] font-bold text-amber-900">
                          Attending Physician Review Required:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveCorrection(corr.id, 'Approved')}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-full text-[10px] transition shadow-2xs"
                          >
                            Approve & Apply
                          </button>
                          <button
                            onClick={() => handleApproveCorrection(corr.id, 'Rejected')}
                            className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white font-bold rounded-full text-[10px] transition shadow-2xs"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {corr.audit_hash && (
                      <div className="flex items-center gap-2 text-[11px] font-mono bg-[#2A161B] text-[#F5EBD0] p-2 rounded-xl overflow-x-auto">
                        <Hash className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-amber-300 font-bold">SHA-256:</span>
                        <span className="truncate">{corr.audit_hash}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-[#8C7B7E] text-center p-8 bg-[#FAF6EC]/50 rounded-2xl border border-[#E8DBC0]">
                No field-level medical corrections have been recorded for this patient.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Order Lab Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DBC0] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DBC0]">
              <h3 className="text-sm font-bold text-[#7F011F]">Order Clinical Laboratory Test</h3>
              <button onClick={() => setShowOrderModal(false)} className="text-[#8C7B7E] hover:text-[#2A161B]">✕</button>
            </div>
            <form onSubmit={handleCreateLabOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#6E5A5E] font-bold mb-1">Select Test Profile:</label>
                <select
                  value={selectedLabTest}
                  onChange={(e) => setSelectedLabTest(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
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
                <label className="block text-[#6E5A5E] font-bold mb-1">Ordering Physician:</label>
                <input
                  type="text"
                  value={orderingDoctor}
                  onChange={(e) => setOrderingDoctor(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8DBC0] text-[#6E5A5E] hover:bg-[#FAF6EC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOrdering}
                  className="px-5 py-2 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs"
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
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DBC0] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DBC0]">
              <h3 className="text-sm font-bold text-[#7F011F]">
                Log Diagnostic Result: {selectedOrder.test_name}
              </h3>
              <button onClick={() => setShowResultModal(false)} className="text-[#8C7B7E] hover:text-[#2A161B]">✕</button>
            </div>
            <form onSubmit={handleSaveResult} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#6E5A5E] font-bold mb-1">Parameter Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hemoglobin, WBC Count, Creatinine"
                  value={paramName}
                  onChange={(e) => setParamName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#6E5A5E] font-bold mb-1">Result Value:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 13.5, 110, Negative"
                    value={paramVal}
                    onChange={(e) => setParamVal(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                  />
                </div>
                <div>
                  <label className="block text-[#6E5A5E] font-bold mb-1">Unit:</label>
                  <input
                    type="text"
                    placeholder="e.g. g/dL, mg/dL"
                    value={paramUnit}
                    onChange={(e) => setParamUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#6E5A5E] font-bold mb-1">Normal Reference Range:</label>
                  <input
                    type="text"
                    placeholder="e.g. 12.0 - 17.5"
                    value={paramRange}
                    onChange={(e) => setParamRange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                  />
                </div>
                <div>
                  <label className="block text-[#6E5A5E] font-bold mb-1">Diagnostic Flag:</label>
                  <select
                    value={paramFlag}
                    onChange={(e) => setParamFlag(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
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
                  className="px-4 py-2 rounded-xl border border-[#E8DBC0] text-[#6E5A5E] hover:bg-[#FAF6EC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingResult}
                  className="px-5 py-2 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs"
                >
                  {isSavingResult ? 'Saving...' : 'Record Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature E: Submit Field-Level Medical Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E8DBC0] max-w-lg w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E8DBC0] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#7F011F]" />
                <h3 className="text-sm font-black text-[#7F011F]">
                  Submit Field-Level Clinical Correction
                </h3>
              </div>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="p-1 rounded-full hover:bg-[#FAF6EC] text-[#8C7B7E]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#6E5A5E] font-bold mb-1">Record Scope / Category:</label>
                  <select
                    value={corrRecordType}
                    onChange={(e) => setCorrRecordType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none"
                  >
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="VitalSign">Vital Sign</option>
                    <option value="Allergy">Allergy</option>
                    <option value="Demographics">Demographics</option>
                    <option value="ContactInfo">Contact Info</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#6E5A5E] font-bold mb-1">Field Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. diagnosis, blood_group, phone"
                    value={corrFieldName}
                    onChange={(e) => setCorrFieldName(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#6E5A5E] font-bold mb-1">Previous Stored Value:</label>
                <input
                  type="text"
                  placeholder="e.g. Atypical Angina Pectoris"
                  value={corrPrevValue}
                  onChange={(e) => setCorrPrevValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#6E5A5E] font-bold mb-1">Corrected New Value:</label>
                <input
                  type="text"
                  placeholder="e.g. Acute Coronary Syndrome / NSTEMI"
                  value={corrNewValue}
                  onChange={(e) => setCorrNewValue(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#6E5A5E] font-bold mb-1">Mandatory Clinical Rationale (Min 5 chars):</label>
                <textarea
                  rows={3}
                  placeholder="Document clinical justification, repeat lab verification, or patient-confirmed correction..."
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8DBC0]">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8DBC0] text-[#6E5A5E] hover:bg-[#FAF6EC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorr || !corrFieldName || !corrNewValue || corrReason.trim().length < 5}
                  className="px-5 py-2 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingCorr ? 'Signing & Hashing...' : 'Submit Cryptographic Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
