import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Patient, Patient360, Doctor, LabOrder, Visit,
  CriticalFollowUp, PatientHistoryChangeAlert, ClinicalHandover,
  TemporaryQRAccessGrant, QRDoctorVerifyResult,
  NEWS2Score, DrugInteractionResult, TrajectoryAnalysisResult
} from '../types';
import {
  Stethoscope, User, HeartPulse, Pill, FileText, Activity,
  CheckCircle2, ArrowRight, Plus, Send, Clock,
  ShieldCheck, Sparkles, Apple, Search, Check,
  RefreshCw, Eye, AlertOctagon,
  ClipboardList, QrCode, FileCheck, ShieldAlert, Unlock, Lock, History,
  X, TrendingUp
} from 'lucide-react';

interface DoctorDashboardProps {
  onSelectPatient?: (patientId: string) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onSelectPatient }) => {
  const { user, doctorId } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('PT-101');
  const [patient360, setPatient360] = useState<Patient360 | null>(null);
  const [activeDoctor, setActiveDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // REDUCED TO 3 FOCUSED, INTUITIVE CLINICAL TABS
  const [activeTab, setActiveTab] = useState<'assessment' | 'orders' | 'careplan'>('assessment');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // New Intelligent Features States
  const [criticalResults, setCriticalResults] = useState<CriticalFollowUp[]>([]);
  const [changeAlerts, setChangeAlerts] = useState<PatientHistoryChangeAlert[]>([]);
  const [handovers, setHandovers] = useState<ClinicalHandover[]>([]);
  const [qrGrants, setQrGrants] = useState<TemporaryQRAccessGrant[]>([]);
  const [isEvaluatingCritical, setIsEvaluatingCritical] = useState(false);

  // Critical Result Action/Resolve Modal
  const [selectedCritical, setSelectedCritical] = useState<CriticalFollowUp | null>(null);
  const [criticalActionText, setCriticalActionText] = useState('');
  const [criticalModalMode, setCriticalModalMode] = useState<'action' | 'resolve' | 'ack'>('action');
  const [isSubmittingCriticalAction, setIsSubmittingCriticalAction] = useState(false);

  // Handover State
  const [isGeneratingHandover, setIsGeneratingHandover] = useState(false);
  const [handoverSummary, setHandoverSummary] = useState('');
  const [handoverTasks, setHandoverTasks] = useState('["Monitor vitals every 4 hours", "Follow up repeat cardiac troponin panel"]');
  const [handoverConcerns, setHandoverConcerns] = useState('');
  const [handoverContingency, setHandoverContingency] = useState('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  // Correction Modal
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [corrRecordType, setCorrRecordType] = useState('Diagnosis');
  const [corrFieldName, setCorrFieldName] = useState('diagnosis');
  const [corrPrevVal, setCorrPrevVal] = useState('');
  const [corrNewVal, setCorrNewVal] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [isSubmittingCorr, setIsSubmittingCorr] = useState(false);

  // QR Bedside Access Modal
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrDoctorVerifyResult, setQrDoctorVerifyResult] = useState<QRDoctorVerifyResult | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [isVerifyingQR, setIsVerifyingQR] = useState(false);
  const [coveringDocId, setCoveringDocId] = useState('DOC-103');
  const [grantDuration, setGrantDuration] = useState(12);
  const [isGrantingCoverage, setIsGrantingCoverage] = useState(false);

  // Form states
  // 1. Triage Override
  const [overridePriority, setOverridePriority] = useState<number>(1);
  const [triageReason, setTriageReason] = useState('');
  const [isUpdatingTriage, setIsUpdatingTriage] = useState(false);

  // 2. Prescription
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medRoute, setMedRoute] = useState('Oral');
  const [medFrequency, setMedFrequency] = useState('Twice daily (BID)');
  const [medInstructions, setMedInstructions] = useState('');
  const [isPrescribing, setIsPrescribing] = useState(false);
  const [patientNews2, setPatientNews2] = useState<NEWS2Score | null>(null);
  const [patientTrajectory, setPatientTrajectory] = useState<TrajectoryAnalysisResult | null>(null);
  const [ddiResult, setDdiResult] = useState<DrugInteractionResult | null>(null);
  const [isCheckingDdi, setIsCheckingDdi] = useState(false);

  // 3. Lab Order
  const [labTestName, setLabTestName] = useState('Complete Blood Count (CBC)');
  const [labPriority, setLabPriority] = useState('Routine');
  const [isOrderingLab, setIsOrderingLab] = useState(false);

  // 4. Diet Order
  const [dietType, setDietType] = useState('Cardiac');
  const [dietTexture, setDietTexture] = useState('Standard');
  const [dietNPO, setDietNPO] = useState(false);
  const [dietRestrictions, setDietRestrictions] = useState('Peanuts, High Sodium');
  const [isSavingDiet, setIsSavingDiet] = useState(false);

  // 5. Post-Op Plan
  const [procedureName, setProcedureName] = useState('Laparoscopic Appendectomy');
  const [woundInstructions, setWoundInstructions] = useState('Inspect surgical incisions daily. Keep dry for 48 hours.');
  const [mobilityGoal, setMobilityGoal] = useState('Ambulate hallway 3x daily with nursing assistance.');
  const [dischargeCriteria, setDischargeCriteria] = useState('Tolerating regular diet, pain controlled, afebrile.');
  const [isSavingPostOp, setIsSavingPostOp] = useState(false);

  // 6. Clinical Consultation Note
  const [consultNote, setConsultNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const docId = doctorId || user?.doctor_id || 'DOC-101';

  const loadDoctorWorkspace = async () => {
    setIsLoading(true);
    try {
      const [allPts, doctors] = await Promise.all([
        api.getPatients(),
        api.getDoctors(),
      ]);

      const doc = doctors.find((d: Doctor) => d.doctor_id === docId) || doctors[0];
      setActiveDoctor(doc);

      const docPts = allPts.filter(
        (p) => p.assigned_doctor_id === doc?.doctor_id || p.department === doc?.department
      );
      const patientList = docPts.length > 0 ? docPts : allPts;
      setPatients(patientList);

      if (patientList.length > 0 && !selectedPatientId) {
        setSelectedPatientId(patientList[0].patient_id);
      }
    } catch (err) {
      console.error('Failed to load doctor workspace', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatientDetails = async (pid: string) => {
    try {
      const [p360, crits, alerts, hnds, grants, news2, traj] = await Promise.all([
        api.getPatient360(pid),
        api.getCriticalResults({ patient_id: pid }).catch(() => []),
        api.getPatientChangeAlerts(pid).catch(() => []),
        api.getHandovers({ patient_id: pid }).catch(() => []),
        api.getPatientQRGrants(pid).catch(() => []),
        api.getPatientNEWS2(pid).catch(() => null),
        api.getPatientTrajectory(pid).catch(() => null),
      ]);
      setPatient360(p360);
      setCriticalResults(crits);
      setChangeAlerts(alerts);
      setHandovers(hnds);
      setQrGrants(grants);
      setPatientNews2(news2);
      setPatientTrajectory(traj);
      setDdiResult(null);

      if (p360?.patient) {
        setOverridePriority(p360.patient.priority);
        setCorrPrevVal(p360.patient.reported_concern || '');
      }
    } catch (err) {
      console.error('Failed to load patient 360', err);
    }
  };

  const handleOpenQRModal = async (pid: string) => {
    try {
      setIsQRModalOpen(true);
      setQrDoctorVerifyResult(null);
      setQrError(null);
      const res = await api.getQRToken(pid);
      setQrToken(res.qr_token);
      const grants = await api.getPatientQRGrants(pid).catch(() => []);
      setQrGrants(grants);
    } catch (err: any) {
      setQrError(err.message || 'Failed to load QR token');
    }
  };

  const handleVerifyDoctorQR = async () => {
    if (!qrToken) return;
    setIsVerifyingQR(true);
    setQrError(null);
    setQrDoctorVerifyResult(null);
    try {
      const res = await api.verifyDoctorQRAccess({
        qr_token: qrToken,
        username: user?.username || 'dr_smith',
        role: user?.role || 'doctor',
        doctor_id: docId,
      });
      setQrDoctorVerifyResult(res);
    } catch (err: any) {
      setQrError(err.message || 'Access Denied: Clinician not authorized for bedside access');
    } finally {
      setIsVerifyingQR(false);
    }
  };

  const handleGrantCoverage = async () => {
    if (!selectedPatientId || !coveringDocId) return;
    setIsGrantingCoverage(true);
    try {
      await api.grantTemporaryQRAccess({
        patient_id: selectedPatientId,
        covering_doctor_id: coveringDocId,
        granted_by_doctor_id: docId,
        duration_hours: grantDuration,
        access_level: 'Emergency Covering Care',
      });
      const updated = await api.getPatientQRGrants(selectedPatientId);
      setQrGrants(updated);
      alert(`Temporary bedside coverage successfully granted to ${coveringDocId} for ${grantDuration} hours.`);
    } catch (err: any) {
      alert(err.message || 'Failed to delegate temporary access grant');
    } finally {
      setIsGrantingCoverage(false);
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    if (!confirm('Are you sure you want to revoke this temporary covering grant immediately?')) return;
    try {
      await api.revokeTemporaryQRGrant(grantId, activeDoctor?.name || 'Dr. Attending');
      if (selectedPatientId) {
        const updated = await api.getPatientQRGrants(selectedPatientId);
        setQrGrants(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to revoke grant');
    }
  };

  const handleEvaluateCritical = async () => {
    setIsEvaluatingCritical(true);
    try {
      await api.evaluateCriticalResults();
      if (selectedPatientId) {
        const crits = await api.getCriticalResults({ patient_id: selectedPatientId });
        setCriticalResults(crits);
      }
    } catch (err: any) {
      alert(err.message || 'Error evaluating critical rules');
    } finally {
      setIsEvaluatingCritical(false);
    }
  };

  const handleAcknowledgeCritical = async (fu: CriticalFollowUp) => {
    const clinicianName = activeDoctor?.name || user?.full_name || 'Dr. Attending';
    const note = prompt(`Acknowledge critical result for ${fu.parameter_name} (${fu.result_value}): Enter clinical acknowledgement note:`, 'Received STAT. Initiating urgent clinical protocol.');
    if (!note) return;
    try {
      await api.acknowledgeCriticalResult(fu.id, clinicianName, note);
      if (selectedPatientId) {
        const crits = await api.getCriticalResults({ patient_id: selectedPatientId });
        setCriticalResults(crits);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge critical result');
    }
  };

  const handleOpenCriticalActionModal = (fu: CriticalFollowUp, mode: 'action' | 'resolve') => {
    setSelectedCritical(fu);
    setCriticalModalMode(mode);
    setCriticalActionText('');
  };

  const handleSubmitCriticalModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCritical || !criticalActionText) return;
    setIsSubmittingCriticalAction(true);
    const clinicianName = activeDoctor?.name || user?.full_name || 'Dr. Attending';
    try {
      if (criticalModalMode === 'action') {
        await api.recordCriticalAction(selectedCritical.id, criticalActionText, clinicianName);
      } else {
        await api.resolveCriticalResult(selectedCritical.id, criticalActionText, clinicianName);
      }
      setSelectedCritical(null);
      if (selectedPatientId) {
        const crits = await api.getCriticalResults({ patient_id: selectedPatientId });
        setCriticalResults(crits);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit action');
    } finally {
      setIsSubmittingCriticalAction(false);
    }
  };

  const handleReviewChangeAlert = async (alertId: string) => {
    const clinicianName = activeDoctor?.name || user?.full_name || 'Dr. Attending';
    try {
      await api.reviewChangeAlert(alertId, clinicianName);
      if (selectedPatientId) {
        const updated = await api.getPatientChangeAlerts(selectedPatientId);
        setChangeAlerts(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to review alert');
    }
  };

  const handleReviewAllAlerts = async () => {
    if (!selectedPatientId) return;
    const clinicianName = activeDoctor?.name || user?.full_name || 'Dr. Attending';
    try {
      await api.reviewAllPatientAlerts(selectedPatientId, clinicianName);
      const updated = await api.getPatientChangeAlerts(selectedPatientId);
      setChangeAlerts(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to review all alerts');
    }
  };

  const handleSynthesizeHandover = async () => {
    if (!selectedPatientId) return;
    setIsGeneratingHandover(true);
    try {
      const draft = await api.getHandoverSummary(selectedPatientId);
      setHandoverSummary(draft.clinical_summary || '');
      setHandoverConcerns(draft.critical_concerns || '');
      setHandoverContingency(draft.contingency_plans || '');
      if (draft.pending_tasks) {
        setHandoverTasks(JSON.stringify(draft.pending_tasks, null, 2));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to synthesize handover');
    } finally {
      setIsGeneratingHandover(false);
    }
  };

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !handoverSummary) return;
    setIsSubmittingHandover(true);
    const clinicianName = activeDoctor?.name || user?.full_name || 'Dr. Attending';
    try {
      await api.createHandover({
        patient_id: selectedPatientId,
        outgoing_staff_id: docId,
        outgoing_staff_name: clinicianName,
        outgoing_role: 'doctor',
        incoming_role: 'nurse',
        clinical_summary: handoverSummary,
        pending_tasks: handoverTasks,
        critical_concerns: handoverConcerns,
        contingency_plans: handoverContingency,
      });
      alert('Shift handover successfully submitted and logged in cryptographic audit trail.');
      const updated = await api.getHandovers({ patient_id: selectedPatientId });
      setHandovers(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to submit handover');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const handleOpenCorrectionModal = () => {
    setIsCorrectionModalOpen(true);
    setCorrRecordType('Diagnosis');
    setCorrFieldName('diagnosis');
    setCorrPrevVal(selectedPatient?.reported_concern || 'Under Evaluation');
    setCorrNewVal('');
    setCorrReason('');
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !corrNewVal || !corrReason) return;
    setIsSubmittingCorr(true);
    const clinicianName = activeDoctor?.name || user?.full_name || 'Dr. Attending';
    try {
      await api.submitMedicalCorrection({
        patient_id: selectedPatientId,
        record_type: corrRecordType,
        record_id: `REC-${Date.now().toString().slice(-4)}`,
        field_name: corrFieldName,
        previous_value: corrPrevVal,
        new_value: corrNewVal,
        reason: corrReason,
        author_name: clinicianName,
        author_role: 'doctor',
      });
      alert('Medical record correction recorded and verified with SHA-256 hash chaining.');
      setIsCorrectionModalOpen(false);
      loadPatientDetails(selectedPatientId);
    } catch (err: any) {
      alert(err.message || 'Failed to submit correction');
    } finally {
      setIsSubmittingCorr(false);
    }
  };

  useEffect(() => {
    loadDoctorWorkspace();
  }, [docId]);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientDetails(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleTriageOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !triageReason.trim()) return;
    setIsUpdatingTriage(true);
    try {
      await api.updatePatientPriority(
        selectedPatientId,
        Number(overridePriority),
        triageReason,
        activeDoctor?.name || 'Attending Physician'
      );
      await loadPatientDetails(selectedPatientId);
      await loadDoctorWorkspace();
      setTriageReason('');
      alert('Triage priority successfully confirmed and updated.');
    } catch (err: any) {
      alert(err.message || 'Failed to update priority');
    } finally {
      setIsUpdatingTriage(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedPatientId) return;
    try {
      await api.updatePatientStatus(
        selectedPatientId,
        newStatus,
        `Status transitioned to ${newStatus} by attending physician`,
        activeDoctor?.name || 'Attending Physician'
      );
      await loadPatientDetails(selectedPatientId);
      await loadDoctorWorkspace();
    } catch (err: any) {
      alert(err.message || 'Failed to transition status');
    }
  };

  const handlePrescribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !medName.trim() || !medDosage.trim()) return;
    setIsPrescribing(true);
    try {
      const fullMedString = `${medName} ${medDosage} (${medRoute}, ${medFrequency})`;
      await api.updatePatientStatus(
        selectedPatientId,
        patient360?.patient.status || 'In Treatment',
        `Prescribed: ${fullMedString}. ${medInstructions}`,
        activeDoctor?.name || 'Attending Physician'
      );
      await api.generateMARSchedule(selectedPatientId);

      setMedName('');
      setMedDosage('');
      setMedInstructions('');
      await loadPatientDetails(selectedPatientId);
      alert('Medication prescribed successfully and synchronized into nursing MAR schedule.');
    } catch (err: any) {
      alert(err.message || 'Prescription failed');
    } finally {
      setIsPrescribing(false);
    }
  };

  const handleOrderLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setIsOrderingLab(true);
    try {
      await api.orderLabTest(
        selectedPatientId,
        labTestName,
        activeDoctor?.name || 'Attending Physician'
      );
      await loadPatientDetails(selectedPatientId);
      alert(`Diagnostic test ${labTestName} ordered. Notification sent to Laboratory.`);
    } catch (err: any) {
      alert(err.message || 'Failed to order lab');
    } finally {
      setIsOrderingLab(false);
    }
  };

  const handleReleaseLabToPortal = async (orderId: string) => {
    try {
      await api.releaseLabToPatient(
        orderId,
        activeDoctor?.name || 'Attending Physician',
        'Verified and authorized by clinician.'
      );
      await loadPatientDetails(selectedPatientId);
      alert('Lab report validated and immediately released to the Patient Health Portal.');
    } catch (err: any) {
      alert(err.message || 'Failed to release lab result');
    }
  };

  const handleSaveDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setIsSavingDiet(true);
    try {
      await api.createDietOrder({
        patient_id: selectedPatientId,
        diet_type: dietType,
        texture: dietTexture,
        is_npo: dietNPO,
        allergens_restricted: dietRestrictions,
        ordering_clinician: activeDoctor?.name || 'Attending Physician',
        notes: 'Follow clinical ward nutrition guidelines.',
      });
      alert('Clinical diet order submitted and verified against dietary allergen rules.');
    } catch (err: any) {
      alert(err.message || 'Failed to save diet order');
    } finally {
      setIsSavingDiet(false);
    }
  };

  const handleSavePostOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setIsSavingPostOp(true);
    try {
      await api.createPostOpPlan({
        patient_id: selectedPatientId,
        doctor_id: docId,
        procedure_name: procedureName,
        surgery_date: new Date().toISOString().split('T')[0],
        wound_care_instructions: woundInstructions,
        mobility_goal: mobilityGoal,
        target_discharge_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      });
      alert('Post-operative care protocol authorized and synchronized to ward nursing staff.');
    } catch (err: any) {
      alert(err.message || 'Failed to save post-op care plan');
    } finally {
      setIsSavingPostOp(false);
    }
  };

  const handleSaveConsultNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !consultNote.trim()) return;
    setIsSavingNote(true);
    try {
      await api.updatePatientStatus(
        selectedPatientId,
        patient360?.patient.status || 'In Treatment',
        consultNote,
        activeDoctor?.name || 'Attending Physician'
      );
      setConsultNote('');
      await loadPatientDetails(selectedPatientId);
      alert('Physician consultation progress note recorded to patient longitudinal history.');
    } catch (err: any) {
      alert(err.message || 'Failed to record note');
    } finally {
      setIsSavingNote(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patient_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      filterPriority === 'all' || p.priority.toString() === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const selectedPatient = patient360?.patient || patients.find((p) => p.patient_id === selectedPatientId);
  const allergyList: string[] = patient360?.allergies?.map((a) => a.allergen) || [];

  return (
    <div className="min-h-screen bg-[#FDFDF1] text-[#251E1A] selection:bg-[#EC5E27] selection:text-[#FFF3EC]">
      {/* Contained Clinical Cockpit Header Card */}
      <div className="max-w-7xl mx-auto px-6 pt-5">
        <div className="bg-white rounded-3xl border border-[#E8E4C9] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#EC5E27] text-[#FFF3EC] flex items-center justify-center font-bold shadow-xs shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-black text-[#EC5E27] tracking-tight">
                  {activeDoctor?.name || user?.full_name || 'Dr. Alexander Smith, MD'}
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFF3EC] text-[#EC5E27] border border-[#E8E4C9]">
                  {activeDoctor?.department || 'Cardiology & Emergency'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  ● On Duty
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#736860] mt-0.5">
                Physician ID: <span className="font-mono font-bold text-[#EC5E27]">{docId}</span> • Real-Time Clinical Cockpit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs shrink-0">
            <div className="bg-[#FDFDF1] px-3.5 py-1.5 rounded-full border border-[#E8E4C9] font-semibold text-[#736860] shadow-2xs flex items-center gap-1.5">
              <span>Assigned:</span>
              <span className="font-black text-[#EC5E27] text-xs">{patients.length}</span>
            </div>
            <div className="bg-[#FDFDF1] px-3.5 py-1.5 rounded-full border border-[#E8E4C9] font-semibold text-[#736860] shadow-2xs flex items-center gap-1.5">
              <span>Critical (P1):</span>
              <span className="font-black text-[#EC5E27] text-xs">
                {patients.filter((p) => p.priority === 1).length}
              </span>
            </div>
            <button
              onClick={() => {
                loadDoctorWorkspace();
                if (selectedPatientId) loadPatientDetails(selectedPatientId);
              }}
              className="p-2 rounded-full border border-[#E8E4C9] hover:bg-[#FFF3EC] text-[#EC5E27] transition-all shadow-2xs hover:rotate-180 duration-300"
              title="Refresh Roster"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split Workspace */}
      <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Patient Roster (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-[#E8E4C9] p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#EC5E27] flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#EC5E27]" />
                Patient Roster
              </h2>
              <span className="text-[11px] bg-[#FFF3EC] text-[#EC5E27] font-bold px-2.5 py-0.5 rounded-full border border-[#E8E4C9]">
                {filteredPatients.length} Active
              </span>
            </div>

            {/* Search and Priority Pills */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8E8278] absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-full border border-[#E8E4C9] bg-[#FDFDF1] focus:outline-none focus:border-[#EC5E27] text-[#251E1A]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {['all', '1', '2', '3'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`flex-1 py-1 px-2 rounded-full border text-center text-[11px] font-bold transition-all shadow-2xs ${
                      filterPriority === p
                        ? 'bg-[#EC5E27] text-[#FFF3EC] border-[#EC5E27]'
                        : 'bg-[#FDFDF1] text-[#736860] border-[#E8E4C9] hover:bg-[#FFF3EC]'
                    }`}
                  >
                    {p === 'all' ? 'All' : `P${p}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Cards List */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredPatients.map((pt) => {
                const isSelected = pt.patient_id === selectedPatientId;
                const isP1 = pt.priority === 1;
                const isP2 = pt.priority === 2;

                return (
                  <div
                    key={pt.patient_id}
                    onClick={() => {
                      setSelectedPatientId(pt.patient_id);
                      if (onSelectPatient) onSelectPatient(pt.patient_id);
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#FBF9EA] border-[#EC5E27] shadow-xs ring-1 ring-[#EC5E27]'
                        : 'bg-white border-[#E8E4C9] hover:border-[#EC5E27]/50 hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-[#251E1A] truncate">
                            {pt.full_name}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-[#EC5E27]">
                            {pt.patient_id}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-[#736860] truncate mt-0.5">
                          {pt.age}y • {pt.gender} • {pt.department}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isP1
                              ? 'bg-[#EC5E27] text-[#FFF3EC]'
                              : isP2
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          P{pt.priority} {isP1 ? 'Critical' : isP2 ? 'Urgent' : 'Normal'}
                        </span>
                        <span className="text-[9px] font-bold text-[#736860] bg-[#FDFDF1] px-2 py-0.2 rounded-full border border-[#E8E4C9]">
                          {pt.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredPatients.length === 0 && (
                <div className="p-6 text-center text-xs font-semibold text-[#8E8278]">
                  No patients matching filter.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Patient Clinical Cockpit (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedPatient ? (
            <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3.5">
              {/* Row 1: Patient Identity, Status Dropdown, and Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E4C9]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-[#EC5E27] tracking-tight">
                      {selectedPatient.full_name}
                    </h2>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-[#EC5E27]">
                      {selectedPatient.patient_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-3 py-0.5 rounded-full shadow-2xs ${
                        selectedPatient.priority === 1
                          ? 'bg-[#EC5E27] text-[#FFF3EC]'
                          : selectedPatient.priority === 2
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      Priority {selectedPatient.priority} — {selectedPatient.priority === 1 ? 'Critical' : selectedPatient.priority === 2 ? 'Urgent' : 'Normal'}
                    </span>
                    {patientNews2 && (
                      <span
                        className={`text-[10px] font-bold px-3 py-0.5 rounded-full shadow-2xs border ${
                          patientNews2.urgency === 'EMERGENCY_RAPID_RESPONSE'
                            ? 'bg-rose-100 text-rose-900 border-rose-400 animate-pulse'
                            : patientNews2.urgency === 'URGENT_CLINICAL_REVIEW'
                            ? 'bg-amber-100 text-amber-900 border-amber-400'
                            : 'bg-teal-50 text-teal-800 border-teal-300'
                        }`}
                      >
                        NEWS2: {patientNews2.total_score} ({patientNews2.risk_level})
                      </span>
                    )}
                    {patientTrajectory && patientTrajectory.datapoints_analyzed >= 2 && (
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${
                          patientTrajectory.acceleration_alert
                            ? 'bg-rose-100 text-rose-900 border-rose-400 font-extrabold animate-pulse'
                            : patientTrajectory.score_velocity_per_hour > 0
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        }`}
                        title={`Physiological Velocity: ${patientTrajectory.score_velocity_per_hour > 0 ? '+' : ''}${patientTrajectory.score_velocity_per_hour} pt/h (${patientTrajectory.trajectory_label}). Status: ${patientTrajectory.trajectory_status}`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        Velocity: {patientTrajectory.score_velocity_per_hour > 0 ? `+${patientTrajectory.score_velocity_per_hour}` : patientTrajectory.score_velocity_per_hour} pt/h
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[#736860] mt-0.5">
                    {selectedPatient.age}y • {selectedPatient.gender} • Blood: <strong className="text-[#251E1A]">{selectedPatient.blood_group || 'O+'}</strong> • Dept: <strong className="text-[#251E1A]">{selectedPatient.department}</strong>
                  </p>
                </div>

                {/* Status Selector + Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#FDFDF1] px-3 py-1 rounded-full border border-[#E8E4C9]">
                    <span className="text-[11px] font-bold text-[#EC5E27]">Status:</span>
                    <select
                      value={selectedPatient.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="bg-transparent text-xs font-bold text-[#251E1A] focus:outline-none cursor-pointer"
                    >
                      {['Waiting', 'In Consultation', 'Under Treatment', 'Observation', 'Discharged'].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleOpenQRModal(selectedPatient.patient_id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-xs font-bold text-[#EC5E27] hover:bg-[#EC5E27] hover:text-[#FFF3EC] transition shadow-2xs"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Bedside QR
                  </button>

                  <button
                    onClick={handleOpenCorrectionModal}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-xs font-bold text-[#EC5E27] hover:bg-[#EC5E27] hover:text-[#FFF3EC] transition shadow-2xs"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    Correction
                  </button>
                </div>
              </div>

              {/* Unified Clinical Summary Strip (Clean 4-column overview) */}
              <div className="bg-[#FDFDF1]/80 border border-[#E8E4C9] rounded-2xl p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#EC5E27]">Chief Complaint</span>
                  <p className="font-bold text-[#251E1A] mt-0.5 truncate" title={selectedPatient.reported_concern || 'Under Evaluation'}>
                    {selectedPatient.reported_concern || 'Under Evaluation'}
                  </p>
                </div>
                <div className="border-l border-[#E8E4C9] pl-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#EC5E27]">Assigned Bed</span>
                  <p className="font-bold text-[#251E1A] mt-0.5">
                    {selectedPatient.assigned_bed_id || 'Not Assigned'}
                  </p>
                </div>
                <div className="border-l border-[#E8E4C9] pl-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#EC5E27]">Known Allergies</span>
                  <p className={`font-bold mt-0.5 truncate ${allergyList.length ? 'text-[#EC5E27]' : 'text-emerald-800'}`}>
                    {allergyList.length ? allergyList.join(', ') : 'None'}
                  </p>
                </div>
                <div className="border-l border-[#E8E4C9] pl-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#EC5E27]">Registered On</span>
                  <p className="font-mono font-bold text-[#251E1A] mt-0.5">
                    {selectedPatient.registration_date ? new Date(selectedPatient.registration_date).toLocaleDateString() : 'Today'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E8E4C9] p-6 text-center text-xs font-bold text-[#8E8278]">
              Select a patient from the roster to view and manage clinical records.
            </div>
          )}

          {/* EXACTLY 3 FOCUSED CLINICAL TABS (Clean, Non-Overlapping, Oval Styling) */}
          <div className="flex items-center gap-2 border-b border-[#E8E4C9] pb-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('assessment')}
              className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-2xs ${
                activeTab === 'assessment'
                  ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-xs'
                  : 'bg-white text-[#736860] border border-[#E8E4C9] hover:bg-[#FDFDF1] hover:text-[#251E1A]'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              Assessment & Triage
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-2xs ${
                activeTab === 'orders'
                  ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-xs'
                  : 'bg-white text-[#736860] border border-[#E8E4C9] hover:bg-[#FDFDF1] hover:text-[#251E1A]'
              }`}
            >
              <Pill className="w-4 h-4" />
              Orders & Lab Alerts
              {criticalResults.filter(c => c.status === 'Awaiting Acknowledgement').length > 0 && (
                <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-red-600 text-white animate-pulse">
                  {criticalResults.filter(c => c.status === 'Awaiting Acknowledgement').length} STAT
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('careplan')}
              className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-2xs ${
                activeTab === 'careplan'
                  ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-xs'
                  : 'bg-white text-[#736860] border border-[#E8E4C9] hover:bg-[#FDFDF1] hover:text-[#251E1A]'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Care Plan & Handover
            </button>
          </div>

          {/* TAB 1: ASSESSMENT, TRIAGE & CDS */}
          {activeTab === 'assessment' && (
            <div className="space-y-4">
              {/* Triage Priority Override Box */}
              <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E4C9] pb-2.5">
                  <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#EC5E27]" />
                    Clinician Triage Priority Override (Min-Heap Priority Queue)
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-[#EC5E27]">
                    Current Priority: <strong>Level {selectedPatient?.priority}</strong>
                  </span>
                </div>

                <form onSubmit={handleTriageOverride} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { p: 1, title: 'P1: Critical', desc: 'Resuscitation / Immediate life threat', color: 'text-[#EC5E27] bg-[#FFF7F2] border-[#EC5E27]/30' },
                      { p: 2, title: 'P2: Urgent', desc: 'Severe distress / High acuity', color: 'text-amber-900 bg-amber-50 border-amber-300' },
                      { p: 3, title: 'P3: Normal', desc: 'Stable / Standard consultation', color: 'text-emerald-900 bg-emerald-50 border-emerald-300' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.p}
                        onClick={() => setOverridePriority(item.p)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          overridePriority === item.p
                            ? 'bg-[#FBF9EA] border-[#EC5E27] ring-1 ring-[#EC5E27]'
                            : 'bg-[#FDFDF1]/80 border-[#E8E4C9] hover:bg-[#FFF3EC]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${item.color}`}>
                            {item.title}
                          </span>
                          {overridePriority === item.p && (
                            <Check className="w-3.5 h-3.5 text-[#EC5E27]" />
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-[#736860] mt-1.5 leading-snug">{item.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Enter clinical urgency rationale (logged to immutable audit trail)..."
                      value={triageReason}
                      onChange={(e) => setTriageReason(e.target.value)}
                      required
                      className="flex-1 px-4 py-2 text-xs font-semibold rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none focus:border-[#EC5E27]"
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingTriage || !triageReason.trim()}
                      className="px-5 py-2 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] disabled:opacity-50 transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>{isUpdatingTriage ? 'Updating...' : 'Confirm Priority'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Explainable CDS Rules Engine */}
              <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8E4C9] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#EC5E27]" />
                    <h3 className="text-xs font-black text-[#EC5E27]">
                      Explainable Clinical Decision Support (CDS) Rules
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#EC5E27] bg-[#FFF7F2] px-2.5 py-0.5 rounded-full border border-[#EC5E27]/20">
                    Rule-Based Intelligence
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-[#FBF9EA] border border-[#E8E4C9] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#EC5E27]" />
                      <span className="font-bold text-[#EC5E27]">Cardiovascular / ACS Alert</span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#251E1A]">
                      Symptoms match acute ischemia signs. Order stat Troponin-I panel, ECG, and continuous telemetry monitoring.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-[#E8E4C9] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                      <span className="font-bold text-[#251E1A]">Allergy Guard</span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#736860]">
                      Profile cross-referenced against medications & nutrition. Active allergies: <strong className="text-[#EC5E27]">{allergyList.length ? allergyList.join(', ') : 'None'}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Consultation Notes & History */}
              <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2.5">
                  <FileText className="w-4 h-4 text-[#EC5E27]" />
                  Consultation Notes & Encounters
                </h3>

                <form onSubmit={handleSaveConsultNote} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Enter clinical examination notes, differential diagnosis, patient response..."
                    value={consultNote}
                    onChange={(e) => setConsultNote(e.target.value)}
                    required
                    className="w-full p-3 text-xs font-semibold rounded-2xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none focus:border-[#EC5E27]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingNote || !consultNote.trim()}
                      className="px-4 py-1.5 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] disabled:opacity-50 transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSavingNote ? 'Saving...' : 'Add Progress Note'}</span>
                    </button>
                  </div>
                </form>

                {patient360?.visits && patient360.visits.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E8E4C9]">
                    <span className="text-[10px] font-black uppercase text-[#8E8278] block">Previous Notes:</span>
                    {patient360.visits.map((c: Visit, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-[#FDFDF1]/60 border border-[#E8E4C9] text-xs">
                        <div className="flex justify-between items-center text-[10px] text-[#8E8278] mb-1">
                          <span className="font-bold text-[#EC5E27]">{c.doctor_name || 'Attending Physician'}</span>
                          <span>{new Date(c.visit_date).toLocaleString()}</span>
                        </div>
                        <p className="text-[#251E1A] font-medium">{c.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS, MAR & LAB ALERTS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Critical Lab Panic Value Banner (Feature A) */}
              {criticalResults.length > 0 && (
                <div className="bg-white rounded-3xl border border-red-300 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-red-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-red-600 animate-pulse" />
                      <h3 className="text-xs font-black text-red-800">
                        Critical Diagnostic Panic Values ({criticalResults.length})
                      </h3>
                    </div>
                    <button
                      onClick={handleEvaluateCritical}
                      disabled={isEvaluatingCritical}
                      className="px-3 py-1 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-[11px] font-bold text-[#EC5E27] hover:bg-[#EC5E27] hover:text-[#FFF3EC] transition"
                    >
                      {isEvaluatingCritical ? 'Evaluating...' : 'Refresh Rules'}
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {criticalResults.map((fu) => (
                      <div
                        key={fu.id}
                        className={`p-3 rounded-2xl border text-xs space-y-2 ${
                          fu.status === 'Awaiting Acknowledgement'
                            ? 'bg-red-50/80 border-red-300'
                            : fu.status === 'Acknowledged'
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-emerald-50/80 border-emerald-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-[#251E1A]">
                              {fu.parameter_name}: <strong className="text-red-700">{fu.result_value} {fu.unit}</strong>
                            </span>
                            <span className="text-[10px] text-[#8E8278]">(Ref: {fu.reference_range})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-white border border-[#E8E4C9]">
                              {fu.status}
                            </span>
                            {fu.deadline && fu.status !== 'Resolved' && (
                              <span className="text-[10px] font-bold text-red-800 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Deadline: {new Date(fu.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] font-semibold text-[#251E1A]">
                          {fu.critical_rationale}
                        </p>

                        <div className="flex items-center gap-2 pt-1 border-t border-black/5">
                          {fu.status === 'Awaiting Acknowledgement' && (
                            <button
                              onClick={() => handleAcknowledgeCritical(fu)}
                              className="px-3 py-1 rounded-full bg-red-700 text-white text-[11px] font-bold hover:bg-red-800 transition"
                            >
                              Acknowledge STAT
                            </button>
                          )}
                          {fu.status !== 'Resolved' && (
                            <button
                              onClick={() => handleOpenCriticalActionModal(fu, 'action')}
                              className="px-3 py-1 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-[11px] font-bold text-[#EC5E27] hover:bg-[#EC5E27] hover:text-[#FFF3EC] transition"
                            >
                              Document Action
                            </button>
                          )}
                          {fu.status !== 'Resolved' && (
                            <button
                              onClick={() => handleOpenCriticalActionModal(fu, 'resolve')}
                              className="px-3 py-1 rounded-full bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 transition"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patient History Change Alerts (Feature B) */}
              {changeAlerts.length > 0 && (
                <div className="bg-white rounded-3xl border border-amber-300 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-amber-600" />
                      <h3 className="text-xs font-black text-amber-900">
                        Patient History Change Alerts ({changeAlerts.length})
                      </h3>
                    </div>
                    {changeAlerts.some((a) => !a.is_reviewed) && (
                      <button
                        onClick={handleReviewAllAlerts}
                        className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-[11px] font-bold text-amber-900 hover:bg-amber-200 transition"
                      >
                        Review All Alerts
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {changeAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                          alert.is_reviewed ? 'bg-gray-50/80 border-gray-200 opacity-75' : 'bg-amber-50/80 border-amber-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 font-bold text-[#251E1A]">
                            <span>{alert.record_type}: <span className="text-[#EC5E27]">{alert.field_name}</span></span>
                            {alert.is_reviewed ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Reviewed</span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">Unreviewed</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#736860] mt-0.5">
                            <span className="line-through text-red-600 mr-1.5">{alert.old_value || '(empty)'}</span>
                            <span className="font-semibold text-emerald-700">→ {alert.new_value}</span>
                          </div>
                          <div className="text-[10px] text-[#8E8278] mt-0.5">
                            Modified by {alert.author_name} ({alert.author_role}) • Reason: {alert.reason}
                          </div>
                        </div>

                        {!alert.is_reviewed && (
                          <button
                            onClick={() => handleReviewChangeAlert(alert.id)}
                            className="px-3 py-1 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-[10px] font-bold hover:bg-[#D54813] transition whitespace-nowrap"
                          >
                            Sign Off
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2-Column Split: Prescriptions (Left) & Lab Orders (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prescribe Medications */}
                <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                  <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                    <Pill className="w-4 h-4 text-[#EC5E27]" />
                    Prescribe Medication
                  </h3>

                  <form onSubmit={handlePrescribe} className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-[#736860]">Medication Name:</label>
                        {medName.trim() && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedPatientId || !medName.trim()) return;
                              setIsCheckingDdi(true);
                              try {
                                const res = await api.checkPatientDrugInteractions(selectedPatientId, medName.trim());
                                setDdiResult(res);
                              } catch (err) {
                                console.error('Failed to verify DDI', err);
                              } finally {
                                setIsCheckingDdi(false);
                              }
                            }}
                            disabled={isCheckingDdi}
                            className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            {isCheckingDdi ? 'Checking Safety...' : 'Audit DDI Safety'}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Atorvastatin, Metoprolol"
                        value={medName}
                        onChange={(e) => {
                          setMedName(e.target.value);
                          if (ddiResult) setDdiResult(null);
                        }}
                        required
                        className="w-full px-3 py-1.5 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                      />

                      {/* Real-time DDI Audit Result Pill */}
                      {ddiResult && (
                        <div
                          className={`mt-1.5 p-2 rounded-xl text-[11px] border leading-tight ${
                            ddiResult.safety_status === 'CRITICAL_BLOCKED'
                              ? 'bg-rose-50 border-rose-300 text-rose-800'
                              : ddiResult.safety_status === 'WARNING_REQUIRES_OVERRIDE'
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1">
                            {ddiResult.safety_status === 'CRITICAL_BLOCKED' ? (
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                            {ddiResult.safety_label}
                          </div>
                          {ddiResult.conflicts.length > 0 && (
                            <div className="mt-1 text-[10px] text-slate-600">
                              {ddiResult.conflicts[0].mechanism} ({ddiResult.conflicts[0].clinical_recommendation})
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[#736860] mb-1">Dosage:</label>
                        <input
                          type="text"
                          placeholder="e.g. 40 mg"
                          value={medDosage}
                          onChange={(e) => setMedDosage(e.target.value)}
                          required
                          className="w-full px-3 py-1.5 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#736860] mb-1">Route:</label>
                        <select
                          value={medRoute}
                          onChange={(e) => setMedRoute(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                        >
                          <option value="Oral">Oral (PO)</option>
                          <option value="Intravenous">Intravenous (IV)</option>
                          <option value="Subcutaneous">Subcutaneous (SubQ)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#736860] mb-1">Frequency:</label>
                      <select
                        value={medFrequency}
                        onChange={(e) => setMedFrequency(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                      >
                        <option value="Once daily (OD)">Once daily (OD - 08:00)</option>
                        <option value="Twice daily (BID)">Twice daily (BID - 08:00, 20:00)</option>
                        <option value="Three times daily (TID)">Three times daily (TID)</option>
                        <option value="As needed (PRN)">As needed (PRN)</option>
                      </select>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isPrescribing || !medName.trim() || !medDosage.trim()}
                        className="px-4 py-1.5 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] disabled:opacity-50 transition flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isPrescribing ? 'Prescribing...' : 'Prescribe & Sync MAR'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Active Meds List */}
                  {patient360?.medications && patient360.medications.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[#E8E4C9]">
                      <span className="text-[10px] font-black uppercase text-[#8E8278] block">Active Medications:</span>
                      {patient360.medications.map((m, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-[#FDFDF1]/70 border border-[#E8E4C9] flex justify-between items-center text-xs">
                          <span className="font-bold text-[#251E1A]">{m.name} {m.dosage}</span>
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.2 rounded-full">Active</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Diagnostic Lab Orders */}
                <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                  <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                    <Activity className="w-4 h-4 text-[#EC5E27]" />
                    Order Diagnostic Laboratory Panel
                  </h3>

                  <form onSubmit={handleOrderLab} className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-[#736860] mb-1">Select Test:</label>
                      <select
                        value={labTestName}
                        onChange={(e) => setLabTestName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                      >
                        <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                        <option value="Troponin-I (High Sensitivity)">Troponin-I (High Sensitivity)</option>
                        <option value="Basic Metabolic Panel (BMP)">Basic Metabolic Panel (BMP)</option>
                        <option value="12-Lead Electrocardiogram (ECG)">12-Lead Electrocardiogram (ECG)</option>
                        <option value="Chest X-Ray (AP View)">Chest X-Ray (AP View)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#736860] mb-1">Acuity Priority:</label>
                      <select
                        value={labPriority}
                        onChange={(e) => setLabPriority(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                      >
                        <option value="Routine">Routine</option>
                        <option value="Urgent">Urgent</option>
                        <option value="STAT">STAT / Emergency</option>
                      </select>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isOrderingLab}
                        className="px-4 py-1.5 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] disabled:opacity-50 transition flex items-center gap-1 shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isOrderingLab ? 'Ordering...' : 'Order Requisition'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Recent Lab Orders List */}
                  {patient360?.lab_orders && patient360.lab_orders.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#E8E4C9] max-h-56 overflow-y-auto pr-1">
                      <span className="text-[10px] font-black uppercase text-[#8E8278] block">Recent Lab Results:</span>
                      {patient360.lab_orders.map((o: LabOrder) => (
                        <div key={o.id} className="p-2.5 rounded-xl bg-[#FDFDF1]/70 border border-[#E8E4C9] text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[#251E1A]">{o.test_name}</span>
                            <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded-full border">{o.status}</span>
                          </div>
                          {o.results && o.results.length > 0 && (
                            <p className="text-[11px] text-[#EC5E27] font-bold">
                              {o.results[0].parameter_name}: {o.results[0].result_value} {o.results[0].unit}
                            </p>
                          )}
                          {!o.is_released_to_patient && o.status === 'Completed' && (
                            <button
                              onClick={() => handleReleaseLabToPortal(o.id)}
                              className="text-[10px] text-[#EC5E27] font-bold underline hover:text-[#D54813]"
                            >
                              Release to Patient Portal
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CARE PLAN, NUTRITION & SBAR HANDOVER */}
          {activeTab === 'careplan' && (
            <div className="space-y-4">
              {/* SBAR Shift Handover Synthesizer (Feature C) */}
              <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E4C9] pb-2.5">
                  <div>
                    <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-[#EC5E27]" />
                      Intelligent Doctor–Nurse Shift Handover
                    </h3>
                    <p className="text-[11px] text-[#736860]">
                      Auto-synthesizes vital trends, MAR regimens, and escalation thresholds for incoming ward staff.
                    </p>
                  </div>
                  <button
                    onClick={handleSynthesizeHandover}
                    disabled={isGeneratingHandover}
                    className="px-3.5 py-1.5 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-xs font-bold text-[#EC5E27] hover:bg-[#EC5E27] hover:text-[#FFF3EC] transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingHandover ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingHandover ? 'Synthesizing...' : 'Synthesize Handover'}</span>
                  </button>
                </div>

                <form onSubmit={handleSubmitHandover} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-[#EC5E27] mb-1">
                      Clinical Summary:
                    </label>
                    <textarea
                      value={handoverSummary}
                      onChange={(e) => setHandoverSummary(e.target.value)}
                      rows={2}
                      placeholder="Click 'Synthesize Handover' to auto-generate baseline summary from current vitals and orders..."
                      className="w-full p-2.5 rounded-xl bg-[#FDFDF1]/60 border border-[#E8E4C9] text-[#251E1A] font-medium outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#EC5E27] mb-1">Critical Concerns:</label>
                      <input
                        type="text"
                        value={handoverConcerns}
                        onChange={(e) => setHandoverConcerns(e.target.value)}
                        placeholder="e.g. Elevated cardiac biomarker, pending stat troponin"
                        className="w-full p-2 rounded-full bg-[#FDFDF1]/60 border border-[#E8E4C9] text-xs font-semibold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#EC5E27] mb-1">Contingency Plan:</label>
                      <input
                        type="text"
                        value={handoverContingency}
                        onChange={(e) => setHandoverContingency(e.target.value)}
                        placeholder="e.g. If SBP < 90 mmHg, notify attending immediately"
                        className="w-full p-2 rounded-full bg-[#FDFDF1]/60 border border-[#E8E4C9] text-xs font-semibold outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSubmittingHandover || !handoverSummary}
                      className="px-5 py-2 rounded-full bg-[#EC5E27] text-[#FFF3EC] font-bold text-xs hover:bg-[#D54813] disabled:opacity-50 transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingHandover ? 'Submitting...' : 'Sign & Submit Handover'}</span>
                    </button>
                  </div>
                </form>

                {/* Handover History List */}
                {handovers.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E8E4C9]">
                    <span className="text-[10px] font-black uppercase text-[#8E8278] block">Handover Log & Acknowledgement:</span>
                    {handovers.slice(0, 3).map((h) => (
                      <div key={h.id} className="p-2.5 rounded-xl bg-[#FDFDF1]/60 border border-[#E8E4C9] text-xs space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-[#EC5E27]">{h.outgoing_staff_name} ({h.outgoing_role})</span>
                          <span className={`px-2 py-0.2 rounded-full font-bold ${h.status === 'Acknowledged' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                            {h.status}
                          </span>
                        </div>
                        <p className="text-[#251E1A] text-[11px]">{h.clinical_summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diet & Post-Op Recovery Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Diet Order */}
                <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                  <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                    <Apple className="w-4 h-4 text-[#EC5E27]" />
                    Diet & Nutrition Order
                  </h3>

                  <form onSubmit={handleSaveDiet} className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[#736860] mb-1">Diet Type:</label>
                        <select
                          value={dietType}
                          onChange={(e) => setDietType(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                        >
                          <option value="Regular">Regular</option>
                          <option value="Cardiac">Cardiac / Low Sodium</option>
                          <option value="Diabetic">Diabetic</option>
                          <option value="Clear Liquid">Clear Liquid</option>
                          <option value="NPO">NPO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#736860] mb-1">NPO Fast:</label>
                        <div className="flex items-center gap-1.5 mt-2">
                          <input
                            type="checkbox"
                            id="dietNpo"
                            checked={dietNPO}
                            onChange={(e) => setDietNPO(e.target.checked)}
                            className="w-3.5 h-3.5 text-[#EC5E27] accent-[#EC5E27]"
                          />
                          <label htmlFor="dietNpo" className="text-xs font-bold text-[#251E1A]">Strict NPO</label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#736860] mb-1">Restrictions:</label>
                      <input
                        type="text"
                        value={dietRestrictions}
                        onChange={(e) => setDietRestrictions(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSavingDiet}
                        className="px-4 py-1.5 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] transition shadow-2xs"
                      >
                        {isSavingDiet ? 'Saving...' : 'Authorize Diet'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Post-Op Protocol */}
                <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                  <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                    <Activity className="w-4 h-4 text-[#EC5E27]" />
                    Post-Operative Recovery Plan
                  </h3>

                  <form onSubmit={handleSavePostOp} className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-[#736860] mb-1">Procedure:</label>
                      <input
                        type="text"
                        value={procedureName}
                        onChange={(e) => setProcedureName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#736860] mb-1">Wound Instructions:</label>
                      <input
                        type="text"
                        value={woundInstructions}
                        onChange={(e) => setWoundInstructions(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSavingPostOp}
                        className="px-4 py-1.5 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] transition shadow-2xs"
                      >
                        {isSavingPostOp ? 'Saving...' : 'Authorize Post-Op'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 1: BEDSIDE QR ACCESS & DELEGATION (Phase 4) */}
          {isQRModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-[#FDFDF1] border border-[#E8E4C9] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[#E8E4C9] pb-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#EC5E27]" />
                    <h3 className="text-sm font-black text-[#EC5E27]">
                      Bedside QR Code & Care-Team Access
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsQRModalOpen(false)}
                    className="p-1 rounded-full hover:bg-[#E8E4C9] text-[#736860]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-white rounded-2xl border border-[#E8E4C9] space-y-1">
                    <span className="font-bold text-[#EC5E27]">Scanned Identity Token:</span>
                    <p className="font-mono text-[11px] text-[#251E1A] break-all bg-[#FDFDF1] p-2 rounded-xl">
                      {qrToken || 'Loading HMAC-signed identity token...'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleVerifyDoctorQR}
                      disabled={isVerifyingQR || !qrToken}
                      className="px-5 py-2 rounded-full bg-[#EC5E27] text-[#FFF3EC] font-bold text-xs hover:bg-[#D54813] transition flex items-center gap-1.5 shadow-sm"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isVerifyingQR ? 'Verifying...' : 'Test Bedside Privileges'}</span>
                    </button>
                    <span className="text-[#8E8278] text-[11px]">
                      Doctor: <strong>{activeDoctor?.name}</strong> ({docId})
                    </span>
                  </div>

                  {qrDoctorVerifyResult && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-1 text-emerald-900">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        Access Granted: {qrDoctorVerifyResult.access_type}
                      </div>
                      <p className="text-[11px]">Identity cryptographically verified against care-team permissions.</p>
                    </div>
                  )}

                  {qrError && (
                    <div className="p-3 bg-red-50 border border-red-300 rounded-2xl space-y-1 text-red-900">
                      <div className="flex items-center gap-1.5 font-bold">
                        <ShieldAlert className="w-4 h-4 text-red-700" />
                        Access Denied: 403 Forbidden
                      </div>
                      <p className="text-[11px]">{qrError}</p>
                    </div>
                  )}

                  {/* Delegation */}
                  <div className="p-3 bg-white rounded-2xl border border-[#E8E4C9] space-y-2">
                    <h4 className="font-black text-[#EC5E27] text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5" />
                      Delegate Temporary Coverage
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={coveringDocId}
                        onChange={(e) => setCoveringDocId(e.target.value)}
                        className="p-1.5 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-xs font-semibold"
                      >
                        <option value="DOC-101">DOC-101 (Dr. Mukherjee)</option>
                        <option value="DOC-102">DOC-102 (Dr. Sethi)</option>
                        <option value="DOC-103">DOC-103 (Dr. Nair)</option>
                        <option value="DOC-104">DOC-104 (Dr. Kapoor)</option>
                      </select>
                      <button
                        onClick={handleGrantCoverage}
                        disabled={isGrantingCoverage}
                        className="py-1.5 px-3 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] transition"
                      >
                        {isGrantingCoverage ? 'Delegating...' : 'Grant 12h Coverage'}
                      </button>
                    </div>
                  </div>

                  {/* Active Temporary Coverage Grants */}
                  {qrGrants.length > 0 && (
                    <div className="p-3 bg-white rounded-2xl border border-[#E8E4C9] space-y-2">
                      <h4 className="font-black text-[#EC5E27] text-[11px] uppercase tracking-wider flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        Active Temporary Coverage Grants ({qrGrants.length})
                      </h4>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {qrGrants.map((grant) => (
                          <div key={grant.id} className="p-2 rounded-xl bg-[#FDFDF1] border border-[#E8E4C9] flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-[#251E1A]">{grant.doctor_id} • {grant.access_level}</div>
                              <div className="text-[10px] text-[#8E8278]">
                                Granted by {grant.granted_by} • Expires {new Date(grant.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRevokeGrant(grant.id)}
                              className="px-2.5 py-1 rounded-full bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-bold transition"
                            >
                              Revoke
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODAL 2: CRITICAL ACTION / RESOLVE MODAL */}
          {selectedCritical && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-[#FDFDF1] border border-[#E8E4C9] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[#E8E4C9] pb-3">
                  <h3 className="text-sm font-black text-[#EC5E27] flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-red-600" />
                    {criticalModalMode === 'action' ? 'Document Clinical Action' : 'Resolve Critical Alert'}
                  </h3>
                  <button onClick={() => setSelectedCritical(null)} className="p-1 rounded-full hover:bg-[#E8E4C9] text-[#736860]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitCriticalModal} className="space-y-3 text-xs">
                  <div className="p-3 bg-white rounded-2xl border border-[#E8E4C9]">
                    <span className="text-[#EC5E27] font-bold">Parameter: </span>
                    <strong className="text-[#251E1A]">{selectedCritical.parameter_name} ({selectedCritical.result_value} {selectedCritical.unit})</strong>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#EC5E27] mb-1">
                      {criticalModalMode === 'action' ? 'Action Taken / Orders Executed:' : 'Resolution & Outcome:'}
                    </label>
                    <textarea
                      value={criticalActionText}
                      onChange={(e) => setCriticalActionText(e.target.value)}
                      rows={3}
                      required
                      placeholder={criticalModalMode === 'action' ? 'e.g. Administered 10% Calcium Gluconate IV...' : 'e.g. Patient stabilized, repeat panel normalized...'}
                      className="w-full p-3 rounded-2xl bg-white border border-[#E8E4C9] font-medium outline-none focus:ring-1 focus:ring-[#EC5E27]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCritical(null)}
                      className="px-4 py-2 rounded-full bg-white border border-[#E8E4C9] text-xs font-bold text-[#736860]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingCriticalAction || !criticalActionText}
                      className="px-5 py-2 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] transition"
                    >
                      {isSubmittingCriticalAction ? 'Saving...' : 'Confirm & Log Audit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL 3: MEDICAL RECORD CORRECTION MODAL (Feature E) */}
          {isCorrectionModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-[#FDFDF1] border border-[#E8E4C9] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[#E8E4C9] pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[#EC5E27]" />
                    <h3 className="text-sm font-black text-[#EC5E27]">
                      Medical Record Field-Level Correction
                    </h3>
                  </div>
                  <button onClick={() => setIsCorrectionModalOpen(false)} className="p-1 rounded-full hover:bg-[#E8E4C9] text-[#736860]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-[#E8E4C9] text-xs text-[#736860]">
                  <strong className="text-[#EC5E27]">Cryptographic Audit Protocol: </strong>
                  Requires mandatory clinical reason and calculates an immutable SHA-256 hash pointer.
                </div>

                <form onSubmit={handleSubmitCorrection} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#EC5E27] mb-1">Record Type:</label>
                      <select
                        value={corrRecordType}
                        onChange={(e) => setCorrRecordType(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-white border border-[#E8E4C9] font-semibold outline-none"
                      >
                        <option value="Diagnosis">Primary Diagnosis</option>
                        <option value="Prescription">Prescription</option>
                        <option value="Allergy">Allergy Record</option>
                        <option value="Demographics">Demographics</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#EC5E27] mb-1">Target Field:</label>
                      <input
                        type="text"
                        value={corrFieldName}
                        onChange={(e) => setCorrFieldName(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-white border border-[#E8E4C9] font-semibold outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#EC5E27] mb-1">Previous Stored Value:</label>
                    <input
                      type="text"
                      value={corrPrevVal}
                      onChange={(e) => setCorrPrevVal(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#FDFDF1]/80 border border-[#E8E4C9] font-medium outline-none text-[#736860]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#EC5E27] mb-1">Corrected New Value:</label>
                    <input
                      type="text"
                      value={corrNewVal}
                      onChange={(e) => setCorrNewVal(e.target.value)}
                      placeholder="e.g. Acute Coronary Syndrome"
                      className="w-full p-2.5 rounded-xl bg-white border border-[#E8E4C9] font-bold outline-none text-[#251E1A]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#EC5E27] mb-1">
                      Clinical Rationale (Minimum 5 characters):
                    </label>
                    <textarea
                      value={corrReason}
                      onChange={(e) => setCorrReason(e.target.value)}
                      rows={2}
                      required
                      placeholder="Specify objective clinical reason..."
                      className="w-full p-2.5 rounded-xl bg-white border border-[#E8E4C9] font-medium outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCorrectionModalOpen(false)}
                      className="px-4 py-2 rounded-full bg-white border border-[#E8E4C9] text-xs font-bold text-[#736860]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingCorr || corrReason.trim().length < 5 || !corrNewVal}
                      className="px-5 py-2 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] disabled:opacity-50 transition"
                    >
                      {isSubmittingCorr ? 'Recording...' : 'Append Correction'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
