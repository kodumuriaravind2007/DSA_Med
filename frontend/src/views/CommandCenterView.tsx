import React, { useEffect, useState } from 'react';
import {
  Users, AlertCircle, Bed, Stethoscope, Clock, ShieldAlert,
  ArrowUpRight, TrendingUp, Activity, CheckCircle, AlertTriangle, ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, PieChart, Pie, Cell
} from 'recharts';
import { api } from '../services/api';
import { CommandCenterData } from '../types';

interface CommandCenterViewProps {
  onNavigateToQueue: () => void;
  onOpenRegister: () => void;
  onSelectPatient: (patientId: string) => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  onNavigateToQueue,
  onOpenRegister,
  onSelectPatient,
}) => {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [callMessage, setCallMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await api.getCommandCenter();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading command center analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCallNext = async () => {
    try {
      setIsCallingNext(true);
      const res = await api.callNextPatient('Command Center Triage');
      setCallMessage(`Called ${res.called_patient} (${res.patient_name}) for treatment via Min-Heap`);
      await loadData();
      setTimeout(() => setCallMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Error calling next patient');
    } finally {
      setIsCallingNext(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#7F011F] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-[#7F011F]">Loading Command Center Telemetry...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="p-4 bg-[#FAF0F2] border border-[#7F011F]/30 rounded-2xl text-[#7F011F] text-sm font-semibold">
          Failed to connect to backend: {error}
        </div>
      </div>
    );
  }

  const { kpis, load_metrics, priority_distribution, department_workload, arrivals_completions, recent_alerts } = data;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Banner / Success Toast */}
      {callMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{callMessage}</span>
          </div>
          <button onClick={() => setCallMessage(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Hospital Surge & Capacity Status Bar */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8DBC0] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-3.5 h-3.5 rounded-full animate-ping ${
            load_metrics.color === 'red' ? 'bg-[#7F011F]' : load_metrics.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
          }`} />
          <div>
            <div className="text-xs font-bold text-[#2A161B] flex items-center gap-2">
              <span>Hospital Operational Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                load_metrics.color === 'red'
                  ? 'bg-[#FAF0F2] text-[#7F011F] border-[#7F011F]/20'
                  : load_metrics.color === 'amber'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {load_metrics.status} ({load_metrics.load_score}% Index)
              </span>
            </div>
            <p className="text-[11px] text-[#6E5A5E] mt-0.5">
              Bed Occupancy: {load_metrics.bed_occupancy_pct}% • Active Ratio: {load_metrics.patient_to_doctor_ratio} : 1 Clinician Load
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCallNext}
            disabled={isCallingNext || kpis.waiting_patients === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] shadow-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            <Activity className="w-4 h-4 text-[#F5EBD0]" />
            <span>{isCallingNext ? 'Dispatching...' : 'Dispatch Next Patient (Min-Heap)'}</span>
          </button>
          <button
            onClick={onNavigateToQueue}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E8DBC0] bg-[#FAF6EC] hover:bg-[#F5EBD0] text-[#7F011F] transition flex items-center gap-1.5"
          >
            <span>Live Queue View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Prominent Critical Clinical Alerts & Urgent Notifications (Phase 3 Requirement) */}
      {recent_alerts && recent_alerts.some((a) => a.type === 'critical') && (
        <div className="bg-[#FAF0F2] border border-[#7F011F]/30 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#7F011F] flex items-center gap-2">
                <span>CRITICAL CLINICAL ALERT:</span>
                <span className="font-semibold text-[#2A161B]">{recent_alerts.find((a) => a.type === 'critical')?.title}</span>
              </div>
              <p className="text-[11px] text-[#6E5A5E] mt-0.5">
                {recent_alerts.find((a) => a.type === 'critical')?.message}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-[#7F011F] text-[#F5EBD0] rounded-full shrink-0 shadow-2xs">
            Requires Immediate Action
          </span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Patients */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="flex items-center justify-between text-[#6E5A5E] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Patients</span>
            <Users className="w-4 h-4 text-[#7F011F]" />
          </div>
          <div className="text-2xl font-bold text-[#7F011F]">{kpis.total_patients}</div>
          <div className="text-[10px] text-[#6E5A5E] mt-1">Registry indexed in BST</div>
        </div>

        {/* Waiting in Queue */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="flex items-center justify-between text-[#6E5A5E] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">In Queue</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{kpis.waiting_patients}</div>
          <div className="text-[10px] text-[#6E5A5E] mt-1">Min-Heap triage order</div>
        </div>

        {/* Critical Cases */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="flex items-center justify-between text-[#6E5A5E] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Critical Cases</span>
            <ShieldAlert className="w-4 h-4 text-[#7F011F]" />
          </div>
          <div className="text-2xl font-bold text-[#7F011F]">{kpis.critical_cases}</div>
          <div className="text-[10px] text-[#7F011F] font-semibold mt-1">Priority 1 immediate</div>
        </div>

        {/* Available Beds */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="flex items-center justify-between text-[#6E5A5E] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Available Beds</span>
            <Bed className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{kpis.available_beds}</div>
          <div className="text-[10px] text-[#6E5A5E] mt-1">of {kpis.total_beds} total beds</div>
        </div>

        {/* Doctors On Duty */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="flex items-center justify-between text-[#6E5A5E] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Doctors Active</span>
            <Stethoscope className="w-4 h-4 text-[#7F011F]" />
          </div>
          <div className="text-2xl font-bold text-[#7F011F]">{kpis.doctors_on_duty}</div>
          <div className="text-[10px] text-[#6E5A5E] mt-1">of {kpis.total_doctors} doctors</div>
        </div>

        {/* Estimated Wait */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="flex items-center justify-between text-[#6E5A5E] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Est. Avg Wait</span>
            <TrendingUp className="w-4 h-4 text-[#7F011F]" />
          </div>
          <div className="text-2xl font-bold text-[#7F011F]">{kpis.estimated_wait_time} <span className="text-xs font-normal">min</span></div>
          <div className="text-[10px] text-[#6E5A5E] mt-1">Weighted queue baseline</div>
        </div>
      </div>

      {/* Middle Section: Two-Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Patient Flow Over Time Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#7F011F]">Patient Arrivals & Discharges (Hourly)</h3>
              <p className="text-xs text-[#6E5A5E]">Comparison of admitted intake vs completed clinical treatments</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20">
              Live Flow
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={arrivals_completions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6E5A5E' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6E5A5E' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FAF6EC', color: '#2A161B', borderColor: '#E8DBC0', borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="arrivals" name="Patient Arrivals" fill="#7F011F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completions" name="Discharges / Completed" fill="#D8C59E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right (1 col): Priority Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#7F011F]">Queue Priority Distribution</h3>
            <p className="text-xs text-[#6E5A5E]">Triage breakdown currently active in Min-Heap</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priority_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {priority_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#FAF6EC', color: '#2A161B', borderColor: '#E8DBC0', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2 text-xs">
            {priority_distribution.map((p) => (
              <div key={p.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                  <span className="text-[#6E5A5E] font-medium">{p.name}</span>
                </span>
                <span className="font-bold text-[#2A161B]">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Section: Department Workload & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Workload (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#7F011F]">Department Workload & Staffing</h3>
              <p className="text-xs text-[#6E5A5E]">Real-time patient census, on-duty doctors, and bed occupancy</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {department_workload.map((dept) => (
              <div key={dept.department} className="p-4 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC]/60">
                <div className="flex items-center justify-between text-xs font-bold text-[#2A161B] mb-2">
                  <span>{dept.department}</span>
                  <span className={`text-[11px] font-bold ${dept.capacity_pct > 80 ? 'text-[#7F011F]' : 'text-emerald-700'}`}>
                    {dept.capacity_pct}% Capacity
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-[#E8DBC0]/50 h-2 rounded-full overflow-hidden mb-2.5">
                  <div
                    className={`h-full rounded-full transition-all ${
                      dept.capacity_pct > 80 ? 'bg-[#7F011F]' : dept.capacity_pct > 50 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, dept.capacity_pct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#6E5A5E]">
                  <span>Active Patients: <strong className="text-[#7F011F]">{dept.active_patients}</strong></span>
                  <span>Doctors: <strong className="text-[#2A161B]">{dept.doctors_on_duty}</strong></span>
                  <span>Beds: <strong className="text-[#2A161B]">{dept.occupied_beds}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-[#7F011F]">Recent Clinical Alerts</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20">Live</span>
          </div>
          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {recent_alerts.map((alt) => (
              <div
                key={alt.id}
                className={`p-3 rounded-xl border text-xs ${
                  alt.type === 'critical'
                    ? 'bg-[#FAF0F2] border-[#7F011F]/30 text-[#7F011F]'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{alt.title}</span>
                  <span className="text-[10px] text-[#8C7B7E] font-normal">{alt.time}</span>
                </div>
                <p className="text-[11px] mt-1 text-[#2A161B]/90">{alt.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
