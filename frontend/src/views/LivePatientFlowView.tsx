import React, { useEffect, useState } from 'react';
import {
  Users, Activity, Clock, ShieldAlert, AlertCircle, Search, Filter,
  ArrowRight, CheckCircle2, ChevronRight, Stethoscope, Bed, RefreshCw, X
} from 'lucide-react';
import { api } from '../services/api';
import { Patient, QueueItem } from '../types';
import { PriorityBadge, WorkflowBadge } from '../components/StatusBadge';

interface LivePatientFlowViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenRegister: () => void;
}

export const LivePatientFlowView: React.FC<LivePatientFlowViewProps> = ({
  onSelectPatient,
  onOpenRegister,
}) => {
  const [queueData, setQueueData] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Status transition modal state
  const [transitionPatient, setTransitionPatient] = useState<Patient | null>(null);
  const [newStatus, setNewStatus] = useState<string>('In Treatment');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Priority update modal state
  const [priorityPatient, setPriorityPatient] = useState<Patient | null>(null);
  const [newPriority, setNewPriority] = useState<number>(1);
  const [priorityReason, setPriorityReason] = useState<string>('');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  // Calling next patient
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [callAlert, setCallAlert] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const [qRes, pRes] = await Promise.all([
        api.getLiveQueue(),
        api.getPatients(),
      ]);
      setQueueData(qRes);
      setPatients(pRes);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleCallNext = async () => {
    try {
      setIsCallingNext(true);
      const res = await api.callNextPatient('Triage Officer');
      setCallAlert(`Extracted ${res.called_patient} (${res.patient_name}) from Min-Heap. Moved to 'In Treatment'.`);
      await loadAll();
      setTimeout(() => setCallAlert(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Error calling next patient');
    } finally {
      setIsCallingNext(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionPatient) return;
    try {
      setIsUpdatingStatus(true);
      await api.updatePatientStatus(transitionPatient.patient_id, newStatus, statusNotes);
      setTransitionPatient(null);
      setStatusNotes('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePrioritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priorityPatient) return;
    try {
      setIsUpdatingPriority(true);
      await api.updatePatientPriority(priorityPatient.patient_id, newPriority, priorityReason);
      setPriorityPatient(null);
      setPriorityReason('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update priority');
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  // Filter patients
  const filteredPatients = patients.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        p.patient_id.toLowerCase().includes(q) ||
        p.full_name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        p.reported_concern.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (priorityFilter !== 'All' && p.priority.toString() !== priorityFilter) return false;
    if (departmentFilter !== 'All' && p.department !== departmentFilter) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {callAlert && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{callAlert}</span>
          </div>
          <button onClick={() => setCallAlert(null)} className="text-emerald-700">✕</button>
        </div>
      )}

      {/* Top Section: Next Patient selected by Priority Min-Heap */}
      {queueData?.next_patient ? (
        <div className="bg-white rounded-2xl border border-[#E8E4C9] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[#FFF7F2] text-[#EC5E27] border border-[#EC5E27]/20">
                Min-Heap Queue Root • Next in Line
              </span>
              <PriorityBadge priority={queueData.next_patient.node.priority} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold font-mono text-[#EC5E27]">{queueData.next_patient.node.patient_id}</span>
              <span className="text-lg font-bold text-[#251E1A]">{queueData.next_patient.node.patient_name}</span>
              <span className="text-xs text-[#736860] font-medium">• {queueData.next_patient.node.department}</span>
            </div>
            <p className="text-xs text-[#736860]">
              Complaint: <span className="text-[#251E1A] font-semibold">{queueData.next_patient.node.reported_concern || 'N/A'}</span>
            </p>
            <p className="text-[11px] text-[#EC5E27] bg-[#FDFDF1] p-3 rounded-xl border border-[#E8E4C9] mt-1">
              <strong>Triage Invariant Reason:</strong> {queueData.next_patient.explanation}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={handleCallNext}
              disabled={isCallingNext}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Activity className="w-4 h-4 text-[#FFF3EC]" />
              <span>{isCallingNext ? 'Extracting from Heap...' : 'Dispatch for Treatment'}</span>
            </button>
            <button
              onClick={() => onSelectPatient(queueData.next_patient.node.patient_id)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold bg-[#FDFDF1] hover:bg-[#FFF3EC] text-[#EC5E27] border border-[#E8E4C9] transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>View 360°</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl border border-[#E8E4C9] text-center text-sm font-semibold text-[#736860] shadow-sm">
          Waiting queue is currently empty. All patients have been dispatched or discharged.
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#E8E4C9] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8E8278] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by ID, name, phone, or symptom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-full border border-[#E8E4C9] bg-[#FDFDF1] focus:bg-white focus:outline-none focus:border-[#EC5E27] text-[#251E1A] shadow-2xs"
            />
          </div>

          {/* Quick Registration Button */}
          <button
            onClick={onOpenRegister}
            className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] shadow-sm hover:shadow-md transition-all shrink-0"
          >
            + Register New Patient
          </button>
        </div>

        {/* Filter Pills (Oval Boxes) */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#E8E4C9]/60 text-xs text-[#736860]">
          <span className="font-bold flex items-center gap-1.5 text-[#EC5E27]">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </span>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-bold text-[#251E1A] focus:outline-none focus:border-[#EC5E27] shadow-2xs"
          >
            <option value="All">All Priorities</option>
            <option value="1">Priority 1 — Critical</option>
            <option value="2">Priority 2 — Urgent</option>
            <option value="3">Priority 3 — Normal</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-bold text-[#251E1A] focus:outline-none focus:border-[#EC5E27] shadow-2xs"
          >
            <option value="All">All Departments</option>
            <option value="Emergency">Emergency</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="General Medicine">General Medicine</option>
            <option value="ICU">ICU</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-full border border-[#E8E4C9] bg-[#FDFDF1] text-xs font-bold text-[#251E1A] focus:outline-none focus:border-[#EC5E27] shadow-2xs"
          >
            <option value="All">All Statuses</option>
            <option value="Waiting">Waiting</option>
            <option value="In Treatment">In Treatment</option>
            <option value="Lab Requested">Lab Requested</option>
            <option value="Observation">Observation</option>
            <option value="Completed">Completed</option>
            <option value="Referred">Referred</option>
          </select>

          <span className="ml-auto text-xs font-semibold text-[#8E8278]">
            Showing {filteredPatients.length} of {patients.length} records
          </span>
        </div>
      </div>

      {/* Patient Flow Data Table */}
      <div className="bg-white rounded-2xl border border-[#E8E4C9] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FDFDF1] text-[#736860] uppercase font-semibold text-[11px] border-b border-[#E8E4C9]">
              <tr>
                <th className="py-3.5 px-4">Patient ID</th>
                <th className="py-3.5 px-4">Name & Demographics</th>
                <th className="py-3.5 px-4">Reported Concern</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Arrival & Wait</th>
                <th className="py-3.5 px-4">Department & Care</th>
                <th className="py-3.5 px-4">Workflow Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4C9]/40 text-[#251E1A]">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => {
                  const arrivalDate = new Date(p.arrival_time * 1000);
                  const formattedTime = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const waitDurationMins = Math.max(0, Math.floor((Date.now() / 1000 - p.arrival_time) / 60));

                  return (
                    <tr key={p.patient_id} className="hover:bg-[#FDFDF1]/60 transition">
                      {/* Patient ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#EC5E27]">
                        {p.patient_id}
                        {p.is_duplicate_flag && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold" title="Duplicate Suspect">
                            DUP?
                          </span>
                        )}
                      </td>

                      {/* Name & Demographics */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#251E1A]">{p.full_name}</div>
                        <div className="text-[11px] text-[#736860]">
                          {p.gender}, {p.age}y • Blood: {p.blood_group || 'N/A'}
                        </div>
                      </td>

                      {/* Reported Concern */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-[#251E1A]">
                        {p.reported_concern || 'Routine Assessment'}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={p.priority} />
                      </td>

                      {/* Arrival & Wait */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#251E1A]">{formattedTime}</div>
                        <div className="text-[11px] text-[#736860]">
                          Waited: <strong>{waitDurationMins} min</strong>
                        </div>
                        {p.status === 'Waiting' && waitDurationMins > 30 && (
                          <div className="mt-0.5">
                            {waitDurationMins > 60 ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                APQ Aged (+1 Tier)
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                APQ Accumulating
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Department & Doctor */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#251E1A]">{p.department}</div>
                        <div className="text-[11px] text-[#736860]">
                          Doc: {p.assigned_doctor_id || 'Unassigned'}
                        </div>
                      </td>

                      {/* Workflow Status */}
                      <td className="py-3.5 px-4">
                        <WorkflowBadge status={p.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectPatient(p.patient_id)}
                            className="px-2.5 py-1 rounded-lg bg-[#FDFDF1] hover:bg-[#FFF3EC] text-[#EC5E27] font-semibold transition text-[11px] border border-[#E8E4C9]"
                            title="Open Patient 360"
                          >
                            360°
                          </button>
                          <button
                            onClick={() => {
                              setTransitionPatient(p);
                              setNewStatus(p.status);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#FFF7F2] hover:bg-[#FFF3EC] text-[#EC5E27] font-semibold transition text-[11px] border border-[#EC5E27]/20"
                            title="Update Status"
                          >
                            Status
                          </button>
                          <button
                            onClick={() => {
                              setPriorityPatient(p);
                              setNewPriority(p.priority);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold transition text-[11px] border border-amber-200"
                            title="Escalate Priority"
                          >
                            Triage
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#8E8278]">
                    No patients matching the specified filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Transition Modal */}
      {transitionPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E4C9] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4C9]">
              <h3 className="text-sm font-bold text-[#EC5E27]">
                Update Workflow Status: {transitionPatient.patient_id}
              </h3>
              <button onClick={() => setTransitionPatient(null)} className="text-[#8E8278] hover:text-[#251E1A]">✕</button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#736860] font-semibold mb-1">Target Status:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] focus:bg-white focus:outline-none focus:border-[#EC5E27] text-[#251E1A]"
                >
                  <option value="Waiting">Waiting</option>
                  <option value="In Treatment">In Treatment</option>
                  <option value="Lab Requested">Lab Requested</option>
                  <option value="Observation">Observation</option>
                  <option value="Completed">Completed</option>
                  <option value="Referred">Referred</option>
                  <option value="Discharged">Discharged</option>
                </select>
              </div>

              <div>
                <label className="block text-[#736860] font-semibold mb-1">Clinical Notes (Optional):</label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Reason for transition or clinical instructions..."
                  className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] focus:bg-white focus:outline-none focus:border-[#EC5E27] text-[#251E1A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransitionPatient(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8E4C9] text-[#736860] hover:bg-[#FDFDF1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 rounded-xl bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] font-semibold shadow-xs"
                >
                  {isUpdatingStatus ? 'Saving...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Priority Escalation Modal */}
      {priorityPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E4C9] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4C9]">
              <h3 className="text-sm font-bold text-[#EC5E27]">
                Triage Priority Escalation: {priorityPatient.patient_id}
              </h3>
              <button onClick={() => setPriorityPatient(null)} className="text-[#8E8278] hover:text-[#251E1A]">✕</button>
            </div>

            <form onSubmit={handlePrioritySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#736860] font-semibold mb-1">New Urgency Level:</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(parseInt(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] focus:bg-white focus:outline-none focus:border-[#EC5E27] text-[#251E1A]"
                >
                  <option value={1}>Priority 1 — Critical (Preempts queue root)</option>
                  <option value={2}>Priority 2 — Urgent</option>
                  <option value={3}>Priority 3 — Normal</option>
                </select>
              </div>

              <div>
                <label className="block text-[#736860] font-semibold mb-1">Clinical Justification (Mandatory):</label>
                <textarea
                  required
                  rows={2}
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="e.g., Acute vital deterioration, SpO2 drop, sudden chest pressure..."
                  className="w-full p-2.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] focus:bg-white focus:outline-none focus:border-[#EC5E27] text-[#251E1A]"
                />
              </div>

              <div className="text-[11px] text-[#EC5E27] bg-[#FFF7F2] p-2.5 rounded-xl border border-[#EC5E27]/20">
                Notice: Updating priority causes an O(log N) heap sift-up/down in the live Priority Queue and writes a cryptographically signed entry to the SHA-256 audit log.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPriorityPatient(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8E4C9] text-[#736860] hover:bg-[#FDFDF1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPriority || !priorityReason.trim()}
                  className="px-5 py-2 rounded-xl bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] font-semibold shadow-xs disabled:opacity-50"
                >
                  {isUpdatingPriority ? 'Reheapifying...' : 'Reheapify Priority'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
