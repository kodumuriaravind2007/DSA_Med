import React, { useEffect, useState } from 'react';
import {
  ShieldAlert, RefreshCw, AlertTriangle, History,
  CheckCircle2, AlertOctagon, Users, ShieldCheck, Search
} from 'lucide-react';
import { api } from '../services/api';
import { DuplicateCandidate, DuplicateReviewRecord } from '../types';

interface SecurityAnalyticsViewProps {
  initialTab?: string;
}

export const SecurityAnalyticsView: React.FC<SecurityAnalyticsViewProps> = () => {
  // Duplicate Detection State
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [duplicatePolicy, setDuplicatePolicy] = useState('');
  const [duplicateReviews, setDuplicateReviews] = useState<DuplicateReviewRecord[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const loadDuplicates = async () => {
    try {
      setIsScanningDuplicates(true);
      const res = await api.scanDuplicates(0.65);
      setDuplicates(res.candidates || []);
      setDuplicatePolicy(res.policy || '');
    } catch (err: any) {
      console.error('Error loading duplicate candidates:', err);
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  const loadReviews = async () => {
    try {
      setIsLoadingReviews(true);
      const revs = await api.getDuplicateReviews();
      setDuplicateReviews(revs || []);
    } catch (err: any) {
      console.error('Error loading duplicate reviews:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadDuplicates();
    loadReviews();
  }, []);

  const handleDuplicateReview = async (p1: string, p2: string, decision: string) => {
    const defaultReason =
      decision === 'MARK_DISTINCT'
        ? 'Verified distinct identities via government photo ID comparison.'
        : decision === 'FLAG_MERGE_REQUIRED'
        ? 'Confirmed identical patient encounter; flagged for administrative record merge.'
        : 'Inconclusive documentation; requiring physical patient verification upon next visit.';

    const notes = prompt(`Enter clinical justification for decision '${decision}':`, defaultReason);
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
      await loadReviews();
    } catch (err: any) {
      alert(err.message || 'Error recording review decision');
    }
  };

  const filteredDuplicates = duplicates.filter((dup) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      dup.patient_1.patient_id.toLowerCase().includes(q) ||
      dup.patient_1.full_name.toLowerCase().includes(q) ||
      dup.patient_2.patient_id.toLowerCase().includes(q) ||
      dup.patient_2.full_name.toLowerCase().includes(q) ||
      dup.matched_fields.some((f) => f.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8DBC0] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DBC0]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center shadow-md font-bold text-lg border border-[#F5EBD0]/20 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#7F011F]">Duplicate Patient Record Detection Engine</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20">
                  DSA & Security
                </span>
              </div>
              <p className="text-xs text-[#6E5A5E] mt-0.5">
                Dual-layer algorithmic detection: O(1) hash exact matching on normalized phone/email + O(M×N) Levenshtein distance & token similarity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                loadDuplicates();
                loadReviews();
              }}
              disabled={isScanningDuplicates || isLoadingReviews}
              className="px-4 py-2 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] text-xs font-bold shadow-xs flex items-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningDuplicates ? 'animate-spin' : ''}`} />
              <span>{isScanningDuplicates ? 'Scanning Records...' : 'Re-scan Records'}</span>
            </button>
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#FAF6EC] rounded-2xl border border-[#E8DBC0] space-y-1">
            <div className="text-[#6E5A5E] font-bold text-[11px] uppercase tracking-wider">Candidate Pairs</div>
            <div className="text-3xl font-black text-[#7F011F]">{duplicates.length}</div>
            <p className="text-[11px] text-[#6E5A5E]">Potential duplicates identified</p>
          </div>

          <div className="p-4 bg-[#FAF6EC] rounded-2xl border border-[#E8DBC0] space-y-1">
            <div className="text-[#6E5A5E] font-bold text-[11px] uppercase tracking-wider">Sensitivity Threshold</div>
            <div className="text-3xl font-black text-[#2A161B]">65%</div>
            <p className="text-[11px] text-[#6E5A5E]">Levenshtein similarity floor</p>
          </div>

          <div className="p-4 bg-[#FAF6EC] rounded-2xl border border-[#E8DBC0] space-y-1">
            <div className="text-[#6E5A5E] font-bold text-[11px] uppercase tracking-wider">Governance Policy</div>
            <div className="text-xs font-black text-amber-800 pt-1">Adjudication Required</div>
            <p className="text-[11px] text-[#6E5A5E]">Zero automated merging</p>
          </div>

          <div className="p-4 bg-[#FAF6EC] rounded-2xl border border-[#E8DBC0] space-y-1">
            <div className="text-[#6E5A5E] font-bold text-[11px] uppercase tracking-wider">Resolved Decisions</div>
            <div className="text-3xl font-black text-emerald-800">{duplicateReviews.length}</div>
            <p className="text-[11px] text-[#6E5A5E]">Cryptographically logged on file</p>
          </div>
        </div>

        {/* Clinical Governance Policy Banner */}
        <div className="p-3.5 bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl text-xs text-[#6E5A5E] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#7F011F] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#7F011F]">Clinical Governance Policy: </strong>
            {duplicatePolicy || 'Automatic merging is strictly prohibited. Qualified records personnel must verify identity credentials (Aadhaar / National ID) before any record consolidation.'}
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DBC0] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-3.5 h-3.5 text-[#8C7B7E] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by patient ID, name, or matched field..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] text-xs focus:outline-none focus:border-[#7F011F]"
          />
        </div>

        <div className="text-xs font-bold text-[#6E5A5E]">
          Showing {filteredDuplicates.length} of {duplicates.length} duplicate candidate pairs
        </div>
      </div>

      {/* Candidate Matches List */}
      <div className="space-y-4">
        {filteredDuplicates.length > 0 ? (
          filteredDuplicates.map((dup, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-[#E8DBC0] shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8DBC0]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#7F011F]">Candidate Match #{idx + 1}</span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-black bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20">
                    {dup.similarity_percentage}% Match Confidence
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {dup.matched_fields.map((field, fIdx) => (
                    <span
                      key={fIdx}
                      className="px-2.5 py-0.5 rounded-md bg-[#FAF6EC] text-[#6E5A5E] font-bold text-[10px] border border-[#E8DBC0]"
                    >
                      ✓ {field}
                    </span>
                  ))}
                </div>
              </div>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Patient 1 */}
                <div className="p-4 bg-[#FAF6EC]/70 rounded-2xl border border-[#E8DBC0] space-y-1.5">
                  <div className="font-bold text-[#7F011F] flex items-center justify-between">
                    <span className="font-mono text-xs">Record A: {dup.patient_1.patient_id}</span>
                    <span className="font-normal text-[#6E5A5E] bg-white px-2 py-0.5 rounded-md border border-[#E8DBC0]">
                      {dup.patient_1.department}
                    </span>
                  </div>
                  <div className="text-sm font-black text-[#2A161B]">{dup.patient_1.full_name}</div>
                  <div className="text-[#6E5A5E] text-xs">Phone: <span className="font-semibold text-[#2A161B]">{dup.patient_1.phone || 'N/A'}</span></div>
                  <div className="text-[#6E5A5E] text-xs">Email: <span className="font-semibold text-[#2A161B]">{dup.patient_1.email || 'N/A'}</span></div>
                  <div className="text-[#6E5A5E] text-xs">Gender / Age: <span className="font-semibold text-[#2A161B]">{dup.patient_1.gender}</span></div>
                </div>

                {/* Patient 2 */}
                <div className="p-4 bg-[#FAF6EC]/70 rounded-2xl border border-[#E8DBC0] space-y-1.5">
                  <div className="font-bold text-[#7F011F] flex items-center justify-between">
                    <span className="font-mono text-xs">Record B: {dup.patient_2.patient_id}</span>
                    <span className="font-normal text-[#6E5A5E] bg-white px-2 py-0.5 rounded-md border border-[#E8DBC0]">
                      {dup.patient_2.department}
                    </span>
                  </div>
                  <div className="text-sm font-black text-[#2A161B]">{dup.patient_2.full_name}</div>
                  <div className="text-[#6E5A5E] text-xs">Phone: <span className="font-semibold text-[#2A161B]">{dup.patient_2.phone || 'N/A'}</span></div>
                  <div className="text-[#6E5A5E] text-xs">Email: <span className="font-semibold text-[#2A161B]">{dup.patient_2.email || 'N/A'}</span></div>
                  <div className="text-[#6E5A5E] text-xs">Gender / Age: <span className="font-semibold text-[#2A161B]">{dup.patient_2.gender}</span></div>
                </div>
              </div>

              {/* Human Review Decision Buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-[#E8DBC0] text-xs">
                <span className="text-[#8C7B7E] text-[11px] flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-700" />
                  Required Action: Verify National ID / Aadhaar credentials before adjudication
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleDuplicateReview(dup.patient_1.patient_id, dup.patient_2.patient_id, 'MARK_DISTINCT')}
                    className="px-3.5 py-1.5 rounded-xl border border-[#E8DBC0] text-[#6E5A5E] hover:bg-[#FAF6EC] hover:text-[#2A161B] font-bold transition shadow-2xs"
                  >
                    Confirm Distinct Patients
                  </button>
                  <button
                    onClick={() => handleDuplicateReview(dup.patient_1.patient_id, dup.patient_2.patient_id, 'Requires Further Review')}
                    className="px-3.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold transition shadow-2xs"
                  >
                    Requires Further Review
                  </button>
                  <button
                    onClick={() => handleDuplicateReview(dup.patient_1.patient_id, dup.patient_2.patient_id, 'FLAG_MERGE_REQUIRED')}
                    className="px-4 py-1.5 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs transition"
                  >
                    Flag for Merge Review
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-[#E8DBC0] text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
            <h4 className="text-sm font-bold text-[#2A161B]">No Duplicate Candidate Pairs Detected</h4>
            <p className="text-xs text-[#8C7B7E] max-w-md mx-auto">
              All active patient records conform to uniqueness thresholds. No candidate pairs exceed the 65% similarity threshold.
            </p>
          </div>
        )}
      </div>

      {/* Persistent Duplicate Review Decisions History */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8DBC0] shadow-sm space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8DBC0]">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#7F011F] flex items-center gap-2">
              <History className="w-4 h-4 text-[#7F011F]" />
              Duplicate Patient Adjudication Audit Log
            </h4>
            <p className="text-[#6E5A5E] text-[11px] mt-0.5">
              Every merge or distinction decision made by records officers is cryptographically committed and preserved.
            </p>
          </div>
          <button
            onClick={loadReviews}
            disabled={isLoadingReviews}
            className="px-3 py-1 rounded-xl border border-[#E8DBC0] text-[#6E5A5E] hover:bg-[#FAF6EC] text-[11px] font-bold transition"
          >
            Refresh History
          </button>
        </div>

        {duplicateReviews.length > 0 ? (
          <div className="space-y-2.5">
            {duplicateReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-3.5 rounded-2xl bg-[#FAF6EC]/70 border border-[#E8DBC0] flex flex-wrap items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-[#7F011F] bg-white px-2 py-0.5 rounded-full border border-[#E8DBC0]">
                      Pair: {rev.patient_id_1} & {rev.patient_id_2}
                    </span>
                    <span className="font-bold text-[#2A161B]">
                      Decision:{' '}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          rev.decision === 'MARK_DISTINCT'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : rev.decision === 'FLAG_MERGE_REQUIRED'
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {rev.decision}
                      </span>
                    </span>
                    {rev.similarity_percentage > 0 && (
                      <span className="text-[10px] font-bold text-[#8C7B7E]">
                        ({rev.similarity_percentage.toFixed(1)}% match)
                      </span>
                    )}
                  </div>
                  <p className="text-[#6B5B5E] text-[11px]">
                    Justification: {rev.notes || 'Identity confirmed via National ID comparison.'}
                  </p>
                  {rev.matched_fields && (
                    <p className="text-[10px] text-[#8C7B7E] font-mono">Matched: {rev.matched_fields}</p>
                  )}
                </div>

                <div className="text-right text-[11px]">
                  <span className="font-bold text-[#2A161B] block">{rev.reviewed_by}</span>
                  <span className="text-[#8C7B7E]">{new Date(rev.reviewed_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center bg-[#FAF6EC] rounded-2xl border border-[#E8DBC0] text-[#8C7B7E]">
            No duplicate candidate reviews recorded yet.
          </p>
        )}
      </div>
    </div>
  );
};
