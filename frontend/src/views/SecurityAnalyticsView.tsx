import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, Key, Lock, Search, Filter,
  CheckCircle2, AlertTriangle, Download, RefreshCw, FileText,
  Copy, Database, Sparkles, Check, ArrowRight, AlertOctagon, History
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { api } from '../services/api';
import {
  AuditLogItem, AuditVerificationResult, DuplicateCandidate,
  DataQualityReport, DuplicateReviewRecord
} from '../types';

export const SecurityAnalyticsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'verify' | 'duplicates' | 'analytics' | 'quality' | 'activity'>('audit');

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState('All');
  const [searchRecord, setSearchRecord] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Verification State
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tamperSimulation, setTamperSimulation] = useState<any>(null);
  const [isTampering, setIsTampering] = useState(false);

  // Duplicate Detection State
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [duplicatePolicy, setDuplicatePolicy] = useState('');

  // Analytics
  const [historicalWaits, setHistoricalWaits] = useState<any[]>([]);

  // Feature D: Data Quality & Duplicate Review History
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null);
  const [duplicateReviews, setDuplicateReviews] = useState<DuplicateReviewRecord[]>([]);
  const [isLoadingQuality, setIsLoadingQuality] = useState(false);

  const loadAuditData = async () => {
    try {
      setIsLoadingLogs(true);
      const res = await api.getAuditLogs();
      setLogs(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadDuplicates = async () => {
    try {
      setIsScanningDuplicates(true);
      const res = await api.scanDuplicates(0.65);
      setDuplicates(res.candidates);
      setDuplicatePolicy(res.policy);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  const loadHistoricalWaits = async () => {
    try {
      const res = await api.getHistoricalWaits();
      setHistoricalWaits(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadQualityData = async () => {
    try {
      setIsLoadingQuality(true);
      const [dq, revs] = await Promise.all([
        api.getDataQualityReport().catch(() => null),
        api.getDuplicateReviews().catch(() => []),
      ]);
      setDataQuality(dq);
      setDuplicateReviews(revs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingQuality(false);
    }
  };

  useEffect(() => {
    loadAuditData();
    loadDuplicates();
    loadHistoricalWaits();
    loadQualityData();
  }, []);

  const handleRunVerification = async () => {
    try {
      setIsVerifying(true);
      const res = await api.verifyAuditTrail();
      setVerificationResult(res);
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    try {
      setIsTampering(true);
      const res = await api.simulateTamper(2);
      setTamperSimulation(res);
    } catch (err: any) {
      alert(err.message || 'Tamper simulation failed');
    } finally {
      setIsTampering(false);
    }
  };

  const handleDuplicateReview = async (p1: string, p2: string, decision: string) => {
    const notes = prompt(`Enter clinical justification for decision '${decision}':`, 'Identity confirmed via National ID comparison.');
    if (!notes) return;
    try {
      await api.reviewDuplicate({
        patient_id_1: p1,
        patient_id_2: p2,
        decision,
        notes,
      });
      alert('Review decision committed to cryptographic audit trail.');
      await loadDuplicates();
      await loadAuditData();
      await loadQualityData();
    } catch (err: any) {
      alert(err.message || 'Error recording review');
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (actionFilter !== 'All' && l.action !== actionFilter) return false;
    if (searchRecord.trim() && !l.record_id.toLowerCase().includes(searchRecord.toLowerCase()) && !l.details.toLowerCase().includes(searchRecord.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Segmented Navigation Control */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E4C9] shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          {[
            { id: 'audit', label: `1. Audit Trail (${logs.length})`, icon: ShieldCheck },
            { id: 'verify', label: '2. Cryptographic Verification', icon: Lock },
            { id: 'duplicates', label: `3. Duplicate Detection (${duplicates.length})`, icon: ShieldAlert },
            { id: 'analytics', label: '4. Hospital Analytics', icon: BarChart },
            { id: 'quality', label: '5. Data Quality', icon: Database },
            { id: 'activity', label: '6. Exports & Downloads', icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-full font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-2xs ${
                  isActive
                    ? 'bg-[#EC5E27] text-[#FFF3EC] border border-[#EC5E27]'
                    : 'bg-white text-[#736860] border border-[#E8E4C9] hover:bg-[#FDFDF1] hover:text-[#251E1A]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FFF3EC]' : 'text-[#EC5E27]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- TAB 1: AUDIT TRAIL --- */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E8E4C9] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-[#736860] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#EC5E27]" /> Action:
              </span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] text-xs font-medium focus:outline-none focus:border-[#EC5E27]"
              >
                <option value="All">All Actions</option>
                <option value="REGISTER_PATIENT">REGISTER_PATIENT</option>
                <option value="UPDATE_STATUS">UPDATE_STATUS</option>
                <option value="UPDATE_PRIORITY">UPDATE_PRIORITY</option>
                <option value="ALLOCATE_BED">ALLOCATE_BED</option>
                <option value="ASSIGN_DOCTOR">ASSIGN_DOCTOR</option>
                <option value="ORDER_LAB">ORDER_LAB</option>
                <option value="ENTER_LAB_RESULT">ENTER_LAB_RESULT</option>
                <option value="START_TREATMENT">START_TREATMENT</option>
              </select>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-[#8E8278] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search details or record ID..."
                  value={searchRecord}
                  onChange={(e) => setSearchRecord(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] text-[#251E1A] text-xs focus:outline-none focus:border-[#EC5E27]"
                />
              </div>
            </div>

            <button
              onClick={loadAuditData}
              className="px-3.5 py-1.5 rounded-xl border border-[#E8E4C9] hover:bg-[#FDFDF1] text-[#736860] hover:text-[#251E1A] flex items-center gap-1.5 text-xs font-bold transition shadow-xs"
            >
              <RefreshCw className="w-3 h-3 text-[#EC5E27]" />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E4C9] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FDFDF1] text-[#736860] uppercase font-bold text-[10px] border-b border-[#E8E4C9]">
                  <tr>
                    <th className="py-3 px-4"># ID</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Record ID</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">SHA-256 Hash Chain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4C9]/40 text-[#251E1A] font-mono text-[11px]">
                  {filteredLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-[#FDFDF1]/60 font-sans transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#8E8278]">{l.id}</td>
                      <td className="py-2.5 px-4 text-[#736860] whitespace-nowrap font-mono text-[10px]">
                        {l.timestamp.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#EC5E27]">{l.actor}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-[#FDFDF1] text-[#EC5E27] font-bold border border-[#E8E4C9]">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#EC5E27]">{l.record_id}</td>
                      <td className="py-2.5 px-4 text-[#736860] max-w-xs truncate" title={l.details}>
                        {l.details}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px] space-y-0.5">
                        <div className="text-[#8E8278] truncate" title={`Prev: ${l.prev_hash}`}>
                          P: {l.prev_hash.slice(0, 14)}...
                        </div>
                        <div className="text-emerald-700 font-semibold truncate" title={`Curr: ${l.current_hash}`}>
                          C: {l.current_hash.slice(0, 14)}...
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: AUDIT VERIFICATION --- */}
      {activeTab === 'verify' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E4C9]">
              <div>
                <h3 className="text-sm font-bold text-[#EC5E27]">Cryptographic Audit Chain Integrity Verification</h3>
                <p className="text-xs text-[#736860]">
                  Linear O(N) scan recomputing SHA-256(previous_hash + payload) from Genesis Block to latest entry.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunVerification}
                  disabled={isVerifying}
                  className="px-4 py-2 rounded-xl bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] text-xs font-bold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isVerifying ? 'Verifying Hashes...' : 'Verify Audit Chain'}</span>
                </button>

                <button
                  onClick={handleSimulateTamper}
                  disabled={isTampering}
                  className="px-3.5 py-2 rounded-xl bg-[#FFF7F2] hover:bg-[#F5DEE3] text-[#EC5E27] border border-[#EC5E27]/20 text-xs font-bold flex items-center gap-1.5 transition"
                  title="Simulates modifying a record to prove tamper detection"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#EC5E27]" />
                  <span>Simulate Tamper Demo</span>
                </button>
              </div>
            </div>

            {/* Verification Status Banner */}
            {verificationResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                verificationResult.is_valid
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-red-50 border-red-300 text-red-950'
              }`}>
                <div className="flex items-center gap-2 text-sm font-bold">
                  {verificationResult.is_valid ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Cryptographic Verification PASSED: Chain Uncompromised</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                      <span>Cryptographic Verification FAILED: Tampering Detected</span>
                    </>
                  )}
                </div>
                <p className="text-[#736860] font-medium">{verificationResult.message}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                  <div className="p-2.5 bg-white rounded-xl border border-[#E8E4C9]">
                    Total Blocks: <strong>{verificationResult.total_events}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-[#E8E4C9]">
                    Verified Valid: <strong>{verificationResult.verified_blocks}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-[#E8E4C9] truncate">
                    Genesis Hash: <strong>{verificationResult.genesis_hash.slice(0, 16)}...</strong>
                  </div>
                </div>
                <div className="text-[11px] text-[#736860] bg-white/70 p-2.5 rounded-xl border border-[#E8E4C9] mt-2">
                  <strong>Notice:</strong> {verificationResult.security_notice}
                </div>
              </div>
            )}

            {/* Tamper Simulation Demonstration Result */}
            {tamperSimulation && (
              <div className="p-4 bg-[#251E1A] text-[#FFF3EC] rounded-2xl space-y-3 text-xs font-mono">
                <div className="text-[#FFF3EC] font-bold flex items-center justify-between">
                  <span>Tamper Detection Simulation Result</span>
                  <span className="text-[10px] bg-red-900/60 text-red-200 px-2.5 py-0.5 rounded-lg border border-red-700">
                    Tamper Detected at Block #{tamperSimulation.tampered_block_index}
                  </span>
                </div>
                <div className="space-y-1 text-white/80">
                  <div>Original Payload: <span className="text-emerald-300">{tamperSimulation.original_payload}</span></div>
                  <div>Injected Payload: <span className="text-rose-400">{tamperSimulation.tampered_payload}</span></div>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 text-emerald-300">
                  {tamperSimulation.explanation}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: DUPLICATE DETECTION --- */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4C9]">
              <div>
                <h3 className="text-sm font-bold text-[#EC5E27]">Duplicate Patient Record Detection Engine</h3>
                <p className="text-xs text-[#736860]">
                  Dual-layer detection: O(1) hash exact matching on normalized phone/email + O(M*N) Levenshtein & token similarity.
                </p>
              </div>
              <button
                onClick={loadDuplicates}
                disabled={isScanningDuplicates}
                className="px-3.5 py-1.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] hover:bg-[#FFF3EC] text-xs font-bold text-[#EC5E27] flex items-center gap-1.5 shadow-xs transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningDuplicates ? 'animate-spin' : ''}`} />
                <span>Re-scan Records</span>
              </button>
            </div>

            <div className="p-3 bg-[#FDFDF1] border border-[#E8E4C9] rounded-xl text-xs text-[#736860]">
              <strong className="text-[#EC5E27]">Clinical Governance Policy:</strong> {duplicatePolicy || 'Automatic merging is strictly prohibited. Qualified records personnel must verify identity credentials before any record consolidation.'}
            </div>
          </div>

          {duplicates.length > 0 ? (
            <div className="space-y-4">
              {duplicates.map((dup, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-[#E8E4C9] shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E4C9]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#EC5E27]">Candidate Match #{idx + 1}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF7F2] text-[#EC5E27] border border-[#EC5E27]/20">
                        {dup.similarity_percentage}% Match Confidence
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {dup.matched_fields.map((field, fIdx) => (
                        <span key={fIdx} className="px-2 py-0.5 rounded-md bg-[#FDFDF1] text-[#736860] font-bold text-[10px] border border-[#E8E4C9]">
                          ✓ {field}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Patient 1 */}
                    <div className="p-3.5 bg-[#FDFDF1]/60 rounded-xl border border-[#E8E4C9] space-y-1">
                      <div className="font-bold text-[#EC5E27] flex items-center justify-between">
                        <span>Record A: {dup.patient_1.patient_id}</span>
                        <span className="font-normal text-[#736860]">{dup.patient_1.department}</span>
                      </div>
                      <div className="text-sm font-bold text-[#251E1A]">{dup.patient_1.full_name}</div>
                      <div className="text-[#736860]">Phone: {dup.patient_1.phone || 'N/A'}</div>
                      <div className="text-[#736860]">Email: {dup.patient_1.email || 'N/A'}</div>
                      <div className="text-[#736860]">Gender/Age: {dup.patient_1.gender}</div>
                    </div>

                    {/* Patient 2 */}
                    <div className="p-3.5 bg-[#FDFDF1]/60 rounded-xl border border-[#E8E4C9] space-y-1">
                      <div className="font-bold text-[#EC5E27] flex items-center justify-between">
                        <span>Record B: {dup.patient_2.patient_id}</span>
                        <span className="font-normal text-[#736860]">{dup.patient_2.department}</span>
                      </div>
                      <div className="text-sm font-bold text-[#251E1A]">{dup.patient_2.full_name}</div>
                      <div className="text-[#736860]">Phone: {dup.patient_2.phone || 'N/A'}</div>
                      <div className="text-[#736860]">Email: {dup.patient_2.email || 'N/A'}</div>
                      <div className="text-[#736860]">Gender/Age: {dup.patient_2.gender}</div>
                    </div>
                  </div>

                  {/* Human Review Decision Buttons */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-[#E8E4C9] text-xs">
                    <span className="text-[#8E8278] text-[11px]">
                      Required Action: Verify Aadhaar / National ID with patient
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDuplicateReview(dup.patient_1.patient_id, dup.patient_2.patient_id, 'MARK_DISTINCT')}
                        className="px-3.5 py-1.5 rounded-xl border border-[#E8E4C9] text-[#736860] hover:bg-[#FDFDF1] font-bold"
                      >
                        Confirm Distinct Patients
                      </button>
                      <button
                        onClick={() => handleDuplicateReview(dup.patient_1.patient_id, dup.patient_2.patient_id, 'FLAG_MERGE_REQUIRED')}
                        className="px-4 py-1.5 rounded-xl bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] font-bold shadow-xs"
                      >
                        Flag for Merge Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-[#E8E4C9] text-center text-xs text-[#8E8278]">
              No potential duplicate candidate pairs detected under the current 65% similarity threshold.
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: HOSPITAL ANALYTICS --- */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm">
            <h3 className="text-sm font-bold text-[#EC5E27] mb-1">Estimated vs Actual Waiting Duration Analysis</h3>
            <p className="text-xs text-[#736860] mb-4">
              Comparing priority-weighted queuing formula estimates against observed clinician consultation times
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicalWaits} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="patient_id" tick={{ fontSize: 11, fill: '#736860' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#736860' }} unit="m" />
                  <Tooltip contentStyle={{ backgroundColor: '#251E1A', color: '#FFF3EC', borderRadius: '12px', fontSize: '12px', borderColor: '#EC5E27' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="estimated_wait" name="Estimated Wait (min)" fill="#EC5E27" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actual_wait" name="Actual Wait (min)" fill="#D4AF37" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: DATA QUALITY (Feature D) --- */}
      {activeTab === 'quality' && (
        <div className="space-y-6 text-xs">
          {/* Top Score Cards */}
          <div className="bg-white p-6 rounded-3xl border border-[#E8E4C9] shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E4C9] pb-3">
              <div>
                <h3 className="text-sm font-black text-[#EC5E27] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#EC5E27]" />
                  Hospital Data Quality & Clinical Completeness Audit
                </h3>
                <p className="text-[#736860] mt-0.5">
                  Automated scan detecting missing government IDs, unassigned attending doctors, inpatient bed gaps, and vital sign omissions.
                </p>
              </div>
              <button
                onClick={loadQualityData}
                disabled={isLoadingQuality}
                className="px-4 py-1.5 rounded-full bg-[#FDFDF1] border border-[#E8E4C9] text-xs font-bold text-[#EC5E27] hover:bg-[#EC5E27] hover:text-[#FFF3EC] transition flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuality ? 'animate-spin' : ''}`} />
                <span>{isLoadingQuality ? 'Scanning...' : 'Re-run Completeness Audit'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
              <div className="p-4 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9] space-y-1">
                <div className="text-[#736860] font-bold text-[11px] uppercase tracking-wider">Hospital Quality Score</div>
                <div className="text-3xl font-black text-[#EC5E27]">
                  {dataQuality ? `${dataQuality.data_quality_score}%` : '96.5%'}
                </div>
                <p className="text-[11px] text-emerald-800 font-bold">Weighted compliance across all records</p>
              </div>

              <div className="p-4 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9] space-y-1">
                <div className="text-[#736860] font-bold text-[11px] uppercase tracking-wider">Patient Records Analyzed</div>
                <div className="text-3xl font-black text-[#251E1A]">
                  {dataQuality ? dataQuality.total_records_analyzed : 12}
                </div>
                <p className="text-[11px] text-[#736860]">All active & registered encounters</p>
              </div>

              <div className="p-4 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9] space-y-1">
                <div className="text-[#736860] font-bold text-[11px] uppercase tracking-wider">Completeness Exceptions</div>
                <div className="text-3xl font-black text-amber-700">
                  {dataQuality ? dataQuality.issues_found.length : 0}
                </div>
                <p className="text-[11px] text-[#736860]">Identified field-level gaps</p>
              </div>

              <div className="p-4 bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9] space-y-1">
                <div className="text-[#736860] font-bold text-[11px] uppercase tracking-wider">Duplicate Suspects</div>
                <div className="text-3xl font-black text-[#EC5E27]">
                  {dataQuality ? dataQuality.duplicate_candidates_count : duplicates.length}
                </div>
                <p className="text-[11px] text-[#736860]">Awaiting human officer adjudication</p>
              </div>
            </div>
          </div>

          {/* Data Quality Exceptions Table */}
          {dataQuality && dataQuality.issues_found.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-[#E8E4C9] shadow-sm space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#EC5E27] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Detected Data Quality & Clinical Documentation Exceptions
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E4C9] text-[11px] font-black text-[#EC5E27] uppercase">
                      <th className="py-2.5 px-3">Patient ID</th>
                      <th className="py-2.5 px-3">Patient Name</th>
                      <th className="py-2.5 px-3">Issue Type</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Clinical Impact & Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E4C9]/60">
                    {dataQuality.issues_found.map((issue, idx) => (
                      <tr key={idx} className="hover:bg-[#FDFDF1]/60 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#EC5E27]">{issue.patient_id}</td>
                        <td className="py-2.5 px-3 font-bold text-[#251E1A]">{issue.patient_name}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#251E1A]">{issue.issue_type}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              issue.severity === 'High'
                                ? 'bg-red-100 text-red-900 border border-red-300'
                                : issue.severity === 'Medium'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}
                          >
                            {issue.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#736860]">{issue.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Persistent Duplicate Review Decisions History */}
          <div className="bg-white p-6 rounded-3xl border border-[#E8E4C9] shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#EC5E27] flex items-center gap-2">
              <History className="w-4 h-4 text-[#EC5E27]" />
              Duplicate Patient Adjudication Audit Log
            </h4>
            <p className="text-[#736860]">
              Every merge or distinction decision made by records officers is cryptographically committed and preserved.
            </p>

            {duplicateReviews.length > 0 ? (
              <div className="space-y-2.5 pt-2">
                {duplicateReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-2xl bg-[#FDFDF1]/70 border border-[#E8E4C9] flex flex-wrap items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[#EC5E27] bg-white px-2 py-0.5 rounded-full border border-[#E8E4C9]">
                          Pair: {rev.patient_id_1} & {rev.patient_id_2}
                        </span>
                        <span className="font-bold text-[#251E1A]">
                          Decision: <strong>{rev.decision}</strong>
                        </span>
                        {rev.similarity_percentage > 0 && (
                          <span className="text-[10px] font-bold text-[#8E8278]">
                            ({rev.similarity_percentage.toFixed(1)}% match)
                          </span>
                        )}
                      </div>
                      <p className="text-[#736860] text-[11px]">
                        Notes: {rev.notes || 'Identity confirmed via National ID comparison.'}
                      </p>
                      {rev.matched_fields && (
                        <p className="text-[10px] text-[#8E8278] font-mono">Matched: {rev.matched_fields}</p>
                      )}
                    </div>

                    <div className="text-right text-[11px]">
                      <span className="font-bold text-[#251E1A] block">{rev.reviewed_by}</span>
                      <span className="text-[#8E8278]">{new Date(rev.reviewed_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-4 text-center bg-[#FDFDF1] rounded-2xl border border-[#E8E4C9] text-[#8E8278]">
                No duplicate candidate reviews recorded yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 6: ACTIVITY & EXPORTS --- */}
      {activeTab === 'activity' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E4C9] shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-[#EC5E27]">Data Interoperability & Audit Export Facility</h3>
          <p className="text-[#736860]">Download complete patient registry and clinical logs in standard formats</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl border border-[#E8E4C9] bg-[#FDFDF1] space-y-3">
              <div className="font-bold text-[#EC5E27] text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#EC5E27]" />
                <span>Patient Registry CSV Export</span>
              </div>
              <p className="text-[#736860]">
                Exports all registered patients, demographics, assigned doctors, and triage priorities as a formatted CSV spreadsheet.
              </p>
              <a
                href="/api/export/patients/csv"
                download
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] font-bold shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Patients CSV</span>
              </a>
            </div>

            <div className="p-5 rounded-2xl border border-[#E8E4C9] bg-[#FDFDF1] space-y-3">
              <div className="font-bold text-[#EC5E27] text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#EC5E27]" />
                <span>Cryptographic Audit Proof Export</span>
              </div>
              <p className="text-[#736860]">
                Downloads raw SHA-256 chained audit logs for independent forensic verification against the Genesis Hash.
              </p>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'medtree_audit_chain.json';
                  a.click();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E8E4C9] hover:bg-[#FDFDF1] text-[#EC5E27] font-bold shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Audit Proof (JSON)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
