import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Patient360, Appointment, MARTask, PostOpCarePlan,
  MealDelivery, QRTokenResponse, LabOrder
} from '../types';
import {
  HeartPulse, QrCode, Calendar, Clock, Pill, Apple,
  Activity, ShieldCheck, CheckCircle2, FileText,
  User, Edit2, Save, Stethoscope, Sparkles
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { user, patientId } = useAuth();
  // REDUCED TO 3 FOCUSED, INTUITIVE PATIENT TABS
  const [activeTab, setActiveTab] = useState<'health' | 'queue' | 'reports'>('health');

  const [patient360, setPatient360] = useState<Patient360 | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [marTasks, setMarTasks] = useState<MARTask[]>([]);
  const [postOpPlans, setPostOpPlans] = useState<PostOpCarePlan[]>([]);
  const [mealDeliveries, setMealDeliveries] = useState<MealDelivery[]>([]);
  const [qrInfo, setQrInfo] = useState<QRTokenResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editConcern, setEditConcern] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const activePid = patientId || user?.patient_id || 'PT-101';

  const loadPatientData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [pData, aptData, marData, popData, mealsData, qrData] = await Promise.all([
        api.getPatient360(activePid),
        api.getAppointments({ patient_id: activePid }).catch(() => []),
        api.getPatientMAR(activePid).catch(() => []),
        api.getPostOpPlans(activePid).catch(() => []),
        api.getMealDeliveries(activePid).catch(() => []),
        api.getQRToken(activePid).catch(() => null),
      ]);

      setPatient360(pData);
      setAppointments(aptData || []);
      setMarTasks(marData || []);
      setPostOpPlans(popData || []);
      setMealDeliveries(mealsData || []);
      setQrInfo(qrData);

      if (pData?.patient) {
        setEditPhone(pData.patient.phone || '');
        setEditEmail(pData.patient.email || '');
        setEditAddress(pData.patient.address || '');
        setEditConcern(pData.patient.reported_concern || '');
      }
    } catch (err: any) {
      console.error('Failed to load patient records', err);
      setError(err.message || 'Failed to load authorized patient records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
    const interval = setInterval(loadPatientData, 15000);
    return () => clearInterval(interval);
  }, [activePid]);

  const handleCheckIn = async (appointmentId: string) => {
    try {
      await api.checkInAppointment(appointmentId, 'Patient Portal Self-CheckIn');
      await loadPatientData();
      alert('Check-in confirmed! You have been placed into the department priority queue.');
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await api.updatePatientDemographics({
        phone: editPhone,
        email: editEmail,
        address: editAddress,
        reported_concern: editConcern,
      });
      await loadPatientData();
      setIsEditingProfile(false);
      alert('Profile successfully updated!');
    } catch (err: any) {
      alert(err.message || 'Failed to update demographics');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const patient = patient360?.patient;
  const releasedLabs = patient360?.lab_orders?.filter((o: LabOrder) => o.is_released_to_patient) || [];

  if (isLoading && !patient360) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center text-[#EC5E27] font-bold text-xs animate-pulse">
        Loading authorized patient health records...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-[#FFF7F2] border border-[#E8E4C9] rounded-3xl p-6 text-center text-xs text-[#EC5E27]">
          <h3 className="font-bold text-sm mb-1">Access Restricted</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-5 text-[#251E1A]">
      {/* Patient Header Banner */}
      <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EC5E27] text-[#FFF3EC] flex items-center justify-center font-bold shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-[#EC5E27] tracking-tight">
                  {patient?.full_name}
                </h1>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-[#EC5E27]">
                  {patient?.patient_id}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Authenticated Patient
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#736860] mt-0.5">
                {patient?.age}y • {patient?.gender} • Blood Group: <strong className="text-[#251E1A]">{patient?.blood_group || 'O+'}</strong> • Dept: <strong className="text-[#251E1A]">{patient?.department}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {qrInfo && (
              <div className="px-3 py-1 bg-[#FDFDF1] border border-[#E8E4C9] rounded-full flex items-center gap-1.5 text-xs text-[#EC5E27] font-bold shadow-2xs">
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Validated</span>
              </div>
            )}
            <button
              onClick={() => setActiveTab('reports')}
              className="px-3.5 py-1 bg-[#FDFDF1] hover:bg-[#FFF7F2] text-[#EC5E27] rounded-full text-xs font-bold border border-[#E8E4C9] transition flex items-center gap-1.5 shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Live Queue Notice Banner */}
        {patient?.status === 'Waiting' && (
          <div className="mt-3 p-3 rounded-2xl bg-[#FFF7F2] border border-[#EC5E27]/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#EC5E27]">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>
                Queue Position: <strong>#{patient360?.queue_position || 1}</strong> in waiting heap.
              </span>
            </div>
            <span className="font-bold text-[#EC5E27] bg-white px-2.5 py-0.5 rounded-full border border-[#EC5E27]/20">
              Est. Wait: ~{patient360?.estimated_wait_minutes || 15} mins
            </span>
          </div>
        )}
      </div>

      {/* EXACTLY 3 FOCUSED PATIENT TABS */}
      <div className="flex items-center gap-2 border-b border-[#E8E4C9] pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-2xs ${
            activeTab === 'health'
              ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-xs'
              : 'bg-white text-[#736860] border border-[#E8E4C9] hover:bg-[#FDFDF1] hover:text-[#251E1A]'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          My Health & Care Plan
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-2xs ${
            activeTab === 'queue'
              ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-xs'
              : 'bg-white text-[#736860] border border-[#E8E4C9] hover:bg-[#FDFDF1] hover:text-[#251E1A]'
          }`}
        >
          <Clock className="w-4 h-4" />
          Queue & Appointments ({appointments.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-2xs ${
            activeTab === 'reports'
              ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-xs'
              : 'bg-white text-[#736860] border border-[#E8E4C9] hover:bg-[#FDFDF1] hover:text-[#251E1A]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Reports & Profile ({releasedLabs.length})
        </button>
      </div>

      {/* TAB 1: MY HEALTH & CARE PLAN */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Digital Wristband Card */}
            <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs text-center space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E4C9]">
                <span className="text-xs font-black text-[#EC5E27] uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4" /> Digital Wristband
                </span>
                <span className="text-[9px] font-mono bg-[#FBF9EA] text-[#EC5E27] px-2 py-0.5 rounded-full border border-[#E8E4C9]">
                  HMAC Signed
                </span>
              </div>

              <div className="w-24 h-24 mx-auto bg-white p-2 rounded-2xl border border-[#E8E4C9] flex items-center justify-center shadow-2xs">
                <QrCode className="w-20 h-20 text-[#EC5E27]" />
              </div>
              <div className="font-mono text-xs text-[#EC5E27] font-bold break-all">
                {qrInfo?.qr_token || `MTX-${patient?.patient_id}`}
              </div>

              <div className="space-y-1.5 text-xs text-left pt-2 border-t border-[#E8E4C9]">
                <div className="flex justify-between py-1 border-b border-[#E8E4C9]/60">
                  <span className="text-[#736860]">Current Status:</span>
                  <span className="font-bold text-[#251E1A]">{patient?.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E8E4C9]/60">
                  <span className="text-[#736860]">Assigned Bed:</span>
                  <span className="font-bold text-[#251E1A]">{patient?.assigned_bed_id || 'Pending'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#736860]">Triage Priority:</span>
                  <span className="font-bold text-[#EC5E27]">Level {patient?.priority}</span>
                </div>
              </div>
            </div>

            {/* Allergies & Latest Vitals */}
            <div className="lg:col-span-2 space-y-4">
              {/* Allergies */}
              <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-black text-[#EC5E27] uppercase tracking-wider flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                  <ShieldCheck className="w-4 h-4 text-[#EC5E27]" />
                  Documented Allergies
                </h3>
                {patient360?.allergies && patient360.allergies.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {patient360.allergies.map((allergy) => (
                      <div key={allergy.id} className="p-2.5 rounded-2xl bg-[#FFF7F2] border border-[#EC5E27]/20 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-[#EC5E27]">{allergy.allergen}</span>
                          <p className="text-[10px] text-[#736860]">{allergy.reaction}</p>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white text-[#EC5E27] border">
                          {allergy.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-[#FDFDF1] border border-[#E8E4C9] text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    No known drug allergies (NKDA) recorded.
                  </div>
                )}
              </div>

              {/* Vitals Telemetry */}
              <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-black text-[#EC5E27] uppercase tracking-wider flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                  <Activity className="w-4 h-4 text-[#EC5E27]" />
                  Latest Telemetry Vitals
                </h3>
                {patient360?.vitals && patient360.vitals.length > 0 ? (
                  (() => {
                    const latest = patient360.vitals[patient360.vitals.length - 1];
                    return (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                        <div className="p-2.5 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9]">
                          <span className="text-[9px] text-[#736860] uppercase block">BP</span>
                          <span className="font-bold text-[#251E1A] text-xs block">{latest.blood_pressure_systolic}/{latest.blood_pressure_diastolic}</span>
                          <span className="text-[9px] text-[#736860]">mmHg</span>
                        </div>
                        <div className="p-2.5 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9]">
                          <span className="text-[9px] text-[#736860] uppercase block">HR</span>
                          <span className="font-bold text-[#EC5E27] text-xs block">{latest.heart_rate}</span>
                          <span className="text-[9px] text-[#736860]">bpm</span>
                        </div>
                        <div className="p-2.5 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9]">
                          <span className="text-[9px] text-[#736860] uppercase block">SpO2</span>
                          <span className="font-bold text-[#EC5E27] text-xs block">{latest.oxygen_saturation_spo2}%</span>
                          <span className="text-[9px] text-[#736860]">O2</span>
                        </div>
                        <div className="p-2.5 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9]">
                          <span className="text-[9px] text-[#736860] uppercase block">Temp</span>
                          <span className="font-bold text-[#251E1A] text-xs block">{latest.temperature_f}°F</span>
                          <span className="text-[9px] text-[#736860]">Oral</span>
                        </div>
                        <div className="p-2.5 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9]">
                          <span className="text-[9px] text-[#736860] uppercase block">RR</span>
                          <span className="font-bold text-[#251E1A] text-xs block">{latest.respiratory_rate}</span>
                          <span className="text-[9px] text-[#736860]">/min</span>
                        </div>
                        <div className="p-2.5 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9]">
                          <span className="text-[9px] text-[#736860] uppercase block">Pain</span>
                          <span className="font-bold text-[#EC5E27] text-xs block">{latest.pain_score || 0}/10</span>
                          <span className="text-[9px] text-[#736860]">Score</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-[#8E8278]">No telemetry vitals recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Active MAR Meds & Nutrition Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Medications MAR */}
            <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-black text-[#EC5E27] uppercase tracking-wider flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                <Pill className="w-4 h-4 text-[#EC5E27]" />
                Prescribed Medication Schedule (MAR)
              </h3>
              {marTasks.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {marTasks.map((t) => (
                    <div key={t.id} className="p-2.5 rounded-2xl bg-[#FDFDF1] border border-[#E8E4C9] flex justify-between items-center">
                      <div>
                        <span className="font-bold text-[#251E1A]">{t.medication_name} {t.dosage}</span>
                        <span className="text-[10px] text-[#736860] block">Scheduled: {t.scheduled_time}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'Administered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8E8278] text-center p-4">No medication schedule active.</p>
              )}
            </div>

            {/* Nutrition & Meals */}
            <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-black text-[#EC5E27] uppercase tracking-wider flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                <Apple className="w-4 h-4 text-[#EC5E27]" />
                Clinical Diet & Meal Clearance
              </h3>
              {mealDeliveries.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {mealDeliveries.map((m) => (
                    <div key={m.id} className="p-2.5 rounded-2xl bg-[#FDFDF1] border border-[#E8E4C9] flex justify-between items-center">
                      <div>
                        <span className="font-bold text-[#251E1A]">{m.meal_period} Meal</span>
                        <span className="text-[10px] text-emerald-700 block">{m.conflict_details || 'Verified Safe'}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${m.delivery_status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-white border'}`}>
                        {m.delivery_status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8E8278] text-center p-4">No active meals scheduled.</p>
              )}
            </div>
          </div>

          {/* Post-Operative Care & Recovery Protocol */}
          {postOpPlans.length > 0 && (
            <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-black text-[#EC5E27] uppercase tracking-wider flex items-center gap-2 border-b border-[#E8E4C9] pb-2">
                <Activity className="w-4 h-4 text-[#EC5E27]" />
                Post-Operative Recovery Plans & Tasks ({postOpPlans.length})
              </h3>
              <div className="space-y-3">
                {postOpPlans.map((plan) => (
                  <div key={plan.id} className="p-3.5 rounded-2xl bg-[#FDFDF1] border border-[#E8E4C9] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#251E1A] text-sm">{plan.procedure_name}</span>
                        <span className="text-[10px] text-[#8E8278] block">Surgeon: {plan.doctor_id} • Status: {plan.status}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {plan.tasks?.filter((t) => t.status === 'Completed').length || 0} / {plan.tasks?.length || 0} Tasks Done
                      </span>
                    </div>
                    <div className="text-[11px] text-[#736860] bg-white p-2.5 rounded-xl border border-[#E8E4C9]/60 space-y-1">
                      <div><strong className="text-[#251E1A]">Wound Care:</strong> {plan.wound_care_instructions}</div>
                      <div><strong className="text-[#251E1A]">Mobility Goal:</strong> {plan.mobility_goal}</div>
                    </div>
                    {plan.tasks && plan.tasks.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase text-[#8E8278] block">Observation Checklist:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {plan.tasks.map((task) => (
                            <div
                              key={task.id}
                              className={`p-2 rounded-xl border flex items-center justify-between text-[11px] ${
                                task.status === 'Completed'
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                  : 'bg-white border-[#E8E4C9] text-[#251E1A]'
                              }`}
                            >
                              <span className="font-medium">{task.title}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                task.status === 'Completed' ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUEUE & APPOINTMENTS */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Min-Heap Queue Position Card */}
          <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2.5">
              <Clock className="w-4 h-4 text-[#EC5E27]" />
              Smart Queue Status (Min-Heap Priority Queue)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-4 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9]">
                <span className="text-[10px] font-bold text-[#736860] uppercase block">Position</span>
                <span className="text-2xl font-black text-[#EC5E27] block mt-1">#{patient360?.queue_position || 1}</span>
                <span className="text-[10px] text-[#736860]">In waiting queue</span>
              </div>
              <div className="p-4 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9]">
                <span className="text-[10px] font-bold text-[#736860] uppercase block">Estimated Wait</span>
                <span className="text-2xl font-black text-[#251E1A] block mt-1">~{patient360?.estimated_wait_minutes || 15} mins</span>
                <span className="text-[10px] text-[#736860]">Capacity-weighted</span>
              </div>
              <div className="p-4 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9]">
                <span className="text-[10px] font-bold text-[#736860] uppercase block">Triage Level</span>
                <span className="text-2xl font-black text-[#EC5E27] block mt-1">Level {patient?.priority}</span>
                <span className="text-[10px] text-[#736860]">
                  {patient?.priority === 1 ? 'Critical' : patient?.priority === 2 ? 'Urgent' : 'Normal'}
                </span>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2.5">
              <Calendar className="w-4 h-4 text-[#EC5E27]" />
              Scheduled Consultations & Self-Check-In
            </h3>

            {appointments.length > 0 ? (
              <div className="space-y-2.5 text-xs">
                {appointments.map((apt) => (
                  <div key={apt.id} className="p-3.5 rounded-2xl bg-[#FDFDF1] border border-[#E8E4C9] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#FFF7F2] text-[#EC5E27] flex items-center justify-center font-bold">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-[#251E1A] text-xs">{apt.department} Consultation</span>
                        <p className="text-[11px] text-[#736860]">Scheduled: {new Date(apt.scheduled_time).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#E8E4C9]">
                        {apt.status}
                      </span>
                      {apt.status === 'Scheduled' && (
                        <button
                          onClick={() => handleCheckIn(apt.id)}
                          className="px-4 py-1.5 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813] transition shadow-2xs"
                        >
                          Check In Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8E8278] text-center p-6">No scheduled consultations found.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REPORTS & PROFILE */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Released Lab Reports */}
          <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2 border-b border-[#E8E4C9] pb-2.5">
              <FileText className="w-4 h-4 text-[#EC5E27]" />
              Clinician-Released Diagnostic Reports
            </h3>

            {releasedLabs.length > 0 ? (
              <div className="space-y-2.5 text-xs">
                {releasedLabs.map((order) => (
                  <div key={order.id} className="p-3 rounded-2xl bg-[#FDFDF1] border border-[#E8E4C9] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#251E1A]">{order.test_name}</span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full">Released</span>
                    </div>
                    {order.results && order.results.length > 0 && (
                      <p className="text-[11px] text-[#EC5E27] font-bold">
                        {order.results[0].parameter_name}: {order.results[0].result_value} {order.results[0].unit} (Ref: {order.results[0].reference_range})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8E8278] text-center p-6">No diagnostic reports released yet.</p>
            )}
          </div>

          {/* Profile Demographics Form */}
          <div className="bg-white border border-[#E8E4C9] rounded-3xl p-5 shadow-2xs space-y-3">
            <div className="flex justify-between items-center border-b border-[#E8E4C9] pb-2.5">
              <h3 className="text-xs font-black text-[#EC5E27] flex items-center gap-2">
                <User className="w-4 h-4 text-[#EC5E27]" />
                Demographics & Contact Information
              </h3>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-3 py-1 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-xs font-bold text-[#EC5E27] hover:bg-[#EC5E27] hover:text-[#FFF3EC] transition"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#736860] block mb-0.5">Phone:</label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-1 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-semibold focus:outline-none"
                  />
                ) : (
                  <p className="font-semibold text-[#251E1A]">{patient?.phone || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#736860] block mb-0.5">Email:</label>
                {isEditingProfile ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-1 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-semibold focus:outline-none"
                  />
                ) : (
                  <p className="font-semibold text-[#251E1A]">{patient?.email || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#736860] block mb-0.5">Address:</label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-1 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-semibold focus:outline-none"
                  />
                ) : (
                  <p className="font-semibold text-[#251E1A]">{patient?.address || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#736860] block mb-0.5">Reported Symptoms:</label>
                {isEditingProfile ? (
                  <textarea
                    rows={2}
                    value={editConcern}
                    onChange={(e) => setEditConcern(e.target.value)}
                    className="w-full p-2 rounded-2xl border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-semibold focus:outline-none"
                  />
                ) : (
                  <p className="font-semibold text-[#251E1A]">{patient?.reported_concern || 'None reported'}</p>
                )}
              </div>

              {isEditingProfile && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="px-3 py-1 rounded-full border border-[#E8E4C9] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="px-4 py-1 rounded-full bg-[#EC5E27] text-[#FFF3EC] text-xs font-bold hover:bg-[#D54813]"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
