import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Bed, Patient, Patient360, MARTask, PostOpCarePlan, MealDelivery, PostOpTask,
  ClinicalHandover, CriticalFollowUp, NEWS2Score
} from '../types';
import {
  HeartPulse, Pill, Clock, Activity, CheckCircle2,
  AlertTriangle, ArrowRight, UserCheck, Check, X, BedDouble, Apple,
  RefreshCw, ClipboardList, AlertOctagon, ShieldAlert
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';

interface NurseDashboardProps {
  onSelectPatient?: (patientId: string) => void;
}

export const NurseDashboard: React.FC<NurseDashboardProps> = ({ onSelectPatient }) => {
  const { user } = useAuth();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('All');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('PT-101');
  const [patient360, setPatient360] = useState<Patient360 | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [marTasks, setMarTasks] = useState<MARTask[]>([]);
  const [dueTasks, setDueTasks] = useState<MARTask[]>([]);
  const [postOpPlans, setPostOpPlans] = useState<PostOpCarePlan[]>([]);
  const [vitalsTrends, setVitalsTrends] = useState<any[]>([]);
  const [mealDeliveries, setMealDeliveries] = useState<MealDelivery[]>([]);
  const [handovers, setHandovers] = useState<ClinicalHandover[]>([]);
  const [criticalResults, setCriticalResults] = useState<CriticalFollowUp[]>([]);
  const [nurseNews2, setNurseNews2] = useState<NEWS2Score | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // REDUCED TO 3 FOCUSED, INTUITIVE NURSING TABS
  const [activeTab, setActiveTab] = useState<'meds-vitals' | 'careplan' | 'handover-alerts'>('meds-vitals');

  // Vitals form state
  const [bpSystolic, setBpSystolic] = useState(122);
  const [bpDiastolic, setBpDiastolic] = useState(78);
  const [heartRate, setHeartRate] = useState(74);
  const [spo2, setSpo2] = useState(98);
  const [tempF, setTempF] = useState(98.6);
  const [respRate, setRespRate] = useState(16);
  const [painScore, setPainScore] = useState(2);
  const [isSubmittingVitals, setIsSubmittingVitals] = useState(false);

  // Hold Modal state
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [activeHoldTaskId, setActiveHoldTaskId] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [holdAction, setHoldAction] = useState<'Held' | 'Delayed' | 'Omitted'>('Held');
  const [isHolding, setIsHolding] = useState(false);

  const nurseName = user?.full_name || 'Nurse Sarah Jenkins, RN';

  const loadWardData = async () => {
    setIsLoading(true);
    try {
      const [allBeds, dueM] = await Promise.all([
        api.getBeds(),
        api.getDueMAR().catch(() => []),
      ]);
      setBeds(allBeds);
      setDueTasks(dueM || []);

      if (selectedPatientId) {
        await loadPatientWardDetails(selectedPatientId);
      } else {
        const firstOccupied = allBeds.find((b) => b.status === 'Occupied' && b.current_patient_id);
        if (firstOccupied?.current_patient_id) {
          setSelectedPatientId(firstOccupied.current_patient_id);
        }
      }
    } catch (err) {
      console.error('Failed to load nurse ward data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatientWardDetails = async (pid: string) => {
    try {
      const [p360, mar, pop, trends, meals, hnds, crits, news2] = await Promise.all([
        api.getPatient360(pid).catch(() => null),
        api.getPatientMAR(pid).catch(() => []),
        api.getPostOpPlans(pid).catch(() => []),
        api.getVitalsTrends(pid).catch(() => ({ trends: [] })),
        api.getMealDeliveries(pid).catch(() => []),
        api.getHandovers({ patient_id: pid }).catch(() => []),
        api.getCriticalResults({ patient_id: pid }).catch(() => []),
        api.getPatientNEWS2(pid).catch(() => null),
      ]);

      setPatient360(p360);
      setPatient(p360?.patient || null);
      setMarTasks(mar || []);
      setPostOpPlans(pop || []);
      setVitalsTrends(trends.trends || []);
      setMealDeliveries(meals || []);
      setHandovers(hnds || []);
      setCriticalResults(crits || []);
      setNurseNews2(news2);
    } catch (err) {
      console.error('Failed to load patient ward details', err);
    }
  };

  const handleAcknowledgeHandover = async (handoverId: string) => {
    const note = prompt('Enter nursing acknowledgement note:', 'Bedside handover received. Vital trends verified.');
    if (!note) return;
    try {
      await api.acknowledgeHandover(handoverId, nurseName, note);
      if (selectedPatientId) {
        const updated = await api.getHandovers({ patient_id: selectedPatientId });
        setHandovers(updated);
      }
      alert('Shift handover acknowledged. Transfer of clinical responsibility logged.');
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge handover');
    }
  };

  useEffect(() => {
    loadWardData();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientWardDetails(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleAdministerMed = async (taskId: string) => {
    try {
      await api.administerMedication(taskId, nurseName);
      if (selectedPatientId) {
        const updatedMar = await api.getPatientMAR(selectedPatientId);
        setMarTasks(updatedMar);
        const due = await api.getDueMAR();
        setDueTasks(due);
      }
      alert('Medication administration recorded.');
    } catch (err: any) {
      alert(err.message || 'Administration failed');
    }
  };

  const handleOpenHoldModal = (taskId: string) => {
    setActiveHoldTaskId(taskId);
    setHoldReason('');
    setHoldAction('Held');
    setIsHoldModalOpen(true);
  };

  const handleConfirmHoldMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHoldTaskId || !holdReason.trim()) return;
    setIsHolding(true);
    try {
      await api.holdMedication(activeHoldTaskId, holdReason, holdAction, nurseName);
      setIsHoldModalOpen(false);
      if (selectedPatientId) {
        const updatedMar = await api.getPatientMAR(selectedPatientId);
        setMarTasks(updatedMar);
        const due = await api.getDueMAR();
        setDueTasks(due);
      }
      alert(`Medication dose marked as ${holdAction}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to hold dose');
    } finally {
      setIsHolding(false);
    }
  };

  const handleSubmitVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setIsSubmittingVitals(true);
    try {
      await api.recordVitals({
        patient_id: selectedPatientId,
        bp_systolic: Number(bpSystolic),
        bp_diastolic: Number(bpDiastolic),
        heart_rate: Number(heartRate),
        spo2: Number(spo2),
        temperature_f: Number(tempF),
        respiratory_rate: Number(respRate),
        pain_score: Number(painScore),
        nurse_id: nurseName,
      });

      if (selectedPatientId) {
        const [trends, updatedNews2] = await Promise.all([
          api.getVitalsTrends(selectedPatientId),
          api.getPatientNEWS2(selectedPatientId).catch(() => null),
        ]);
        setVitalsTrends(trends.trends || []);
        if (updatedNews2) setNurseNews2(updatedNews2);
      }
      alert('Telemetry vitals and pain score recorded.');
    } catch (err: any) {
      alert(err.message || 'Failed to record vitals');
    } finally {
      setIsSubmittingVitals(false);
    }
  };

  const handleVerifyMeal = async (mealId: string) => {
    try {
      await api.verifyMealDelivery(mealId, nurseName);
      if (selectedPatientId) {
        const meals = await api.getMealDeliveries(selectedPatientId);
        setMealDeliveries(meals);
      }
      alert('Bedside meal delivery verified.');
    } catch (err: any) {
      alert(err.message || 'Meal verification failed');
    }
  };

  const wards = ['All', 'ICU', 'Ward A', 'Ward B', 'Cardiology', 'Pediatrics'];

  const filteredBeds = beds.filter((b) => {
    if (selectedWard === 'All') return true;
    return b.ward === selectedWard;
  });

  const allergyList = patient360?.allergies?.map((a) => a.allergen) || [];

  return (
    <div className="min-h-screen bg-[#FDFDF1] text-[#251E1A] selection:bg-[#EC5E27] selection:text-[#FFF3EC]">
      {/* Contained Nurse Station Header Card */}
      <div className="max-w-7xl mx-auto px-6 pt-5">
        <div className="bg-white rounded-3xl border border-[#E8E4C9] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#EC5E27] text-[#FFF3EC] flex items-center justify-center font-bold shadow-xs shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-black text-[#EC5E27] tracking-tight">
                  {nurseName}
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFF3EC] text-[#EC5E27] border border-[#E8E4C9]">
                  Ward Charge Nurse
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  ● Active Shift
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#736860] mt-0.5">
                Inpatient Telemetry, MAR Administration & Bedside Care Cockpit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs shrink-0">
            <div className="bg-[#FDFDF1] px-3.5 py-1.5 rounded-full border border-[#E8E4C9] font-semibold text-[#736860] shadow-2xs flex items-center gap-1.5">
              <span>Occupied:</span>
              <span className="font-black text-[#EC5E27] text-xs">
                {beds.filter((b) => b.status === 'Occupied').length} / {beds.length}
              </span>
            </div>
            <div className="bg-[#FDFDF1] px-3.5 py-1.5 rounded-full border border-[#E8E4C9] font-semibold text-[#736860] shadow-2xs flex items-center gap-1.5">
              <span>Due Doses:</span>
              <span className="font-black text-[#EC5E27] text-xs">
                {dueTasks.length}
              </span>
            </div>
            <button
              onClick={() => {
                loadWardData();
                if (selectedPatientId) loadPatientWardDetails(selectedPatientId);
              }}
              className="p-2 rounded-full border border-[#E8E4C9] hover:bg-[#FFF3EC] text-[#EC5E27] transition-all shadow-2xs hover:rotate-180 duration-300"
              title="Refresh Ward Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split Workspace */}
      <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inpatient Bed Selector & Roster (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-[#E8E4C9] p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#EC5E27] flex items-center gap-2">
                <BedDouble className="w-3.5 h-3.5 text-[#EC5E27]" />
                Ward Beds & Inpatients
              </h2>
              <span className="text-[11px] bg-[#FFF3EC] text-[#EC5E27] font-bold px-2.5 py-0.5 rounded-full border border-[#E8E4C9]">
                {filteredBeds.filter((b) => b.status === 'Occupied').length} Occupied
              </span>
            </div>

            {/* Ward Filter Pills */}
            <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
              {wards.map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWard(w)}
                  className={`px-3 py-1 rounded-full border text-[11px] font-bold transition-all shadow-2xs ${
                    selectedWard === w
                      ? 'bg-[#EC5E27] text-[#FFF3EC] border-[#EC5E27]'
                      : 'bg-[#FDFDF1] text-[#736860] border-[#E8E4C9] hover:bg-[#FFF3EC]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            {/* Beds Grid / List */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredBeds.map((bed) => {
                const isOccupied = bed.status === 'Occupied' && bed.current_patient_id;
                const isSelected = bed.current_patient_id === selectedPatientId;

                return (
                  <div
                    key={bed.bed_id}
                    onClick={() => {
                      if (bed.current_patient_id) {
                        setSelectedPatientId(bed.current_patient_id);
                        if (onSelectPatient) onSelectPatient(bed.current_patient_id);
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all ${
                      isOccupied ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                    } ${
                      isSelected
                        ? 'bg-[#FBF9EA] border-[#EC5E27] shadow-xs ring-1 ring-[#EC5E27]'
                        : 'bg-white border-[#E8E4C9] hover:border-[#EC5E27]/50 hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#EC5E27]">
                          {bed.bed_id}
                        </span>
                        <span className="text-[11px] text-[#736860]">
                          {bed.ward} • {bed.department}
                        </span>
                      </div>

                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          bed.status === 'Occupied'
                            ? 'bg-[#EC5E27] text-[#FFF3EC]'
                            : bed.status === 'Available'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {bed.status}
                      </span>
                    </div>

                    {isOccupied && (
                      <div className="mt-2 pt-2 border-t border-[#E8E4C9]/50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-[#EC5E27]" />
                          <span className="font-semibold text-[#251E1A]">
                            {bed.current_patient_name || bed.current_patient_id}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-[#8E8278]">
                          {bed.current_patient_id}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredBeds.length === 0 && (
                <div className="p-6 text-center text-xs text-[#8E8278]">
                  No beds in this ward.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Inpatient Care Details (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {patient ? (
            <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E4C9]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-[#EC5E27] tracking-tight">
                      {patient.full_name}
                    </h2>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-[#EC5E27]">
                      {patient.patient_id}
                    </span>
                    <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-[#FDFDF1] text-[#251E1A] border border-[#E8E4C9]">
                      Bed: {patient.assigned_bed_id || 'Ward Bed'}
                    </span>
                    {nurseNews2 && (
                      <span
                        className={`text-[11px] font-bold px-3 py-0.5 rounded-full border shadow-2xs ${
                          nurseNews2.urgency === 'EMERGENCY_RAPID_RESPONSE'
                            ? 'bg-rose-100 text-rose-900 border-rose-400 animate-pulse'
                            : nurseNews2.urgency === 'URGENT_CLINICAL_REVIEW'
                            ? 'bg-amber-100 text-amber-900 border-amber-400'
                            : 'bg-teal-50 text-teal-800 border-teal-300'
                        }`}
                      >
                        NEWS2: {nurseNews2.total_score} ({nurseNews2.risk_level})
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[#736860] mt-0.5">
                    {patient.age}y • {patient.gender} • Blood: <strong className="text-[#251E1A]">{patient.blood_group || 'O+'}</strong> • Dept: <strong className="text-[#251E1A]">{patient.department}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {allergyList.length > 0 ? (
                    <div className="px-3 py-1 rounded-full bg-[#FFF7F2] border border-[#EC5E27]/30 text-[#EC5E27] text-xs font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#EC5E27]" />
                      <span>Allergy: {allergyList.join(', ')}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      No Known Allergies
                    </span>
                  )}
                </div>
              </div>

              {/* EXACTLY 3 FOCUSED NURSING TABS */}
              <div className="flex items-center gap-2 pt-1 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('meds-vitals')}
                  className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-2xs ${
                    activeTab === 'meds-vitals'
                      ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-xs'
                      : 'bg-white text-[#736860] border border-[#E8E4C9] hover:bg-[#FDFDF1] hover:text-[#251E1A]'
                  }`}
                >
                  <Pill className="w-3.5 h-3.5" />
                  MAR & Telemetry Vitals ({marTasks.length})
                </button>

                <button
                  onClick={() => setActiveTab('careplan')}
                  className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-2xs ${
                    activeTab === 'careplan'
                      ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-xs'
                      : 'bg-white text-[#736860] border border-[#E8E4C9] hover:bg-[#FDFDF1] hover:text-[#251E1A]'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" />
                  Care Plan & Nutrition
                </button>

                <button
                  onClick={() => setActiveTab('handover-alerts')}
                  className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-2xs ${
                    activeTab === 'handover-alerts'
                      ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-xs'
                      : 'bg-white text-[#736860] border border-[#E8E4C9] hover:bg-[#FDFDF1] hover:text-[#251E1A]'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Handover & Lab Alerts
                  {handovers.some(h => h.status === 'Submitted') && (
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-amber-600 text-white animate-pulse">
                      Ack Needed
                    </span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E8E4C9] p-6 text-center text-xs font-bold text-[#8E8278]">
              Select an occupied bed from the ward list to open inpatient care records.
            </div>
          )}

          {/* TAB 1: MAR & VITALS */}
          {activeTab === 'meds-vitals' && (
            <div className="space-y-4">
              {/* Bedside MAR Administration Tasks */}
              <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8E4C9] pb-2.5">
                  <div>
                    <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2">
                      <Pill className="w-4 h-4 text-[#EC5E27]" />
                      Bedside Medication Administration Record (MAR)
                    </h3>
                    <p className="text-[11px] text-[#736860]">
                      Verify 5 Rights of Medication Safety before confirming dose administration.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-[#EC5E27]">
                    {marTasks.filter((t) => t.status === 'Due' || t.status === 'Due Soon').length} Due
                  </span>
                </div>

                {marTasks.length > 0 ? (
                  <div className="space-y-2.5">
                    {marTasks.map((task: MARTask) => {
                      const isPending = task.status === 'Due' || task.status === 'Due Soon';
                      const isAdministered = task.status === 'Administered';

                      return (
                        <div
                          key={task.id}
                          className={`p-3 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                            isPending
                              ? 'bg-[#FBF9EA] border-[#E8E4C9]'
                              : isAdministered
                              ? 'bg-white border-emerald-200'
                              : 'bg-[#FFF7F2] border-[#EC5E27]/20'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#251E1A]">
                                {task.medication_name}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white border border-[#E8E4C9] text-[#EC5E27]">
                                {task.dosage}
                              </span>
                              <span className="text-[11px] text-[#736860]">
                                {task.route}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#8E8278] mt-0.5 block">
                              Scheduled: <strong>{task.scheduled_time}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleAdministerMed(task.id)}
                                  className="px-3.5 py-1 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] transition shadow-2xs"
                                >
                                  Administer
                                </button>
                                <button
                                  onClick={() => handleOpenHoldModal(task.id)}
                                  className="px-3 py-1 rounded-full bg-white border border-[#E8E4C9] text-xs font-semibold text-[#8E8278] hover:bg-[#FDFDF1]"
                                >
                                  Hold
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {task.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#8E8278] text-center p-4">No medication doses scheduled.</p>
                )}
              </div>

              {/* Record Vitals & Trends */}
              <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2.5">
                  <Activity className="w-4 h-4 text-[#EC5E27]" />
                  Record Bedside Telemetry Vitals & Pain Assessment
                </h3>

                <form onSubmit={handleSubmitVitals} className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#736860] mb-1">Sys BP</label>
                      <input
                        type="number"
                        value={bpSystolic}
                        onChange={(e) => setBpSystolic(Number(e.target.value))}
                        required
                        className="w-full px-2.5 py-1 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#736860] mb-1">Dia BP</label>
                      <input
                        type="number"
                        value={bpDiastolic}
                        onChange={(e) => setBpDiastolic(Number(e.target.value))}
                        required
                        className="w-full px-2.5 py-1 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#736860] mb-1">HR (bpm)</label>
                      <input
                        type="number"
                        value={heartRate}
                        onChange={(e) => setHeartRate(Number(e.target.value))}
                        required
                        className="w-full px-2.5 py-1 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#736860] mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        value={spo2}
                        onChange={(e) => setSpo2(Number(e.target.value))}
                        required
                        className="w-full px-2.5 py-1 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#736860] mb-1">Temp (°F)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={tempF}
                        onChange={(e) => setTempF(Number(e.target.value))}
                        required
                        className="w-full px-2.5 py-1 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#736860] mb-1">RR (/min)</label>
                      <input
                        type="number"
                        value={respRate}
                        onChange={(e) => setRespRate(Number(e.target.value))}
                        required
                        className="w-full px-2.5 py-1 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-[#251E1A]">
                        Pain Scale (0–10): <span className="text-[#EC5E27]">{painScore} / 10</span>
                      </label>
                      <span className="text-[10px] text-[#8E8278]">
                        {painScore === 0 ? 'No Pain' : painScore <= 3 ? 'Mild' : painScore <= 6 ? 'Moderate' : painScore <= 8 ? 'Severe' : 'Very Severe'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={painScore}
                        onChange={(e) => setPainScore(Number(e.target.value))}
                        className="w-full accent-[#EC5E27] cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={painScore}
                        onChange={(e) => setPainScore(Math.min(10, Math.max(0, Number(e.target.value))))}
                        className="w-14 px-2 py-0.5 rounded border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-bold text-center"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingVitals}
                      className="px-4 py-1.5 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] transition"
                    >
                      {isSubmittingVitals ? 'Saving...' : 'Record Vitals'}
                    </button>
                  </div>
                </form>

                {/* Vitals Trend Chart */}
                {vitalsTrends.length > 0 && (
                  <div className="pt-2 border-t border-[#E8E4C9]">
                    <span className="text-[10px] font-black uppercase text-[#8E8278] block mb-2">Longitudinal Trends:</span>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={vitalsTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E8E4C9" opacity={0.6} />
                          <XAxis dataKey="recorded_at" stroke="#8E8278" fontSize={9} />
                          <YAxis stroke="#8E8278" fontSize={9} />
                          <Tooltip contentStyle={{ backgroundColor: '#FBF9EA', borderRadius: '12px', fontSize: '10px' }} />
                          <Line type="monotone" dataKey="bp_systolic" name="Systolic BP" stroke="#EC5E27" strokeWidth={2} dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="heart_rate" name="Heart Rate" stroke="#b45309" strokeWidth={2} dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="spo2" name="SpO2" stroke="#047857" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CARE PLAN & NUTRITION */}
          {activeTab === 'careplan' && (
            <div className="space-y-4">
              {/* Post-Op Recovery Protocol */}
              <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                  <CheckCircle2 className="w-4 h-4 text-[#EC5E27]" />
                  Post-Operative Recovery Protocols & Milestones
                </h3>

                {postOpPlans.length > 0 ? (
                  <div className="space-y-2.5 text-xs">
                    {postOpPlans.map((plan: PostOpCarePlan) => (
                      <div key={plan.id} className="p-3 rounded-2xl bg-[#FDFDF1] border border-[#E8E4C9] space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#EC5E27]">{plan.procedure_name}</span>
                          <span className="text-[10px] text-[#8E8278]">Doctor: {plan.doctor_id}</span>
                        </div>
                        <p className="text-[#251E1A]"><strong>Wound Care:</strong> {plan.wound_care_instructions}</p>
                        <p className="text-[#251E1A]"><strong>Mobility Goal:</strong> {plan.mobility_goal}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8E8278] text-center p-4">No post-operative care plans recorded.</p>
                )}
              </div>

              {/* Bedside Meal Delivery Clearance */}
              <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                  <Apple className="w-4 h-4 text-[#EC5E27]" />
                  Bedside Meal Delivery & Allergen Clearance
                </h3>

                {mealDeliveries.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {mealDeliveries.map((m: MealDelivery) => (
                      <div key={m.id} className="p-3 rounded-2xl bg-[#FDFDF1] border border-[#E8E4C9] flex justify-between items-center">
                        <div>
                          <span className="font-bold text-[#251E1A]">{m.meal_period} Meal</span>
                          <span className="text-[10px] text-[#736860] ml-2">{m.scheduled_date} at {m.scheduled_time}</span>
                          <span className="text-[10px] text-emerald-700 block mt-0.5">
                            Allergen Check: {m.allergy_check_passed ? 'Passed Safe' : 'Review Required'}
                          </span>
                        </div>
                        {m.delivery_status === 'Delivered' ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                            Delivered
                          </span>
                        ) : (
                          <button
                            onClick={() => handleVerifyMeal(m.id)}
                            className="px-3.5 py-1 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] transition"
                          >
                            Verify Delivery
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8E8278] text-center p-4">No active meal deliveries for this patient.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: HANDOVER & LAB ALERTS */}
          {activeTab === 'handover-alerts' && (
            <div className="space-y-4">
              {/* Shift Handover Review & Acknowledgement */}
              <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                  <ClipboardList className="w-4 h-4 text-[#EC5E27]" />
                  Shift Handover & Inpatient Continuity
                </h3>

                {handovers.length > 0 ? (
                  <div className="space-y-2.5 text-xs">
                    {handovers.map((h) => (
                      <div key={h.id} className="p-3.5 rounded-2xl bg-[#FDFDF1] border border-[#E8E4C9] space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#EC5E27]">Transferred by: {h.outgoing_staff_name} ({h.outgoing_role})</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${h.status === 'Acknowledged' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                            {h.status}
                          </span>
                        </div>
                        <p className="text-[#251E1A] bg-white p-2 rounded-xl border border-[#E8E4C9]">{h.clinical_summary}</p>
                        {h.critical_concerns && (
                          <p className="text-red-900 font-semibold text-[11px]"><strong>Critical Concerns:</strong> {h.critical_concerns}</p>
                        )}
                        {h.status === 'Submitted' ? (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleAcknowledgeHandover(h.id)}
                              className="px-4 py-1.5 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] transition"
                            >
                              Acknowledge Responsibility
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-800 font-bold block pt-1">
                            Acknowledged by {h.acknowledged_by}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8E8278] text-center p-4">No shift handovers found for this patient.</p>
                )}
              </div>

              {/* Critical Lab Alerts */}
              <div className="bg-white rounded-3xl border border-[#E8E4C9] p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  Critical Diagnostic Panic Value Alerts
                </h3>

                {criticalResults.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {criticalResults.map((fu) => (
                      <div key={fu.id} className="p-3 rounded-2xl bg-red-50/70 border border-red-200 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#251E1A]">{fu.parameter_name}: <strong className="text-red-700">{fu.result_value} {fu.unit}</strong></span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white border border-[#E8E4C9]">{fu.status}</span>
                        </div>
                        <p className="text-[11px] text-[#251E1A]">{fu.critical_rationale}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8E8278] text-center p-4">No active critical panic alerts flagged.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Medication Hold / Delay Modal */}
      {isHoldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#E8E4C9] w-full max-w-md p-6 shadow-xl text-[#251E1A] space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E4C9]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EC5E27]" />
                <h3 className="font-bold text-xs text-[#EC5E27]">Hold / Delay Medication Dose</h3>
              </div>
              <button onClick={() => setIsHoldModalOpen(false)} className="p-1 rounded-full hover:bg-[#FDFDF1] text-[#8E8278]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmHoldMed} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#736860] mb-1">Action Type:</label>
                <select
                  value={holdAction}
                  onChange={(e) => setHoldAction(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                >
                  <option value="Held">Hold Dose (Clinically Contraindicated)</option>
                  <option value="Delayed">Delay Dose (Patient off unit / asleep)</option>
                  <option value="Omitted">Omit Dose (Physician order change)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#736860] mb-1">Clinical Justification:</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Systolic BP < 90 mmHg. Attending physician alerted."
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  required
                  className="w-full p-2.5 text-xs rounded-2xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsHoldModalOpen(false)}
                  className="px-4 py-1.5 rounded-full border border-[#E8E4C9] text-[#736860] hover:bg-[#FDFDF1] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isHolding || !holdReason.trim()}
                  className="px-4 py-1.5 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] disabled:opacity-50"
                >
                  {isHolding ? 'Recording...' : 'Confirm Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
