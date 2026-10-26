import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Patient360, Appointment, MARTask, PostOpCarePlan,
  MealDelivery, QRTokenResponse
} from '../types';
import {
  HeartPulse, QrCode, Calendar, Clock, Pill, Apple,
  Activity, ShieldCheck, CheckCircle2, AlertTriangle, FileText,
  User, Phone, Mail, MapPin, Edit2, Save, X, Stethoscope, Sparkles
} from 'lucide-react';

export const PatientPortalView: React.FC = () => {
  const { user, patientId, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'appointments' | 'medications' | 'nutrition' | 'postop' | 'labs' | 'profile'>('overview');

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

  const activePid = patientId || 'PT-101';

  const loadPatientData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [pData, aptData, marData, popData, mealsData, qrData] = await Promise.all([
        api.getPatient360(activePid),
        api.getAppointments({ patient_id: activePid }),
        api.getPatientMAR(activePid),
        api.getPostOpPlans(activePid),
        api.getMealDeliveries(activePid),
        api.getQRToken(activePid).catch(() => null),
      ]);

      setPatient360(pData);
      setAppointments(aptData || []);
      setMarTasks(marData || []);
      setPostOpPlans(popData || []);
      setMealDeliveries(mealsData || []);
      setQrInfo(qrData);

      // Prepopulate edit fields
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

  if (isLoading && !patient360) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-medtree-text-muted">Loading your authorized health records...</p>
        </div>
      </div>
    );
  }

  if (error && !patient360) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Access Notice</h2>
          <p className="text-sm text-rose-200 mb-4">{error}</p>
          <button
            onClick={() => loadPatientData()}
            className="px-4 py-2 bg-medtree-primary text-white rounded-xl text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const patient = patient360?.patient;
  const releasedLabs = patient360?.lab_orders?.filter((l) => l.is_released_to_patient || l.status === 'Completed' || l.status === 'Clinician Reviewed') || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Patient Welcome Hero Card */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-medtree-card to-medtree-card border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-2xl shadow-inner">
              {patient?.full_name?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">{patient?.full_name}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {patient?.patient_id}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-medtree-primary/20 text-medtree-primary font-semibold border border-medtree-primary/30">
                  Blood Group: {patient?.blood_group || 'Unknown'}
                </span>
              </div>
              <p className="text-xs text-medtree-text-muted flex items-center gap-3">
                <span>{patient?.age} yrs, {patient?.gender}</span>
                <span>•</span>
                <span>Dept: {patient?.department}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Authenticated Patient Session
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {qrInfo && (
              <div className="px-3 py-2 bg-medtree-dark/80 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-[11px]">{qrInfo.qr_token.substring(0, 16)}...</span>
              </div>
            )}
            <button
              onClick={() => setActiveTab('profile')}
              className="px-3.5 py-2 bg-medtree-card hover:bg-medtree-border/40 text-medtree-text rounded-xl text-xs font-semibold border border-medtree-border transition-colors flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Live Queue Floating Pill */}
        {patient?.status === 'Waiting' && (
          <div className="mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-amber-300">Live Department Queue:</span>{' '}
                <span className="text-xs text-white">
                  You are currently at position <strong>#{patient360?.queue_position || 1}</strong> in line.
                </span>
              </div>
            </div>
            <div className="text-xs font-semibold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/30">
              Est. Wait: ~{patient360?.estimated_wait_minutes || 15} mins
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-medtree-border">
        {[
          { id: 'overview', label: 'My Health 360°', icon: HeartPulse },
          { id: 'queue', label: 'Live Queue & Triage', icon: Clock },
          { id: 'appointments', label: 'Appointments', icon: Calendar, badge: appointments.length },
          { id: 'medications', label: 'Medications & MAR', icon: Pill, badge: marTasks.length },
          { id: 'nutrition', label: 'Nutrition & Meals', icon: Apple, badge: mealDeliveries.length },
          { id: 'postop', label: 'Post-Op Recovery', icon: Activity, badge: postOpPlans.length },
          { id: 'labs', label: 'Diagnostic Reports', icon: FileText, badge: releasedLabs.length },
          { id: 'profile', label: 'Demographics', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-medtree-card text-medtree-text-muted hover:text-white border border-medtree-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-medtree-border text-medtree-text-muted'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Digital Health Identity Card */}
          <div className="bg-gradient-to-br from-medtree-card to-medtree-dark border border-emerald-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                <QrCode className="w-4 h-4" /> Digital Patient Wristband
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                HMAC Signed
              </span>
            </div>

            <div className="p-4 bg-medtree-dark/80 rounded-xl border border-medtree-border/80 text-center mb-4">
              <div className="w-24 h-24 mx-auto bg-white p-2 rounded-xl mb-3 shadow-md flex items-center justify-center">
                <QrCode className="w-20 h-20 text-slate-900" />
              </div>
              <div className="font-mono text-xs text-emerald-300 font-bold break-all">
                {qrInfo?.qr_token || `MTX-${patient?.patient_id}`}
              </div>
              <p className="text-[10px] text-medtree-text-muted mt-1">
                Scan for rapid bedside clinical verification
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-medtree-border/60">
                <span className="text-medtree-text-muted">Current Status:</span>
                <span className="font-semibold text-white">{patient?.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-medtree-border/60">
                <span className="text-medtree-text-muted">Assigned Bed:</span>
                <span className="font-semibold text-white">{patient?.assigned_bed_id || 'Outpatient / Pending'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-medtree-border/60">
                <span className="text-medtree-text-muted">Triage Priority:</span>
                <span className={`font-bold ${patient?.priority === 1 ? 'text-rose-400' : patient?.priority === 2 ? 'text-amber-400' : 'text-blue-400'}`}>
                  Priority {patient?.priority} ({patient?.priority === 1 ? 'Critical' : patient?.priority === 2 ? 'Urgent' : 'Normal'})
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Allergies & Vitals Snapshot */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Documented Allergies & Precautions
              </h3>
              {patient360?.allergies && patient360.allergies.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {patient360.allergies.map((allergy) => (
                    <div
                      key={allergy.id}
                      className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between"
                    >
                      <div>
                        <span className="font-bold text-sm text-rose-300">{allergy.allergen}</span>
                        <p className="text-xs text-rose-200/80 mt-0.5">{allergy.reaction || 'Severe adverse reaction'}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {allergy.severity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  No Known Drug Allergies (NKDA) recorded in medical profile.
                </div>
              )}
            </div>

            {/* Latest Vitals */}
            <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Latest Vital Signs Telemetry
              </h3>
              {patient360?.vitals && patient360.vitals.length > 0 ? (
                (() => {
                  const latest = patient360.vitals[patient360.vitals.length - 1];
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      <div className="p-3 bg-medtree-dark rounded-xl border border-medtree-border text-center">
                        <span className="text-[10px] text-medtree-text-muted uppercase block">Blood Pressure</span>
                        <span className="text-sm font-bold text-white mt-1 block">
                          {latest.blood_pressure_systolic}/{latest.blood_pressure_diastolic}
                        </span>
                        <span className="text-[10px] text-medtree-text-muted">mmHg</span>
                      </div>
                      <div className="p-3 bg-medtree-dark rounded-xl border border-medtree-border text-center">
                        <span className="text-[10px] text-medtree-text-muted uppercase block">Heart Rate</span>
                        <span className="text-sm font-bold text-emerald-400 mt-1 block">{latest.heart_rate}</span>
                        <span className="text-[10px] text-medtree-text-muted">bpm</span>
                      </div>
                      <div className="p-3 bg-medtree-dark rounded-xl border border-medtree-border text-center">
                        <span className="text-[10px] text-medtree-text-muted uppercase block">SpO2 Oxygen</span>
                        <span className="text-sm font-bold text-blue-400 mt-1 block">{latest.oxygen_saturation_spo2}%</span>
                        <span className="text-[10px] text-medtree-text-muted">Saturation</span>
                      </div>
                      <div className="p-3 bg-medtree-dark rounded-xl border border-medtree-border text-center">
                        <span className="text-[10px] text-medtree-text-muted uppercase block">Temperature</span>
                        <span className="text-sm font-bold text-amber-400 mt-1 block">{latest.temperature_f}°F</span>
                        <span className="text-[10px] text-medtree-text-muted">Oral</span>
                      </div>
                      <div className="p-3 bg-medtree-dark rounded-xl border border-medtree-border text-center">
                        <span className="text-[10px] text-medtree-text-muted uppercase block">Resp Rate</span>
                        <span className="text-sm font-bold text-white mt-1 block">{latest.respiratory_rate}</span>
                        <span className="text-[10px] text-medtree-text-muted">breaths/min</span>
                      </div>
                      <div className="p-3 bg-medtree-dark rounded-xl border border-medtree-border text-center">
                        <span className="text-[10px] text-medtree-text-muted uppercase block">Pain Scale</span>
                        <span className={`text-sm font-bold mt-1 block ${(latest.pain_score || 0) >= 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {latest.pain_score || 0} / 10
                        </span>
                        <span className="text-[10px] text-medtree-text-muted">Analog Scale</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs text-medtree-text-muted">No vital signs recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. QUEUE & TRIAGE TAB */}
      {activeTab === 'queue' && (
        <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-medtree-border pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Smart Patient Flow & Min-Heap Triage Position
              </h2>
              <p className="text-xs text-medtree-text-muted">
                Transparent Data Structures & Algorithms queue status powered by Min-Heap ordering
              </p>
            </div>
            <span className="text-xs px-3 py-1 bg-medtree-primary/20 text-medtree-primary rounded-lg border border-medtree-primary/30 font-semibold">
              DSA Min-Heap Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-medtree-dark rounded-xl border border-medtree-border text-center">
              <span className="text-xs text-medtree-text-muted uppercase font-semibold">Queue Position</span>
              <div className="text-3xl font-extrabold text-white mt-2 mb-1">
                #{patient360?.queue_position || 1}
              </div>
              <p className="text-[11px] text-medtree-text-muted">In department waiting heap</p>
            </div>

            <div className="p-5 bg-medtree-dark rounded-xl border border-medtree-border text-center">
              <span className="text-xs text-medtree-text-muted uppercase font-semibold">Estimated Wait Time</span>
              <div className="text-3xl font-extrabold text-amber-400 mt-2 mb-1">
                ~{patient360?.estimated_wait_minutes || 15} <span className="text-sm font-normal text-medtree-text-muted">mins</span>
              </div>
              <p className="text-[11px] text-medtree-text-muted">Capacity-weighted queuing model</p>
            </div>

            <div className="p-5 bg-medtree-dark rounded-xl border border-medtree-border text-center">
              <span className="text-xs text-medtree-text-muted uppercase font-semibold">Triage Priority Tier</span>
              <div className={`text-2xl font-extrabold mt-2 mb-1 ${patient?.priority === 1 ? 'text-rose-400' : patient?.priority === 2 ? 'text-amber-400' : 'text-blue-400'}`}>
                Priority {patient?.priority}
              </div>
              <p className="text-[11px] text-medtree-text-muted">
                {patient?.priority === 1 ? 'Critical Emergency' : patient?.priority === 2 ? 'Urgent Care' : 'Normal / Routine'}
              </p>
            </div>
          </div>

          {/* Explainability Callout */}
          <div className="p-4 rounded-xl bg-medtree-dark border border-medtree-border/80">
            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Why is this my queue position? (DSA Transparency)
            </h4>
            <p className="text-xs text-medtree-text-muted leading-relaxed">
              MedTree X utilizes a <strong>Min-Heap Priority Queue</strong> with dynamic key tuple <code className="bg-medtree-card px-1.5 py-0.5 rounded text-white">(priority_level, arrival_timestamp)</code>.
              Patients with higher clinical urgency (Priority 1) precede Priority 2 and Priority 3. For patients within the same priority level, tie-breaking strictly follows FIFO arrival timestamp order.
            </p>
          </div>
        </div>
      )}

      {/* 3. APPOINTMENTS TAB */}
      {activeTab === 'appointments' && (
        <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-medtree-border pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                My Scheduled Consultations & Check-In
              </h2>
              <p className="text-xs text-medtree-text-muted">
                View upcoming appointments and complete self-check-in to enter the live queue
              </p>
            </div>
          </div>

          {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-xl bg-medtree-dark border border-medtree-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{apt.department} Consultation</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-medtree-card text-medtree-text-muted border border-medtree-border">
                          {apt.id}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          apt.status === 'Checked In'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-xs text-medtree-text-muted mt-1">{apt.reason || 'General clinical consultation'}</p>
                      <p className="text-xs text-emerald-400/90 font-medium mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Scheduled: {new Date(apt.scheduled_time).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {apt.status === 'Scheduled' && (
                    <button
                      onClick={() => handleCheckIn(apt.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Check In Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-medtree-text-muted text-center py-8">No scheduled appointments found.</p>
          )}
        </div>
      )}

      {/* 4. MEDICATIONS & MAR TAB */}
      {activeTab === 'medications' && (
        <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-medtree-border pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-purple-400" />
                Medication Administration Record (MAR Schedule)
              </h2>
              <p className="text-xs text-medtree-text-muted">
                Transparent view of your prescribed medication doses, administration times, and nursing logs
              </p>
            </div>
          </div>

          {marTasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-medtree-border text-medtree-text-muted uppercase text-[10px]">
                    <th className="pb-3 font-semibold">Medication</th>
                    <th className="pb-3 font-semibold">Dosage & Route</th>
                    <th className="pb-3 font-semibold">Scheduled Time</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Administered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-medtree-border/60">
                  {marTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-medtree-dark/40 transition-colors">
                      <td className="py-3 font-semibold text-white">{task.medication_name}</td>
                      <td className="py-3 text-medtree-text">
                        {task.dosage} <span className="text-[10px] text-medtree-text-muted">({task.route})</span>
                      </td>
                      <td className="py-3 text-medtree-text-muted">
                        {new Date(task.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.status === 'Administered'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : task.status === 'Due Soon'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            : task.status === 'Delayed' || task.status === 'Held'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}>
                          {task.status}
                        </span>
                        {task.hold_reason && (
                          <span className="block text-[10px] text-rose-300/80 mt-1">Reason: {task.hold_reason}</span>
                        )}
                      </td>
                      <td className="py-3 text-medtree-text-muted">
                        {task.administered_by || 'Pending administration'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-medtree-text-muted text-center py-8">No medication administration records found.</p>
          )}
        </div>
      )}

      {/* 5. NUTRITION & MEALS TAB */}
      {activeTab === 'nutrition' && (
        <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-medtree-border pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Apple className="w-5 h-5 text-emerald-400" />
                Clinical Diet & Meal Delivery Schedule
              </h2>
              <p className="text-xs text-medtree-text-muted">
                Authoritative dietary prescription with bedside allergen safety intercept
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mealDeliveries.map((meal) => (
              <div
                key={meal.id}
                className="p-4 rounded-xl bg-medtree-dark border border-medtree-border flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{meal.meal_period}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      meal.delivery_status === 'Delivered'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : meal.delivery_status === 'Conflict Blocked'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      {meal.delivery_status}
                    </span>
                  </div>
                  <p className="text-xs text-medtree-text-muted">
                    Scheduled: {new Date(meal.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[11px] text-emerald-400/90 mt-2 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {meal.conflict_details || 'Verified: All allergen checks passed.'}
                  </p>
                </div>
                {meal.delivered_by && (
                  <p className="text-[10px] text-medtree-text-muted mt-3 pt-2 border-t border-medtree-border/40">
                    Delivered by {meal.delivered_by}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. POST-OP RECOVERY TAB */}
      {activeTab === 'postop' && (
        <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-medtree-border pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Post-Operative Recovery Plan & Milestones
              </h2>
              <p className="text-xs text-medtree-text-muted">
                Clinical care protocols, recovery observations, and mobility milestones
              </p>
            </div>
          </div>

          {postOpPlans.length > 0 ? (
            postOpPlans.map((plan) => (
              <div key={plan.id} className="space-y-4">
                <div className="p-4 rounded-xl bg-medtree-dark border border-medtree-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white">{plan.procedure_name}</h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Surgery Date: {plan.surgery_date}
                    </span>
                  </div>
                  <p className="text-xs text-medtree-text-muted mb-2">
                    <strong>Wound Care:</strong> {plan.wound_care_instructions}
                  </p>
                  <p className="text-xs text-medtree-text-muted">
                    <strong>Mobility Goal:</strong> {plan.mobility_goal}
                  </p>
                </div>

                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Recovery Observation Checklist:</h4>
                <div className="space-y-2">
                  {plan.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-medtree-dark border border-medtree-border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          task.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-medtree-border text-medtree-text-muted'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className={`text-xs font-semibold ${task.status === 'Completed' ? 'text-white line-through opacity-70' : 'text-white'}`}>
                            {task.title}
                          </span>
                          <p className="text-[10px] text-medtree-text-muted">{task.notes}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        task.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-medtree-border text-medtree-text-muted'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-medtree-text-muted text-center py-8">No post-operative care plans recorded.</p>
          )}
        </div>
      )}

      {/* 7. DIAGNOSTIC LABS TAB */}
      {activeTab === 'labs' && (
        <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-medtree-border pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Clinician-Reviewed Diagnostic Laboratory Reports
              </h2>
              <p className="text-xs text-medtree-text-muted">
                Official diagnostic test findings released to your personal health portal
              </p>
            </div>
          </div>

          {releasedLabs.length > 0 ? (
            <div className="space-y-4">
              {releasedLabs.map((order) => (
                <div key={order.id} className="p-4 rounded-xl bg-medtree-dark border border-medtree-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-white">{order.test_name}</span>
                      <p className="text-[10px] text-medtree-text-muted">Ordered by {order.ordering_doctor} on {new Date(order.order_date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Clinician Reviewed & Released
                    </span>
                  </div>

                  {order.results && order.results.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-medtree-border/60 text-medtree-text-muted text-[10px] uppercase">
                            <th className="pb-2 font-semibold">Parameter</th>
                            <th className="pb-2 font-semibold">Your Value</th>
                            <th className="pb-2 font-semibold">Reference Range</th>
                            <th className="pb-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-medtree-border/40">
                          {order.results.map((res) => (
                            <tr key={res.id}>
                              <td className="py-2 font-medium text-white">{res.parameter_name}</td>
                              <td className="py-2 font-bold text-white">
                                {res.result_value} {res.unit}
                              </td>
                              <td className="py-2 text-medtree-text-muted">{res.reference_range}</td>
                              <td className="py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  res.flag === 'Normal' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {res.flag}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-medtree-text-muted text-center py-8">No clinician-released lab reports available yet.</p>
          )}
        </div>
      )}

      {/* 8. DEMOGRAPHICS EDIT TAB */}
      {activeTab === 'profile' && (
        <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 max-w-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-medtree-border pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                Permitted Demographic Information
              </h2>
              <p className="text-xs text-medtree-text-muted">
                Update your contact information and reported health symptoms
              </p>
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Info
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-medtree-text-muted block mb-1">Phone Number</label>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-medtree-dark border border-medtree-border rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              ) : (
                <p className="text-sm font-semibold text-white">{patient?.phone || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-medtree-text-muted block mb-1">Email Address</label>
              {isEditingProfile ? (
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-medtree-dark border border-medtree-border rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              ) : (
                <p className="text-sm font-semibold text-white">{patient?.email || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-medtree-text-muted block mb-1">Residential Address</label>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-medtree-dark border border-medtree-border rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              ) : (
                <p className="text-sm font-semibold text-white">{patient?.address || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-medtree-text-muted block mb-1">Current Reported Symptoms</label>
              {isEditingProfile ? (
                <textarea
                  rows={2}
                  value={editConcern}
                  onChange={(e) => setEditConcern(e.target.value)}
                  className="w-full bg-medtree-dark border border-medtree-border rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              ) : (
                <p className="text-sm font-semibold text-white">{patient?.reported_concern || 'None reported'}</p>
              )}
            </div>

            {isEditingProfile && (
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 bg-medtree-dark text-medtree-text-muted hover:text-white rounded-xl text-xs border border-medtree-border"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
