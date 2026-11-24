import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Patient, Bed, DuplicateCandidate, Appointment } from '../types';
import {
  Building2, UserPlus, Users, CheckCircle2, AlertTriangle,
  Clock, BedDouble, Calendar, ArrowRight, Search, ShieldAlert,
  Sparkles, RefreshCw
} from 'lucide-react';

interface ReceptionistWorkspaceViewProps {
  onOpenRegister: () => void;
  onSelectPatient: (patientId: string) => void;
}

export const ReceptionistWorkspaceView: React.FC<ReceptionistWorkspaceViewProps> = ({
  onOpenRegister,
  onSelectPatient,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pts, bds, dupsRes, apts] = await Promise.all([
        api.getPatients(),
        api.getBeds(),
        api.scanDuplicates().catch(() => ({ candidates: [] })),
        api.getAppointments({ status: 'Scheduled' }).catch(() => []),
      ]);
      setPatients(pts);
      setBeds(bds);
      setDuplicates(dupsRes.candidates || []);
      setAppointments(apts || []);
    } catch (err) {
      console.error('Failed to load receptionist workspace data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = async (appointmentId: string) => {
    try {
      await api.checkInAppointment(appointmentId, 'Receptionist Desk');
      await loadData();
      alert('Patient checked in and placed into waiting queue!');
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    }
  };

  const waitingPatients = patients.filter((p) => p.status === 'Waiting');
  const availableBeds = beds.filter((b) => b.status === 'Available');

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-[#251E1A]">
      {/* Reception Header Bar */}
      <div className="bg-white border border-[#E8E4C9] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-[#FFF7F2] text-[#EC5E27] border border-[#EC5E27]/20">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#EC5E27] tracking-tight">Receptionist & Patient Intake Desk</h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF3EC] text-[#EC5E27] border border-[#E8E4C9]">
              Front Desk Operations
            </span>
          </div>
          <p className="text-xs text-[#736860]">
            Intake registration, identity verification, duplicate suspect triage, and appointment check-in
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 bg-[#FDFDF1] hover:bg-[#FFF3EC] text-[#EC5E27] rounded-xl border border-[#E8E4C9] transition-colors"
            title="Refresh intake queue"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenRegister}
            className="px-4 py-2.5 bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Register Walk-In Patient
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-white border border-[#E8E4C9] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[#736860] font-bold uppercase tracking-wider">Waiting in Queue</span>
          <div className="text-2xl font-bold text-[#EC5E27] mt-1">{waitingPatients.length}</div>
          <span className="text-[11px] text-amber-700">Min-Heap Active</span>
        </div>

        <div className="bg-white border border-[#E8E4C9] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[#736860] font-bold uppercase tracking-wider">Pending Check-Ins</span>
          <div className="text-2xl font-bold text-[#EC5E27] mt-1">{appointments.length}</div>
          <span className="text-[11px] text-blue-700">Scheduled Consultations</span>
        </div>

        <div className="bg-white border border-[#E8E4C9] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[#736860] font-bold uppercase tracking-wider">Available Beds</span>
          <div className="text-2xl font-bold text-[#251E1A] mt-1">{availableBeds.length} / {beds.length}</div>
          <span className="text-[11px] text-emerald-700">Ready for Admission</span>
        </div>

        <div className="bg-white border border-[#E8E4C9] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[#736860] font-bold uppercase tracking-wider">Duplicate Suspects</span>
          <div className="text-2xl font-bold text-[#EC5E27] mt-1">{duplicates.length}</div>
          <span className="text-[11px] text-[#EC5E27]">Levenshtein Alerts</span>
        </div>
      </div>

      {/* Duplicate Candidates Alert Box (Feature 4 DSA Demonstration) */}
      {duplicates.length > 0 && (
        <div className="bg-[#FFF7F2] border border-[#EC5E27]/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#EC5E27] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#EC5E27]" />
              Duplicate Identity Suspects Detected (Feature 4: Levenshtein Matching)
            </h3>
            <span className="text-[10px] font-mono bg-white text-[#EC5E27] px-2 py-0.5 rounded border border-[#EC5E27]/20">
              Manual Human Review Required
            </span>
          </div>
          <p className="text-xs text-[#736860]">
            The duplicate-detection module identified matching demographics. Records are NEVER automatically merged. Please review before proceeding.
          </p>

          <div className="space-y-3 pt-2">
            {duplicates.map((dup, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white border border-[#E8E4C9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#251E1A]">
                      {dup.patient_1.full_name} ({dup.patient_1.patient_id})
                    </span>
                    <span className="text-xs text-[#8E8278]">vs</span>
                    <span className="font-bold text-sm text-[#251E1A]">
                      {dup.patient_2.full_name} ({dup.patient_2.patient_id})
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#FFF7F2] text-[#EC5E27] border border-[#EC5E27]/30">
                      {dup.similarity_percentage}% Similarity
                    </span>
                  </div>
                  <p className="text-xs text-[#736860]">
                    Matched fields: <strong className="text-[#EC5E27]">{dup.matched_fields.join(', ')}</strong> • Phone: {dup.patient_1.phone} vs {dup.patient_2.phone}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      alert('Confirmed: Records verified as two distinct individuals.');
                      setDuplicates(duplicates.filter((_, i) => i !== idx));
                    }}
                    className="px-3 py-1.5 bg-[#FDFDF1] hover:bg-[#FFF3EC] text-[#251E1A] rounded-xl text-xs font-semibold border border-[#E8E4C9]"
                  >
                    Confirm Distinct
                  </button>
                  <button
                    onClick={() => onSelectPatient(dup.patient_1.patient_id)}
                    className="px-3 py-1.5 bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] rounded-xl text-xs font-semibold"
                  >
                    Inspect Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Pending Appointment Check-Ins & Live Intake Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheduled Appointments Ready for Check-In */}
        <div className="bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E8E4C9] pb-3">
            <h3 className="text-sm font-bold text-[#EC5E27] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#EC5E27]" />
              Scheduled Consultations Ready for Check-In
            </h3>
            <span className="text-xs text-[#736860]">{appointments.length} scheduled</span>
          </div>

          {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3.5 rounded-xl bg-[#FDFDF1] border border-[#E8E4C9] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#251E1A]">Patient {apt.patient_id}</span>
                      <span className="text-[10px] text-[#736860] font-mono bg-white px-1.5 py-0.5 rounded border border-[#E8E4C9]">
                        {apt.id}
                      </span>
                      <span className="text-[10px] text-[#EC5E27] font-semibold">{apt.department}</span>
                    </div>
                    <p className="text-xs text-[#736860] mt-0.5">{apt.reason || 'Routine consultation'}</p>
                    <p className="text-[10px] text-[#8E8278] mt-1">
                      Time: {new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCheckIn(apt.id)}
                    className="px-3.5 py-1.5 bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] rounded-xl text-xs font-semibold shrink-0 shadow-sm transition-all"
                  >
                    Check In Patient
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8E8278] text-center py-6">No scheduled appointments pending check-in.</p>
          )}
        </div>

        {/* Rapid Patient Directory Search */}
        <div className="bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E8E4C9] pb-3">
            <h3 className="text-sm font-bold text-[#EC5E27] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#EC5E27]" />
              Patient Identity Search & Triage Dispatch
            </h3>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-[#8E8278] absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name/ID..."
                className="w-full bg-[#FDFDF1] border border-[#E8E4C9] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#251E1A] focus:outline-none focus:border-[#EC5E27]"
              />
            </div>
          </div>

          <div className="max-h-[340px] overflow-y-auto space-y-2 text-xs">
            {filteredPatients.slice(0, 10).map((p) => (
              <div
                key={p.patient_id}
                onClick={() => onSelectPatient(p.patient_id)}
                className="p-3 rounded-xl bg-[#FDFDF1] border border-[#E8E4C9] hover:border-[#EC5E27] cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#251E1A]">{p.full_name}</span>
                    <span className="text-[10px] font-mono text-[#8E8278]">({p.patient_id})</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      p.priority === 1
                        ? 'bg-[#EC5E27] text-[#FFF3EC]'
                        : p.priority === 2
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      P{p.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#736860] mt-0.5">{p.department} • Status: {p.status}</p>
                </div>

                <div className="flex items-center gap-1 text-xs text-[#EC5E27] font-semibold">
                  <span>Open 360°</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
