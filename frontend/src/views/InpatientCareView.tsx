import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Patient, Bed, MARTask, PostOpCarePlan } from '../types';
import {
  HeartPulse, Pill, Clock, Activity, CheckCircle2,
  AlertTriangle, Plus, ShieldAlert, ArrowRight, UserCheck,
  Stethoscope, FileText, Check, X
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';

interface InpatientCareViewProps {
  onSelectPatient: (patientId: string) => void;
}

export const InpatientCareView: React.FC<InpatientCareViewProps> = ({
  onSelectPatient,
}) => {
  const { user } = useAuth();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('PT-101');
  const [marTasks, setMarTasks] = useState<MARTask[]>([]);
  const [dueTasks, setDueTasks] = useState<MARTask[]>([]);
  const [postOpPlans, setPostOpPlans] = useState<PostOpCarePlan[]>([]);
  const [vitalsTrends, setVitalsTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Vitals Form State
  const [bpSystolic, setBpSystolic] = useState(124);
  const [bpDiastolic, setBpDiastolic] = useState(78);
  const [heartRate, setHeartRate] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [tempF, setTempF] = useState(98.6);
  const [respRate, setRespRate] = useState(16);
  const [painScore, setPainScore] = useState(2);
  const [isSubmittingVitals, setIsSubmittingVitals] = useState(false);

  // Hold Modal State
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [holdAction, setHoldAction] = useState<'Held' | 'Delayed' | 'Omitted'>('Held');

  const nurseName = user?.full_name || 'Nurse Sarah Jenkins, RN';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bds, dueM] = await Promise.all([
        api.getBeds(),
        api.getDueMAR().catch(() => []),
      ]);
      setBeds(bds);
      setDueTasks(dueM);

      if (selectedPatientId) {
        await loadPatientSpecificData(selectedPatientId);
      }
    } catch (err) {
      console.error('Failed to load inpatient care data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatientSpecificData = async (pid: string) => {
    try {
      const [mar, pop, trends] = await Promise.all([
        api.getPatientMAR(pid).catch(() => []),
        api.getPostOpPlans(pid).catch(() => []),
        api.getVitalsTrends(pid).catch(() => ({ trends: [] })),
      ]);
      setMarTasks(mar);
      setPostOpPlans(pop);
      setVitalsTrends(trends.trends || []);
    } catch (err) {
      console.error('Failed to load patient specific inpatient data', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientSpecificData(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleAdminister = async (taskId: string) => {
    try {
      await api.administerMedication(taskId, nurseName, 'Verified right patient, drug, dose, route, time.');
      await loadData();
      alert('Medication administration recorded successfully in patient MAR.');
    } catch (err: any) {
      alert(err.message || 'Administration failed');
    }
  };

  const handleOpenHoldModal = (taskId: string) => {
    setSelectedTaskId(taskId);
    setHoldReason('');
    setIsHoldModalOpen(true);
  };

  const handleConfirmHold = async () => {
    if (!selectedTaskId || !holdReason.trim()) {
      alert('Mandatory clinical rationale required to hold or delay medication dose.');
      return;
    }
    try {
      await api.holdMedication(selectedTaskId, holdReason, holdAction, nurseName);
      setIsHoldModalOpen(false);
      await loadData();
      alert(`Dose recorded as ${holdAction}. Timeline and audit trail updated.`);
    } catch (err: any) {
      alert(err.message || 'Failed to document medication hold');
    }
  };

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingVitals(true);
    try {
      await api.recordInpatientVitals(selectedPatientId, {
        blood_pressure_systolic: Number(bpSystolic),
        blood_pressure_diastolic: Number(bpDiastolic),
        heart_rate: Number(heartRate),
        oxygen_saturation_spo2: Number(spo2),
        temperature_f: Number(tempF),
        respiratory_rate: Number(respRate),
        pain_score: Number(painScore),
      }, nurseName);

      await loadPatientSpecificData(selectedPatientId);
      alert('Vital signs & pain score successfully logged to electronic telemetry record!');
    } catch (err: any) {
      alert(err.message || 'Failed to record vitals');
    } finally {
      setIsSubmittingVitals(false);
    }
  };

  const handleCompletePostOpTask = async (taskId: string) => {
    try {
      await api.completePostOpTask(taskId, nurseName, 'Routine observation verified stable.');
      await loadPatientSpecificData(selectedPatientId);
      alert('Post-operative recovery task confirmed completed!');
    } catch (err: any) {
      alert(err.message || 'Failed to complete task');
    }
  };

  const occupiedBeds = beds.filter((b) => b.status === 'Occupied' && b.current_patient_id);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Inpatient Care Cockpit Header */}
      <div className="bg-gradient-to-r from-medtree-card via-medtree-card to-pink-950/30 border border-pink-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <HeartPulse className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">Inpatient Care & MAR Medication Administration</h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
              Inpatient Floor / ICU Ward
            </span>
          </div>
          <p className="text-xs text-medtree-text-muted">
            Nurse: <strong>{nurseName}</strong> • Administer scheduled doses, document clinical holds, record vitals & pain scores
          </p>
        </div>

        {/* Overdue Alert Banner */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-medtree-dark rounded-xl border border-medtree-border flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <div>
              <span className="text-xs text-medtree-text-muted">Due Hospital-Wide:</span>
              <span className="text-xs font-bold text-amber-300 ml-1.5">{dueTasks.length} Doses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inpatient Bed Selector Carousel */}
      <div className="bg-medtree-card border border-medtree-border rounded-2xl p-4">
        <label className="text-xs font-semibold text-medtree-text-muted uppercase tracking-wider mb-2.5 block">
          Select Admitted Patient / Bed Unit:
        </label>
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {occupiedBeds.map((bed) => {
            const isSelected = bed.current_patient_id === selectedPatientId;
            return (
              <button
                key={bed.bed_id}
                onClick={() => setSelectedPatientId(bed.current_patient_id!)}
                className={`px-4 py-2.5 rounded-xl text-left border transition-all whitespace-nowrap shrink-0 flex items-center gap-3 ${
                  isSelected
                    ? 'bg-pink-600/20 border-pink-500 text-white shadow-md'
                    : 'bg-medtree-dark border-medtree-border text-medtree-text-muted hover:text-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isSelected ? 'bg-pink-500 text-white' : 'bg-medtree-border text-medtree-text-muted'
                }`}>
                  {bed.ward.substring(0, 3)}
                </div>
                <div>
                  <span className="font-bold text-xs block text-white">{bed.bed_id}</span>
                  <span className="text-[10px] text-medtree-text-muted font-mono">{bed.current_patient_id}</span>
                </div>
              </button>
            );
          })}
          {occupiedBeds.length === 0 && (
            <p className="text-xs text-medtree-text-muted">No admitted patients currently occupying inpatient beds.</p>
          )}
        </div>
      </div>

      {/* Main Grid: MAR Administration Table & Inpatient Vitals Logging */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: MAR (Medication Administration Records) */}
        <div className="lg:col-span-7 bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-medtree-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-400" />
                Medication Administration Record (MAR Schedule)
              </h3>
              <p className="text-xs text-medtree-text-muted">Patient {selectedPatientId} scheduled administration tasks</p>
            </div>
            <button
              onClick={() => onSelectPatient(selectedPatientId)}
              className="text-xs text-medtree-primary hover:underline font-semibold"
            >
              Patient 360°
            </button>
          </div>

          {marTasks.length > 0 ? (
            <div className="space-y-3">
              {marTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl bg-medtree-dark border border-medtree-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{task.medication_name}</span>
                      <span className="text-xs text-purple-300 font-semibold">{task.dosage}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-medtree-card text-medtree-text-muted border border-medtree-border">
                        {task.route}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
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
                    </div>

                    <p className="text-xs text-medtree-text-muted">
                      Scheduled: <strong>{new Date(task.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                      {task.administered_by && ` • Given by: ${task.administered_by}`}
                    </p>

                    {task.hold_reason && (
                      <p className="text-xs text-rose-300 font-medium bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                        Hold Rationale: {task.hold_reason}
                      </p>
                    )}
                  </div>

                  {task.status !== 'Administered' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAdminister(task.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Administer
                      </button>
                      <button
                        onClick={() => handleOpenHoldModal(task.id)}
                        className="px-3 py-1.5 bg-medtree-card hover:bg-medtree-border/40 text-medtree-text-muted hover:text-white rounded-lg text-xs border border-medtree-border transition-colors"
                      >
                        Hold / Delay
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-medtree-text-muted text-center py-8">No medication administration records for this patient.</p>
          )}
        </div>

        {/* Right Column: Vitals Telemetry with Pain Score & Post-Op Checklist */}
        <div className="lg:col-span-5 space-y-6">
          {/* Vitals Entry Form */}
          <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-medtree-border pb-3">
              <Activity className="w-4 h-4 text-emerald-400" />
              Log Inpatient Vitals & Pain Score
            </h3>

            <form onSubmit={handleRecordVitals} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-medtree-text-muted block mb-1">Blood Pressure (Systolic / Diastolic)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={bpSystolic}
                      onChange={(e) => setBpSystolic(Number(e.target.value))}
                      className="w-full bg-medtree-dark border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                      placeholder="Systolic"
                      required
                    />
                    <span className="text-medtree-text-muted">/</span>
                    <input
                      type="number"
                      value={bpDiastolic}
                      onChange={(e) => setBpDiastolic(Number(e.target.value))}
                      className="w-full bg-medtree-dark border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                      placeholder="Diastolic"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-medtree-text-muted block mb-1">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(Number(e.target.value))}
                    className="w-full bg-medtree-dark border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-medtree-text-muted block mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(Number(e.target.value))}
                    className="w-full bg-medtree-dark border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-medtree-text-muted block mb-1">Temp (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempF}
                    onChange={(e) => setTempF(Number(e.target.value))}
                    className="w-full bg-medtree-dark border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-medtree-text-muted block mb-1">Resp Rate</label>
                  <input
                    type="number"
                    value={respRate}
                    onChange={(e) => setRespRate(Number(e.target.value))}
                    className="w-full bg-medtree-dark border border-medtree-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                    required
                  />
                </div>
              </div>

              {/* Visual Pain Scale 0-10 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-medtree-text-muted">Pain Score (0 No Pain to 10 Worst)</label>
                  <span className={`text-xs font-bold ${painScore >= 7 ? 'text-rose-400' : painScore >= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {painScore} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painScore}
                  onChange={(e) => setPainScore(Number(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingVitals}
                className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {isSubmittingVitals ? 'Recording Telemetry...' : 'Log Telemetry & Check Red Flags'}
              </button>
            </form>
          </div>

          {/* Vitals Trend Chart */}
          {vitalsTrends.length > 0 && (
            <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Inpatient Telemetry Trends (HR & SpO2 & Pain)
              </h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalsTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#233554" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 150]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="heart_rate" stroke="#10b981" name="Heart Rate (bpm)" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="spo2" stroke="#38bdf8" name="SpO2 (%)" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="pain_score" stroke="#f43f5e" name="Pain Score (0-10)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Post-Op Recovery Tasks Checklist */}
          {postOpPlans.length > 0 && (
            <div className="bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-medtree-border pb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Post-Op Recovery Protocol Checklist
              </h3>
              <div className="space-y-2">
                {postOpPlans[0].tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-medtree-dark border border-medtree-border flex items-center justify-between"
                  >
                    <div>
                      <span className={`text-xs font-semibold ${task.status === 'Completed' ? 'text-white line-through opacity-60' : 'text-white'}`}>
                        {task.title}
                      </span>
                      <p className="text-[10px] text-medtree-text-muted">{task.notes}</p>
                    </div>

                    {task.status !== 'Completed' ? (
                      <button
                        onClick={() => handleCompletePostOpTask(task.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shrink-0"
                      >
                        Complete
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hold Medication Modal */}
      {isHoldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-medtree-card border border-medtree-border rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-medtree-border pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Document Medication Hold / Delay
              </h3>
              <button
                onClick={() => setIsHoldModalOpen(false)}
                className="text-medtree-text-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-medtree-text-muted block mb-1">Action Type</label>
              <select
                value={holdAction}
                onChange={(e) => setHoldAction(e.target.value as any)}
                className="w-full bg-medtree-dark border border-medtree-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Held">Held (Temporarily suspended for clinical reason)</option>
                <option value="Delayed">Delayed (Rescheduled to later time)</option>
                <option value="Omitted">Omitted (Skipped per physician order)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-medtree-text-muted block mb-1">Mandatory Clinical Rationale</label>
              <textarea
                rows={3}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="Document clinical reason (e.g. Patient nauseous, pending procedure, physician order)..."
                className="w-full bg-medtree-dark border border-medtree-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsHoldModalOpen(false)}
                className="px-4 py-2 bg-medtree-dark text-medtree-text-muted hover:text-white rounded-xl text-xs border border-medtree-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHold}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                Confirm & Record in Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
