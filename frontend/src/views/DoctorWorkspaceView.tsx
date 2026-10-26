import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Patient, Patient360, Doctor, LabOrder } from '../types';
import {
  Stethoscope, User, HeartPulse, Pill, FileText, Activity,
  CheckCircle2, AlertTriangle, ArrowRight, Plus, Send, Clock,
  ShieldCheck, Sparkles, Apple
} from 'lucide-react';

interface DoctorWorkspaceViewProps {
  onSelectPatient: (patientId: string) => void;
}

export const DoctorWorkspaceView: React.FC<DoctorWorkspaceViewProps> = ({
  onSelectPatient,
}) => {
  const { user, doctorId } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('PT-101');
  const [patient360, setPatient360] = useState<Patient360 | null>(null);
  const [activeDoctor, setActiveDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Clinical Order Forms State
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('Twice daily');
  const [isSubmittingMed, setIsSubmittingMed] = useState(false);

  // Diet Order State
  const [dietType, setDietType] = useState('Cardiac');
  const [dietTexture, setDietTexture] = useState('Standard');
  const [isNPO, setIsNPO] = useState(false);
  const [dietRestricted, setDietRestricted] = useState('Peanuts, Shellfish');

  // Post-Op Care Plan State
  const [procedureName, setProcedureName] = useState('Percutaneous Coronary Angioplasty');
  const [woundInstructions, setWoundInstructions] = useState('Maintain dry compressive dressing intact.');
  const [mobilityGoal, setMobilityGoal] = useState('Bedside sitting Day 1, Assisted ambulation Day 2.');

  // Lab Order State
  const [labTestName, setLabTestName] = useState('Complete Blood Count (CBC)');

  const docId = doctorId || 'DOC-101';

  const loadDoctorData = async () => {
    setIsLoading(true);
    try {
      const [allPts, doctors] = await Promise.all([
        api.getPatients(),
        api.getDoctors(),
      ]);

      const doc = doctors.find((d: Doctor) => d.doctor_id === docId) || doctors[0];
      setActiveDoctor(doc);

      // Filter patients assigned to this doctor or in doctor's department
      const docPatients = allPts.filter(
        (p) => p.assigned_doctor_id === doc?.doctor_id || p.department === doc?.department
      );
      setPatients(docPatients.length > 0 ? docPatients : allPts);

      if (docPatients.length > 0 && !selectedPatientId) {
        setSelectedPatientId(docPatients[0].patient_id);
      }
    } catch (err) {
      console.error('Failed to load doctor workspace', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatient360 = async (pid: string) => {
    try {
      const pData = await api.getPatient360(pid);
      setPatient360(pData);
    } catch (err) {
      console.error('Failed to load patient 360', err);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [docId]);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatient360(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handlePrescribeMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim() || !newMedDosage.trim()) return;
    setIsSubmittingMed(true);
    try {
      // 1. Add medication to patient
      await fetch(`/api/patients/${selectedPatientId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: 'In Treatment',
          actor: activeDoctor?.name || 'Attending Physician',
          notes: `Prescribed ${newMedName} ${newMedDosage} (${newMedFreq})`,
        }),
      });

      // 2. Generate scheduled MAR administration tasks
      await api.generateMARSchedule(selectedPatientId);
      await loadPatient360(selectedPatientId);
      setNewMedName('');
      setNewMedDosage('');
      alert(`Medication '${newMedName}' ordered. MAR administration schedules generated!`);
    } catch (err: any) {
      alert(err.message || 'Failed to prescribe medication');
    } finally {
      setIsSubmittingMed(false);
    }
  };

  const handleCreatePostOpPlan = async () => {
    try {
      await api.createPostOpPlan({
        patient_id: selectedPatientId,
        doctor_id: activeDoctor?.doctor_id || 'DOC-101',
        procedure_name: procedureName,
        surgery_date: new Date().toISOString().split('T')[0],
        wound_care_instructions: woundInstructions,
        mobility_goal: mobilityGoal,
      });
      await loadPatient360(selectedPatientId);
      alert('Post-operative recovery care plan and observation tasks initialized!');
    } catch (err: any) {
      alert(err.message || 'Failed to initialize post-op plan');
    }
  };

  const handleOrderDiet = async () => {
    try {
      await api.createDietOrder({
        patient_id: selectedPatientId,
        diet_type: isNPO ? 'NPO' : dietType,
        allergens_restricted: dietRestricted,
        texture: dietTexture,
        is_npo: isNPO,
        ordering_clinician: activeDoctor?.name || 'Attending Physician',
        notes: `Diet order confirmed by ${activeDoctor?.name}`,
      });
      await loadPatient360(selectedPatientId);
      alert(`Diet order '${isNPO ? 'NPO (Fasting)' : dietType}' saved and dispatched to dietary unit.`);
    } catch (err: any) {
      alert(err.message || 'Failed to order diet');
    }
  };

  const handleReleaseLab = async (orderId: string) => {
    try {
      await api.releaseLabToPatient(orderId, activeDoctor?.name || 'Attending Physician', 'Reviewed & cleared by physician');
      await loadPatient360(selectedPatientId);
      alert(`Lab order ${orderId} released to Patient Portal!`);
    } catch (err: any) {
      alert(err.message || 'Failed to release lab report');
    }
  };

  const p = patient360?.patient;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Clinician Header Bar */}
      <div className="bg-gradient-to-r from-medtree-card via-medtree-card to-blue-950/40 border border-blue-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Stethoscope className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">Physician Clinical Workspace</h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {activeDoctor?.name || 'Attending Physician'}
            </span>
          </div>
          <p className="text-xs text-medtree-text-muted">
            Department: {activeDoctor?.department || 'Emergency Medicine'} • Duty: {activeDoctor?.duty_status || 'On Duty'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-medtree-text-muted">Active Patients:</span>
          <span className="text-xs font-bold text-white bg-medtree-dark px-2.5 py-1 rounded-lg border border-medtree-border">
            {patients.length} In Roster
          </span>
        </div>
      </div>

      {/* Main Split Layout: Patient Roster (Left) & Clinical Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assigned Patient Roster */}
        <div className="lg:col-span-4 bg-medtree-card border border-medtree-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-medtree-border pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Patient Roster
            </h3>
            <span className="text-xs text-medtree-text-muted">{patients.length} assigned</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {patients.map((pat) => {
              const isSelected = pat.patient_id === selectedPatientId;
              return (
                <div
                  key={pat.patient_id}
                  onClick={() => setSelectedPatientId(pat.patient_id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500 text-white shadow-md'
                      : 'bg-medtree-dark border-medtree-border hover:border-medtree-border/80 text-medtree-text-muted hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      {pat.full_name}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                      pat.priority === 1 ? 'bg-rose-500/20 text-rose-300' : pat.priority === 2 ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      Priority {pat.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-medtree-text-muted line-clamp-1">{pat.reported_concern || 'Routine'}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-medtree-border/40 text-[10px]">
                    <span className="text-medtree-text-muted">{pat.patient_id} • {pat.department}</span>
                    <span className="font-semibold text-white">{pat.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Patient Clinical Management */}
        <div className="lg:col-span-8 space-y-6">
          {/* Patient Header Banner */}
          {p ? (
            <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-medtree-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{p.full_name}</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                      {p.patient_id}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      Bed: {p.assigned_bed_id || 'Unassigned'}
                    </span>
                  </div>
                  <p className="text-xs text-medtree-text-muted mt-1">
                    {p.age} yrs • {p.gender} • Blood Group: {p.blood_group} • Complaint: <em>{p.reported_concern}</em>
                  </p>
                </div>

                <button
                  onClick={() => onSelectPatient(p.patient_id)}
                  className="px-3.5 py-2 bg-medtree-dark hover:bg-medtree-border/60 text-white rounded-xl text-xs font-semibold border border-medtree-border flex items-center gap-1.5 transition-colors"
                >
                  <span>Open Full Patient 360°</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Tabs for Doctor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Prescribe Medication & Auto-Generate MAR */}
                <div className="p-4 rounded-xl bg-medtree-dark border border-medtree-border space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-purple-400" />
                    Prescribe Medication
                  </h4>
                  <form onSubmit={handlePrescribeMedication} className="space-y-2">
                    <input
                      type="text"
                      value={newMedName}
                      onChange={(e) => setNewMedName(e.target.value)}
                      placeholder="Medication name (e.g. Atorvastatin)"
                      className="w-full bg-medtree-card border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newMedDosage}
                        onChange={(e) => setNewMedDosage(e.target.value)}
                        placeholder="Dose (e.g. 20mg)"
                        className="w-full bg-medtree-card border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                        required
                      />
                      <select
                        value={newMedFreq}
                        onChange={(e) => setNewMedFreq(e.target.value)}
                        className="w-full bg-medtree-card border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                      >
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="Stat">Stat (Immediate)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingMed}
                      className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isSubmittingMed ? 'Scheduling...' : 'Prescribe & Schedule MAR'}
                    </button>
                  </form>
                </div>

                {/* 2. Authorize Clinical Diet */}
                <div className="p-4 rounded-xl bg-medtree-dark border border-medtree-border space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Apple className="w-4 h-4 text-emerald-400" />
                    Clinical Diet Order
                  </h4>
                  <div className="space-y-2">
                    <select
                      value={dietType}
                      onChange={(e) => setDietType(e.target.value)}
                      disabled={isNPO}
                      className="w-full bg-medtree-card border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Cardiac">Cardiac Rehabilitation Diet</option>
                      <option value="Diabetic">Diabetic Consistent-Carb</option>
                      <option value="Renal">Renal Low-Potassium</option>
                      <option value="Soft">Soft Pureed</option>
                      <option value="Regular">Regular Standard</option>
                    </select>

                    <label className="flex items-center gap-2 text-xs text-amber-300 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isNPO}
                        onChange={(e) => setIsNPO(e.target.checked)}
                        className="rounded border-medtree-border text-amber-500"
                      />
                      Strict NPO (Nil Per Os / Fasting)
                    </label>

                    <button
                      type="button"
                      onClick={handleOrderDiet}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Authorize Diet
                    </button>
                  </div>
                </div>

                {/* 3. Initialize Post-Op Recovery Plan */}
                <div className="p-4 rounded-xl bg-medtree-dark border border-medtree-border space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Post-Op Care Protocol
                  </h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={procedureName}
                      onChange={(e) => setProcedureName(e.target.value)}
                      placeholder="Surgical procedure"
                      className="w-full bg-medtree-card border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={handleCreatePostOpPlan}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Initiate Post-Op Care
                    </button>
                  </div>
                </div>
              </div>

              {/* Diagnostic Labs Review & Release to Patient */}
              <div className="p-5 rounded-xl bg-medtree-dark border border-medtree-border space-y-3">
                <div className="flex items-center justify-between border-b border-medtree-border pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Diagnostic Lab Reports Review & Patient Release
                  </h4>
                  <span className="text-[10px] text-medtree-text-muted">
                    Clinician verification required before releasing to Patient Portal
                  </span>
                </div>

                {patient360?.lab_orders && patient360.lab_orders.length > 0 ? (
                  <div className="space-y-3">
                    {patient360.lab_orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 bg-medtree-card rounded-lg border border-medtree-border flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">{order.test_name}</span>
                            <span className="text-[10px] text-medtree-text-muted font-mono">{order.id}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                              order.is_released_to_patient ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {order.is_released_to_patient ? 'Released to Patient' : 'Physician Review Pending'}
                            </span>
                          </div>
                          <p className="text-[11px] text-medtree-text-muted mt-0.5">
                            Results count: {order.results?.length || 0} parameter(s)
                          </p>
                        </div>

                        {!order.is_released_to_patient ? (
                          <button
                            onClick={() => handleReleaseLab(order.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Release to Patient
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmed Released
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-medtree-text-muted">No diagnostic lab orders recorded for this patient.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-medtree-text-muted bg-medtree-card border border-medtree-border rounded-2xl">
              Select a patient from the roster to view and manage clinical orders.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
