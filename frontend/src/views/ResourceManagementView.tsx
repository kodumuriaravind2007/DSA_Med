import React, { useEffect, useState } from 'react';
import {
  Bed as BedIcon, Stethoscope, Users, CheckCircle2, AlertCircle,
  Filter, GitBranch, ArrowRight, Activity, RefreshCw, X
} from 'lucide-react';
import { api } from '../services/api';
import { Bed, Doctor, Patient } from '../types';
import { BedBadge } from '../components/StatusBadge';

interface ResourceManagementViewProps {
  onSelectPatient: (patientId: string) => void;
}

export const ResourceManagementView: React.FC<ResourceManagementViewProps> = ({
  onSelectPatient,
}) => {
  const [activeTab, setActiveTab] = useState<'beds' | 'doctors' | 'graph'>('beds');
  const [beds, setBeds] = useState<Bed[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [graphData, setGraphData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [wardFilter, setWardFilter] = useState('All');
  const [bedStatusFilter, setBedStatusFilter] = useState('All');
  const [doctorDeptFilter, setDoctorDeptFilter] = useState('All');
  const [vertexFilter, setVertexFilter] = useState<'All' | 'DEPT' | 'DOC' | 'BED' | 'PT'>('All');

  // Allocate Bed Modal
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [allocatingPatientId, setAllocatingPatientId] = useState('');
  const [isAllocatingBed, setIsAllocatingBed] = useState(false);

  // Assign Doctor Modal
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [assigningPatientId, setAssigningPatientId] = useState('');
  const [isAssigningDoctor, setIsAssigningDoctor] = useState(false);

  // Graph Traversal State
  const [traversalResult, setTraversalResult] = useState<any>(null);
  const [traversalNode, setTraversalNode] = useState('DEPT-EME');
  const [isTraversing, setIsTraversing] = useState(false);

  const loadResources = async () => {
    try {
      setIsLoading(true);
      const [bedsRes, docsRes, ptsRes, graphRes] = await Promise.all([
        api.getBeds(),
        api.getDoctors(),
        api.getPatients(),
        api.getResourceGraph(),
      ]);
      setBeds(bedsRes);
      setDoctors(docsRes);
      setPatients(ptsRes);
      setGraphData(graphRes);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleAllocateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBed || !allocatingPatientId) return;
    try {
      setIsAllocatingBed(true);
      await api.allocateBed(selectedBed.bed_id, allocatingPatientId);
      setSelectedBed(null);
      setAllocatingPatientId('');
      await loadResources();
    } catch (err: any) {
      alert(err.message || 'Error allocating bed');
    } finally {
      setIsAllocatingBed(false);
    }
  };

  const handleReleaseBed = async (bedId: string) => {
    if (!confirm(`Are you sure you want to release Bed ${bedId}? It will be marked for cleaning.`)) return;
    try {
      await api.releaseBed(bedId);
      await loadResources();
    } catch (err: any) {
      alert(err.message || 'Error releasing bed');
    }
  };

  const handleCleanBed = async (bedId: string) => {
    try {
      await api.updateBedStatus(bedId, 'Available');
      await loadResources();
    } catch (err: any) {
      alert(err.message || 'Error updating bed');
    }
  };

  const handleAssignDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !assigningPatientId) return;
    try {
      setIsAssigningDoctor(true);
      await api.assignDoctor(selectedDoctor.doctor_id, assigningPatientId);
      setSelectedDoctor(null);
      setAssigningPatientId('');
      await loadResources();
    } catch (err: any) {
      alert(err.message || 'Error assigning doctor');
    } finally {
      setIsAssigningDoctor(false);
    }
  };

  const handleToggleDuty = async (doc: Doctor) => {
    const nextStatus = doc.duty_status === 'On Duty' ? 'Off Duty' : 'On Duty';
    try {
      await api.updateDoctorDuty(doc.doctor_id, nextStatus, nextStatus === 'On Duty');
      await loadResources();
    } catch (err: any) {
      alert(err.message || 'Error changing duty status');
    }
  };

  const handleRunBFS = async () => {
    try {
      setIsTraversing(true);
      const res = await api.runGraphBFS(traversalNode);
      setTraversalResult(res);
    } catch (err: any) {
      alert(err.message || 'BFS failed');
    } finally {
      setIsTraversing(false);
    }
  };

  const handleRunDFS = async () => {
    try {
      setIsTraversing(true);
      const res = await api.runGraphDFS(traversalNode);
      setTraversalResult(res);
    } catch (err: any) {
      alert(err.message || 'DFS failed');
    } finally {
      setIsTraversing(false);
    }
  };

  // Group beds by ward
  const wards = Array.from(new Set(beds.map((b) => b.ward)));
  const filteredBeds = beds.filter((b) => {
    if (wardFilter !== 'All' && b.ward !== wardFilter) return false;
    if (bedStatusFilter !== 'All' && b.status !== bedStatusFilter) return false;
    return true;
  });

  const filteredDoctors = doctors.filter((d) => {
    if (doctorDeptFilter !== 'All' && d.department !== doctorDeptFilter) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Segmented Control */}
      <div className="bg-white p-3 rounded-2xl border border-[#E8DBC0] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('beds')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'beds'
                ? 'bg-[#7F011F] text-[#F5EBD0] shadow-xs'
                : 'text-[#6E5A5E] hover:bg-[#FAF6EC] hover:text-[#2A161B]'
            }`}
          >
            <BedIcon className="w-3.5 h-3.5" />
            <span>Ward Bed Board ({beds.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'doctors'
                ? 'bg-[#7F011F] text-[#F5EBD0] shadow-xs'
                : 'text-[#6E5A5E] hover:bg-[#FAF6EC] hover:text-[#2A161B]'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Physician Directory ({doctors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'graph'
                ? 'bg-[#7F011F] text-[#F5EBD0] shadow-xs'
                : 'text-[#6E5A5E] hover:bg-[#FAF6EC] hover:text-[#2A161B]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Hospital Resource Graph</span>
          </button>
        </div>

        <button
          onClick={loadResources}
          className="p-2 rounded-xl border border-[#E8DBC0] hover:bg-[#FAF6EC] text-[#7F011F] transition"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* --- TAB 1: BEDS --- */}
      {activeTab === 'beds' && (
        <div className="space-y-6">
          {/* Bed Filters */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8DBC0] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-[#7F011F] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filter Beds:
              </span>
              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] font-semibold focus:outline-none focus:border-[#7F011F]"
              >
                <option value="All">All Wards</option>
                {wards.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>

              <select
                value={bedStatusFilter}
                onChange={(e) => setBedStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] font-semibold focus:outline-none focus:border-[#7F011F]"
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Reserved">Reserved</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#6E5A5E]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Available: <strong className="text-emerald-700">{beds.filter((b) => b.status === 'Available').length}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7F011F]"></span> Occupied: <strong className="text-[#7F011F]">{beds.filter((b) => b.status === 'Occupied').length}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> Cleaning: <strong className="text-amber-700">{beds.filter((b) => b.status === 'Cleaning').length}</strong>
              </span>
            </div>
          </div>

          {/* Ward Groups */}
          <div className="space-y-6">
            {wards
              .filter((w) => wardFilter === 'All' || wardFilter === w)
              .map((wardName) => {
                const wardBeds = filteredBeds.filter((b) => b.ward === wardName);
                if (wardBeds.length === 0) return null;

                return (
                  <div key={wardName} className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#E8DBC0]">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#7F011F] text-sm">{wardName} Ward</h3>
                        <span className="text-[11px] text-[#6E5A5E] font-medium">({wardBeds.length} Beds)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                      {wardBeds.map((bed) => (
                        <div
                          key={bed.bed_id}
                          className={`p-4 rounded-xl border transition space-y-2.5 ${
                            bed.status === 'Available'
                              ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                              : bed.status === 'Occupied'
                              ? 'bg-[#FAF0F2] border-[#7F011F]/20 hover:border-[#7F011F]/40'
                              : bed.status === 'Cleaning'
                              ? 'bg-amber-50/40 border-amber-200'
                              : 'bg-[#FAF6EC] border-[#E8DBC0]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-[#2A161B]">{bed.bed_id}</span>
                            <BedBadge status={bed.status} />
                          </div>

                          <div className="text-xs">
                            {bed.current_patient_id ? (
                              <div className="space-y-0.5">
                                <div className="text-[#6E5A5E] text-[10px] uppercase font-bold">Current Occupant:</div>
                                <div className="font-bold text-[#2A161B] flex items-center justify-between">
                                  <span className="truncate">{bed.current_patient_name || bed.current_patient_id}</span>
                                  <button
                                    onClick={() => onSelectPatient(bed.current_patient_id!)}
                                    className="text-[10px] text-[#7F011F] font-bold hover:underline shrink-0 ml-1"
                                  >
                                    View 360°
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[#8C7B7E] text-[11px] italic py-1">
                                {bed.status === 'Cleaning' ? 'Sanitization in progress' : 'Ready for admission'}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-[#E8DBC0]/60 flex items-center justify-between text-xs">
                            {bed.status === 'Available' && (
                              <button
                                onClick={() => setSelectedBed(bed)}
                                className="w-full py-1.5 text-center font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition"
                              >
                                Allocate to Patient
                              </button>
                            )}

                            {bed.status === 'Occupied' && (
                              <button
                                onClick={() => handleReleaseBed(bed.bed_id)}
                                className="w-full py-1.5 text-center font-bold text-[#7F011F] bg-[#FAF0F2] hover:bg-[#F5EBD0] rounded-lg transition border border-[#7F011F]/20"
                              >
                                Release / Discharge Bed
                              </button>
                            )}

                            {bed.status === 'Cleaning' && (
                              <button
                                onClick={() => handleCleanBed(bed.bed_id)}
                                className="w-full py-1.5 text-center font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                              >
                                Mark Clean & Available
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* --- TAB 2: DOCTORS --- */}
      {activeTab === 'doctors' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#E8DBC0] shadow-sm flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#7F011F] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Department:
              </span>
              <select
                value={doctorDeptFilter}
                onChange={(e) => setDoctorDeptFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] font-semibold focus:outline-none focus:border-[#7F011F]"
              >
                <option value="All">All Specialties</option>
                <option value="Emergency">Emergency</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="General Medicine">General Medicine</option>
                <option value="ICU">ICU</option>
              </select>
            </div>
            <span className="text-[#8C7B7E] font-medium">
              {filteredDoctors.length} Doctors Listed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDoctors.map((doc) => {
              const isOnDuty = doc.duty_status === 'On Duty';
              return (
                <div key={doc.doctor_id} className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[#7F011F]">{doc.doctor_id}</span>
                      <h4 className="font-bold text-[#2A161B] text-sm">{doc.name}</h4>
                      <p className="text-xs text-[#6E5A5E]">{doc.specialty}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isOnDuty ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      doc.duty_status === 'In Consultation' ? 'bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20' :
                      'bg-[#FAF6EC] text-[#6E5A5E] border border-[#E8DBC0]'
                    }`}>
                      {doc.duty_status}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] text-xs space-y-1">
                    <div className="flex justify-between text-[#6E5A5E]">
                      <span>Department:</span>
                      <strong className="text-[#2A161B]">{doc.department}</strong>
                    </div>
                    <div className="flex justify-between text-[#6E5A5E]">
                      <span>Current Patient Load:</span>
                      <strong className="text-[#7F011F]">{doc.current_patient_count} / {doc.max_active_patients}</strong>
                    </div>
                    <div className="flex justify-between text-[#6E5A5E]">
                      <span>Phone:</span>
                      <span>{doc.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <button
                      onClick={() => handleToggleDuty(doc)}
                      className={`flex-1 py-2 rounded-xl font-bold transition border ${
                        isOnDuty
                          ? 'border-[#E8DBC0] text-[#6E5A5E] hover:bg-[#FAF6EC]'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      {isOnDuty ? 'Set Off Duty' : 'Set On Duty'}
                    </button>

                    <button
                      onClick={() => setSelectedDoctor(doc)}
                      disabled={!isOnDuty}
                      className="flex-1 py-2 rounded-xl font-bold bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] shadow-xs transition disabled:opacity-40"
                    >
                      Assign Patient
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 3: HOSPITAL RESOURCE GRAPH --- */}
      {activeTab === 'graph' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E8DBC0] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DBC0]">
              <div>
                <h3 className="text-sm font-bold text-[#7F011F]">Live Hospital Resource Graph (Adjacency List)</h3>
                <p className="text-xs text-[#6E5A5E]">
                  Mathematical graph model representing patients, departments, physicians, beds, and diagnostic services as connected vertices.
                </p>
              </div>

              {/* Traversal Controls */}
              <div className="flex items-center gap-2">
                <select
                  value={traversalNode}
                  onChange={(e) => setTraversalNode(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-xs font-semibold text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                >
                  <option value="DEPT-EME">Emergency Dept</option>
                  <option value="DEPT-CAR">Cardiology Dept</option>
                  <option value="DEPT-ORT">Orthopedics Dept</option>
                  <option value="DEPT-ICU">ICU Dept</option>
                  <option value="PT-101">Patient PT-101</option>
                </select>

                <button
                  onClick={handleRunBFS}
                  disabled={isTraversing}
                  className="px-4 py-1.5 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] text-xs font-bold shadow-xs"
                >
                  Run BFS
                </button>

                <button
                  onClick={handleRunDFS}
                  disabled={isTraversing}
                  className="px-4 py-1.5 rounded-xl bg-[#FAF6EC] hover:bg-[#F5EBD0] text-[#7F011F] border border-[#E8DBC0] text-xs font-bold shadow-xs"
                >
                  Run DFS
                </button>
              </div>
            </div>

            {/* Traversal Output Console */}
            {traversalResult && (
              <div className="p-4 bg-[#2A161B] text-[#F5EBD0] rounded-2xl space-y-2 text-xs font-mono">
                <div className="text-[#F5EBD0] font-bold flex items-center justify-between">
                  <span>Traversal Algorithm: {traversalResult.algorithm}</span>
                  <span className="text-white/60 font-normal">{traversalResult.complexity}</span>
                </div>
                <div className="text-white/80">
                  Start Vertex: <strong className="text-white">{traversalResult.start_node}</strong> • Total Visited: {traversalResult.total_visited} vertices
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 break-words text-[11px] text-emerald-300">
                  Visited Order: {traversalResult.visited_order.join('  ➜  ')}
                </div>
              </div>
            )}

            {/* Visual Node Cloud & Adjacency Breakdown */}
            {graphData && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3 font-medium text-[#6E5A5E]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#7F011F]"></span> Departments
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-600"></span> Doctors
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-amber-600"></span> Beds
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-purple-600"></span> Patients
                    </span>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-[#FAF6EC] p-1 rounded-xl border border-[#E8DBC0]">
                    {(['All', 'DEPT', 'DOC', 'BED', 'PT'] as const).map((vt) => (
                      <button
                        key={vt}
                        onClick={() => setVertexFilter(vt)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          vertexFilter === vt
                            ? 'bg-[#7F011F] text-[#F5EBD0] shadow-xs'
                            : 'text-[#6E5A5E] hover:text-[#2A161B]'
                        }`}
                      >
                        {vt === 'All' ? 'All Vertices' : vt === 'DEPT' ? 'Depts' : vt === 'DOC' ? 'Doctors' : vt === 'BED' ? 'Beds' : 'Patients'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {Object.entries(graphData.adjacency_list || {})
                    .filter(([nodeId]) => vertexFilter === 'All' || nodeId.startsWith(vertexFilter))
                    .map(([nodeId, neighbors]: [string, any]) => (
                    <div key={nodeId} className="p-3.5 bg-[#FAF6EC]/60 rounded-xl border border-[#E8DBC0] text-xs">
                      <div className="font-mono font-bold text-[#2A161B] flex items-center justify-between">
                        <span>Vertex: {nodeId}</span>
                        <span className="text-[10px] text-[#6E5A5E] font-normal">{neighbors.length} Edges</span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-[11px] text-[#6E5A5E] font-mono">
                        {neighbors.length > 0 ? (
                          neighbors.map((edgeStr: string, idx: number) => (
                            <div key={idx} className="truncate">↳ {edgeStr}</div>
                          ))
                        ) : (
                          <div className="text-[#8C7B7E] italic">No connected edges</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Allocate Bed Modal */}
      {selectedBed && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DBC0] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DBC0]">
              <h3 className="text-sm font-bold text-[#7F011F]">
                Allocate Bed {selectedBed.bed_id} ({selectedBed.ward})
              </h3>
              <button onClick={() => setSelectedBed(null)} className="text-[#8C7B7E] hover:text-[#2A161B]">✕</button>
            </div>

            <form onSubmit={handleAllocateBed} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#6E5A5E] font-bold mb-1">Select Patient to Admit:</label>
                <select
                  required
                  value={allocatingPatientId}
                  onChange={(e) => setAllocatingPatientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients
                    .filter((p) => !p.assigned_bed_id)
                    .map((p) => (
                      <option key={p.patient_id} value={p.patient_id}>
                        {p.patient_id} — {p.full_name} ({p.department}, Priority {p.priority})
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-[#FAF0F2] text-[#7F011F] rounded-xl text-[11px] space-y-1 border border-[#7F011F]/20">
                <strong>Conflict Prevention Notice:</strong> System verifies bed status is Available and updates both patient EHR and hospital graph structures simultaneously.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBed(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8DBC0] text-[#6E5A5E] hover:bg-[#FAF6EC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAllocatingBed || !allocatingPatientId}
                  className="px-5 py-2 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold disabled:opacity-50 shadow-xs"
                >
                  {isAllocatingBed ? 'Allocating...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Doctor Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DBC0] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DBC0]">
              <h3 className="text-sm font-bold text-[#7F011F]">
                Assign Patient to {selectedDoctor.name}
              </h3>
              <button onClick={() => setSelectedDoctor(null)} className="text-[#8C7B7E] hover:text-[#2A161B]">✕</button>
            </div>

            <form onSubmit={handleAssignDoctor} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#6E5A5E] font-bold mb-1">Select Patient:</label>
                <select
                  required
                  value={assigningPatientId}
                  onChange={(e) => setAssigningPatientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.patient_id} — {p.full_name} ({p.department}, Priority {p.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-[#FAF6EC] text-[#6E5A5E] rounded-xl text-[11px] border border-[#E8DBC0]">
                Doctor current load: <strong className="text-[#7F011F]">{selectedDoctor.current_patient_count} / {selectedDoctor.max_active_patients}</strong> patients.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8DBC0] text-[#6E5A5E] hover:bg-[#FAF6EC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningDoctor || !assigningPatientId}
                  className="px-5 py-2 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold disabled:opacity-50 shadow-xs"
                >
                  {isAssigningDoctor ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
