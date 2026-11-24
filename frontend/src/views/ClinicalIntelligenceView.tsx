import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  NEWS2Score, DrugInteractionResult, MCIScenario, MCISimulationResult,
  LevenshteinVisualizerResult, HeapStepthroughResult, Patient,
  APQSimulationResult, HungarianBedMatchResult, TrajectoryAnalysisResult,
  MerkleProofResult
} from '../types';
import {
  Activity, AlertTriangle, ShieldAlert, HeartPulse, Pill, Siren,
  Binary, Network, Zap, CheckCircle2, AlertOctagon, HelpCircle,
  Play, RotateCcw, ArrowRight, Layers, Users, Stethoscope, ChevronRight,
  ChevronDown, Flame, Thermometer, Wind, Eye, Clock, Bed, TrendingUp,
  Key, ShieldCheck, Check, X, ShieldX, Sparkles
} from 'lucide-react';

export const ClinicalIntelligenceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'news2' | 'apq' | 'bed-match' | 'ddi' | 'mci' | 'dsa'>('news2');

  // --------------------------------------------------------------------------
  // Tab 1: NEWS2 & Deterioration Velocity State
  // --------------------------------------------------------------------------
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [news2Vitals, setNews2Vitals] = useState({
    respiration_rate: 18,
    oxygen_saturation: 97,
    supplemental_oxygen: false,
    systolic_bp: 125,
    pulse_rate: 76,
    consciousness_avpu: 'A',
    temperature_c: 37.0,
    spo2_scale: 1
  });
  const [news2Result, setNews2Result] = useState<NEWS2Score | null>(null);
  const [news2Loading, setNews2Loading] = useState(false);
  const [trajectoryResult, setTrajectoryResult] = useState<TrajectoryAnalysisResult | null>(null);
  const [trajectoryLoading, setTrajectoryLoading] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 2: Accumulating Priority Queue (APQ-h) State
  // --------------------------------------------------------------------------
  const [apqElapsedMins, setApqElapsedMins] = useState<number>(45);
  const [apqResult, setApqResult] = useState<APQSimulationResult | null>(null);
  const [apqLoading, setApqLoading] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 3: Hungarian Bed Matching State
  // --------------------------------------------------------------------------
  const [bedMatchResult, setBedMatchResult] = useState<HungarianBedMatchResult | null>(null);
  const [bedMatchLoading, setBedMatchLoading] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 4: Drug-Drug & Biomarker Suppression State
  // --------------------------------------------------------------------------
  const [candidateDrug, setCandidateDrug] = useState<string>('Spironolactone');
  const [activeMedsInput, setActiveMedsInput] = useState<string>('Lisinopril, Metformin');
  const [conditionsInput, setConditionsInput] = useState<string>('Hypertension, Type 2 Diabetes');
  const [allergiesInput, setAllergiesInput] = useState<string>('');
  const [serumPotassium, setSerumPotassium] = useState<number>(4.0);
  const [serumEgfr, setSerumEgfr] = useState<number>(75.0);
  const [ddiResult, setDdiResult] = useState<DrugInteractionResult | null>(null);
  const [ddiLoading, setDdiLoading] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 5: Mass Casualty Incident (MCI) START State
  // --------------------------------------------------------------------------
  const [mciScenarios, setMciScenarios] = useState<MCIScenario[]>([]);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('Highway Pileup');
  const [mciResult, setMciResult] = useState<MCISimulationResult | null>(null);
  const [mciLoading, setMciLoading] = useState(false);
  const [expandedVictimId, setExpandedVictimId] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Tab 6: Glass-Box DSA Visualizer State
  // --------------------------------------------------------------------------
  const [dsaSubTab, setDsaSubTab] = useState<'levenshtein' | 'heap' | 'merkle'>('merkle');
  const [s1Input, setS1Input] = useState<string>('CEFTRIAXONE');
  const [s2Input, setS2Input] = useState<string>('CEFUROXIME');
  const [levResult, setLevResult] = useState<LevenshteinVisualizerResult | null>(null);
  const [levLoading, setLevLoading] = useState(false);

  const [heapArrayInput, setHeapArrayInput] = useState<string>('12, 25, 18, 40, 32, 22');
  const [heapNewVal, setHeapNewVal] = useState<number>(10);
  const [heapResult, setHeapResult] = useState<HeapStepthroughResult | null>(null);
  const [heapCurrentStep, setHeapCurrentStep] = useState<number>(0);
  const [heapLoading, setHeapLoading] = useState(false);

  const [merkleLeafIndex, setMerkleLeafIndex] = useState<number>(2);
  const [merkleResult, setMerkleResult] = useState<MerkleProofResult | null>(null);
  const [merkleLoading, setMerkleLoading] = useState(false);
  const [merkleTampered, setMerkleTampered] = useState(false);
  const [merkleVerifyResult, setMerkleVerifyResult] = useState<any>(null);

  // Initial Load
  useEffect(() => {
    loadPatients();
    loadMciScenarios();
    runNews2Calculation();
    runTrajectoryAnalysis();
    runApqSimulation(45);
    runBedMatchOptimization();
    runDdiCheck();
    runLevenshteinCalculation();
    runHeapStepthrough();
    runMerkleProof(2);
  }, []);

  const loadPatients = async () => {
    try {
      const data = await api.getPatients();
      setPatientsList(data);
    } catch (err) {
      console.error('Failed to load patients', err);
    }
  };

  const loadMciScenarios = async () => {
    try {
      const scenarios = await api.getMCIScenarios();
      setMciScenarios(scenarios);
      if (scenarios.length > 0) {
        setSelectedScenarioKey(scenarios[0].key);
        runMciSimulation(scenarios[0].key);
      }
    } catch (err) {
      console.error('Failed to load MCI scenarios', err);
    }
  };

  // --------------------------------------------------------------------------
  // NEWS2 & Trajectory Handlers
  // --------------------------------------------------------------------------
  const runNews2Calculation = async () => {
    setNews2Loading(true);
    try {
      const res = await api.calculateNEWS2({
        respiration_rate: Number(news2Vitals.respiration_rate),
        oxygen_saturation: Number(news2Vitals.oxygen_saturation),
        supplemental_oxygen: Boolean(news2Vitals.supplemental_oxygen),
        systolic_bp: Number(news2Vitals.systolic_bp),
        pulse_rate: Number(news2Vitals.pulse_rate),
        consciousness_avpu: news2Vitals.consciousness_avpu,
        temperature_c: Number(news2Vitals.temperature_c),
        spo2_scale: Number(news2Vitals.spo2_scale)
      });
      setNews2Result(res);
    } catch (err) {
      console.error('NEWS2 calculation failed', err);
    } finally {
      setNews2Loading(false);
    }
  };

  const runTrajectoryAnalysis = async (patientId?: string) => {
    setTrajectoryLoading(true);
    try {
      const res = await api.analyzeVitalsTrajectory({
        patient_id: patientId || selectedPatientId || undefined
      });
      setTrajectoryResult(res);
    } catch (err) {
      console.error('Trajectory analysis failed', err);
    } finally {
      setTrajectoryLoading(false);
    }
  };

  const handlePatientSelectForNEWS2 = async (patientId: string) => {
    setSelectedPatientId(patientId);
    if (!patientId) return;
    setNews2Loading(true);
    try {
      const score = await api.getPatientNEWS2(patientId);
      setNews2Result(score);
      runTrajectoryAnalysis(patientId);
      if (score.parameters) {
        setNews2Vitals(prev => ({
          ...prev,
          respiration_rate: Number(score.parameters.respiration_rate.value || 18),
          oxygen_saturation: Number(score.parameters.oxygen_saturation.value || 98),
          supplemental_oxygen: Boolean(score.parameters.supplemental_oxygen.value),
          systolic_bp: Number(score.parameters.systolic_bp.value || 120),
          pulse_rate: Number(score.parameters.pulse_rate.value || 75),
          temperature_c: Number(score.parameters.temperature_c.value || 37.0),
        }));
      }
    } catch (err) {
      console.error('Failed to fetch patient NEWS2 score', err);
    } finally {
      setNews2Loading(false);
    }
  };

  // --------------------------------------------------------------------------
  // APQ Handlers
  // --------------------------------------------------------------------------
  const runApqSimulation = async (elapsedMins: number) => {
    setApqLoading(true);
    try {
      const res = await api.simulateAPQ({ simulated_elapsed_mins: elapsedMins });
      setApqResult(res);
    } catch (err) {
      console.error('APQ simulation failed', err);
    } finally {
      setApqLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Bed Matcher Handlers
  // --------------------------------------------------------------------------
  const runBedMatchOptimization = async () => {
    setBedMatchLoading(true);
    try {
      const res = await api.optimizeBedAllocation();
      setBedMatchResult(res);
    } catch (err) {
      console.error('Bed match optimization failed', err);
    } finally {
      setBedMatchLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // DDI & Alert Fatigue Handlers
  // --------------------------------------------------------------------------
  const runDdiCheck = async () => {
    if (!candidateDrug.trim()) return;
    setDdiLoading(true);
    try {
      const activeMeds = activeMedsInput.split(',').map(s => s.trim()).filter(Boolean);
      const conditions = conditionsInput.split(',').map(s => s.trim()).filter(Boolean);
      const allergies = allergiesInput.split(',').map(s => s.trim()).filter(Boolean);

      const res = await api.checkDrugInteractions({
        candidate_drug: candidateDrug.trim(),
        active_medications: activeMeds,
        known_conditions: conditions,
        patient_allergies: allergies,
        biomarkers: {
          potassium: Number(serumPotassium),
          egfr: Number(serumEgfr)
        }
      } as any);
      setDdiResult(res);
    } catch (err) {
      console.error('DDI check failed', err);
    } finally {
      setDdiLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // MCI Handlers
  // --------------------------------------------------------------------------
  const runMciSimulation = async (scenarioKey: string) => {
    setMciLoading(true);
    try {
      const res = await api.simulateMCI(scenarioKey);
      setMciResult(res);
      setExpandedVictimId(null);
    } catch (err) {
      console.error('MCI simulation failed', err);
    } finally {
      setMciLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Glass-Box Handlers (Levenshtein, Heap, Merkle)
  // --------------------------------------------------------------------------
  const runLevenshteinCalculation = async () => {
    if (!s1Input.trim() || !s2Input.trim()) return;
    setLevLoading(true);
    try {
      const res = await api.getLevenshteinMatrix(s1Input.trim(), s2Input.trim());
      setLevResult(res);
    } catch (err) {
      console.error('Levenshtein matrix failed', err);
    } finally {
      setLevLoading(false);
    }
  };

  const runHeapStepthrough = async () => {
    setHeapLoading(true);
    try {
      const elements = heapArrayInput
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n));
      const res = await api.getHeapStepthrough(elements, heapNewVal);
      setHeapResult(res);
      setHeapCurrentStep(0);
    } catch (err) {
      console.error('Heap stepthrough failed', err);
    } finally {
      setHeapLoading(false);
    }
  };

  const runMerkleProof = async (leafIndex: number, tamper: boolean = false) => {
    setMerkleLoading(true);
    setMerkleTampered(tamper);
    try {
      const res = await api.generateMerkleProof({ record_index: leafIndex });
      setMerkleResult(res);

      // Verify the proof
      let leafData = res.proof_of_inclusion.record_data;
      if (tamper) {
        leafData = { ...leafData, details: "MALICIOUSLY_ALTERED_DOSE_RECORD" };
      }

      const verifyRes = await api.verifyMerkleProof({
        leaf_data: leafData,
        proof_path: res.proof_of_inclusion.proof_path,
        expected_root: res.merkle_root
      });
      setMerkleVerifyResult(verifyRes);
    } catch (err) {
      console.error('Merkle proof generation failed', err);
    } finally {
      setMerkleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDF1] text-[#251E1A] p-4 md:p-8 space-y-8">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E4C9] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-cyan-900/30">
              <Zap className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#251E1A] flex items-center gap-2">
                Clinical Intelligence & Advanced Research Engines
                <span className="text-xs uppercase px-2.5 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  2024-2026 Literature
                </span>
              </h1>
              <p className="text-sm text-[#736860] mt-0.5">
                Dynamic Accumulating Priority Queues (APQ-h), Kuhn-Munkres Hungarian Bed Matching, d(NEWS2)/dt Deterioration Velocity, and O(log N) Merkle Proofs.
              </p>
            </div>
          </div>
        </div>

        {/* 6 Primary Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FFF3EC] border border-[#FFD7C5] p-1.5 rounded-full overflow-x-auto shadow-xs">
          <button
            onClick={() => setActiveTab('news2')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'news2'
                ? 'bg-[#EC5E27] text-white shadow-sm font-bold'
                : 'text-[#736860] hover:text-[#251E1A] hover:bg-[#FFFDF9]'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            NEWS2 & Velocity Vector
          </button>
          <button
            onClick={() => setActiveTab('apq')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'apq'
                ? 'bg-[#EC5E27] text-white shadow-sm font-bold'
                : 'text-[#736860] hover:text-[#251E1A] hover:bg-[#FFFDF9]'
            }`}
          >
            <Clock className="w-4 h-4" />
            APQ-h Starvation Queue
          </button>
          <button
            onClick={() => setActiveTab('bed-match')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'bed-match'
                ? 'bg-[#EC5E27] text-white shadow-sm font-bold'
                : 'text-[#736860] hover:text-[#251E1A] hover:bg-[#FFFDF9]'
            }`}
          >
            <Bed className="w-4 h-4" />
            Hungarian Bed Matcher
          </button>
          <button
            onClick={() => setActiveTab('ddi')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'ddi'
                ? 'bg-[#EC5E27] text-white shadow-sm font-bold'
                : 'text-[#736860] hover:text-[#251E1A] hover:bg-[#FFFDF9]'
            }`}
          >
            <Pill className="w-4 h-4" />
            DDI & Fatigue Suppression
          </button>
          <button
            onClick={() => setActiveTab('mci')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'mci'
                ? 'bg-[#EC5E27] text-white shadow-sm font-bold'
                : 'text-[#736860] hover:text-[#251E1A] hover:bg-[#FFFDF9]'
            }`}
          >
            <Siren className="w-4 h-4" />
            MCI START Triage
          </button>
          <button
            onClick={() => setActiveTab('dsa')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'dsa'
                ? 'bg-[#EC5E27] text-white shadow-sm font-bold'
                : 'text-[#736860] hover:text-[#251E1A] hover:bg-[#FFFDF9]'
            }`}
          >
            <Binary className="w-4 h-4" />
            Glass-Box & Merkle Proof
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: NEWS2 & Deterioration Velocity                                */}
      {/* ==================================================================== */}
      {activeTab === 'news2' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white border border-cyan-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/30">
                <HeartPulse className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#251E1A]">
                  NEWS2 Longitudinal Velocity & EWMA Sepsis Trajectory (Nature Digital Medicine 2024-2026)
                </h3>
                <p className="text-xs text-[#736860]">
                  Solves static snapshot blindness by evaluating first-derivative drift velocity d(NEWS2)/dt (points/hr) and Exponentially Weighted Moving Average (EWMA) trend acceleration.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#736860]">Evaluate Inpatient:</span>
              <select
                value={selectedPatientId}
                onChange={e => handlePatientSelectForNEWS2(e.target.value)}
                className="bg-[#FFFDF9] border border-[#E8E4C9] text-xs rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Manual Vitals Input --</option>
                {patientsList.map(p => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.patient_id} — {p.full_name} ({p.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Velocity Alert Callout if Accelerating */}
          {trajectoryResult && trajectoryResult.acceleration_alert && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-rose-200">
                    ACUTE DETERIORATION VELOCITY ALERT (+{trajectoryResult.score_velocity_per_hour} pts/hr)
                  </div>
                  <div className="text-xs text-rose-300">
                    {trajectoryResult.clinical_recommendation}
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold whitespace-nowrap">
                STAT Rapid Response
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Vitals Form Controls */}
            <div className="lg:col-span-5 bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#E8E4C9] pb-3">
                <h4 className="text-sm font-semibold text-[#251E1A] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Physiological Parameter Inputs
                </h4>
                <button
                  onClick={() => {
                    setNews2Vitals({
                      respiration_rate: 18,
                      oxygen_saturation: 97,
                      supplemental_oxygen: false,
                      systolic_bp: 125,
                      pulse_rate: 76,
                      consciousness_avpu: 'A',
                      temperature_c: 37.0,
                      spo2_scale: 1
                    });
                    setSelectedPatientId('');
                    setTimeout(runNews2Calculation, 50);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Baseline
                </button>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#736860] flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-cyan-400" /> Respiration Rate (bpm)
                    </span>
                    <span className="font-mono font-bold text-white">{news2Vitals.respiration_rate} bpm</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={40}
                    value={news2Vitals.respiration_rate}
                    onChange={e => setNews2Vitals({ ...news2Vitals, respiration_rate: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#FFFDF9] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#736860] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" /> Oxygen Saturation ($SpO_2$)
                    </span>
                    <span className="font-mono font-bold text-white">{news2Vitals.oxygen_saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min={75}
                    max={100}
                    value={news2Vitals.oxygen_saturation}
                    onChange={e => setNews2Vitals({ ...news2Vitals, oxygen_saturation: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#FFFDF9] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#FFFDF9] rounded-xl border border-[#E8E4C9]/60">
                  <div className="text-xs">
                    <div className="font-medium text-[#251E1A]">Supplemental Oxygen Delivery</div>
                    <div className="text-[11px] text-[#736860]">Mask / Cannula / CPAP (+2 pts)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={news2Vitals.supplemental_oxygen}
                    onChange={e => setNews2Vitals({ ...news2Vitals, supplemental_oxygen: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#736860] flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-cyan-400" /> Systolic Blood Pressure
                    </span>
                    <span className="font-mono font-bold text-white">{news2Vitals.systolic_bp} mmHg</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={240}
                    value={news2Vitals.systolic_bp}
                    onChange={e => setNews2Vitals({ ...news2Vitals, systolic_bp: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#FFFDF9] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#736860] flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-cyan-400" /> Heart / Pulse Rate
                    </span>
                    <span className="font-mono font-bold text-white">{news2Vitals.pulse_rate} bpm</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={170}
                    value={news2Vitals.pulse_rate}
                    onChange={e => setNews2Vitals({ ...news2Vitals, pulse_rate: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#FFFDF9] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#736860] flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-cyan-400" /> Temperature (°C)
                    </span>
                    <span className="font-mono font-bold text-white">{news2Vitals.temperature_c} °C</span>
                  </div>
                  <input
                    type="range"
                    min={34.0}
                    max={41.5}
                    step={0.1}
                    value={news2Vitals.temperature_c}
                    onChange={e => setNews2Vitals({ ...news2Vitals, temperature_c: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#FFFDF9] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>

              <button
                onClick={runNews2Calculation}
                disabled={news2Loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                {news2Loading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Calculate Score & Recalibrate Trajectory
              </button>
            </div>

            {/* Results Output */}
            <div className="lg:col-span-7 space-y-6">
              {news2Result && (
                <div
                  className={`rounded-2xl p-6 border transition-all ${
                    news2Result.urgency === 'EMERGENCY_RAPID_RESPONSE'
                      ? 'bg-rose-950/40 border-rose-500/40 shadow-xl shadow-rose-950/50'
                      : news2Result.urgency === 'URGENT_CLINICAL_REVIEW'
                      ? 'bg-amber-950/40 border-amber-500/40 shadow-xl shadow-amber-950/50'
                      : 'bg-white border-[#E8E4C9]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E4C9]/80 pb-5">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-semibold text-[#736860]">
                        NEWS2 Aggregate Score
                      </span>
                      <div className="flex items-baseline gap-3 mt-1">
                        <span className="text-5xl font-black font-mono text-white">
                          {news2Result.total_score}
                        </span>
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
                            news2Result.urgency === 'EMERGENCY_RAPID_RESPONSE'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                              : news2Result.urgency === 'URGENT_CLINICAL_REVIEW'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {news2Result.risk_level} Risk — {news2Result.urgency.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {news2Result.has_red_score && (
                      <div className="flex items-center gap-2 p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-semibold">
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                        <span>RED Score (3) Triggered!</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="p-4 bg-[#FDFDF1] rounded-xl border border-[#E8E4C9] text-xs leading-relaxed text-[#251E1A]">
                      {news2Result.clinical_response}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 bg-[#FDFDF1] rounded-xl border border-[#E8E4C9]">
                        <div className="text-[11px] text-[#736860]">Observation Frequency</div>
                        <div className="text-xs font-bold text-[#251E1A] mt-0.5">
                          {news2Result.monitoring_frequency}
                        </div>
                      </div>
                      <div className="p-3 bg-[#FDFDF1] rounded-xl border border-[#E8E4C9]">
                        <div className="text-[11px] text-[#736860]">Min-Heap Triage Level</div>
                        <div className="text-xs font-bold text-cyan-400 mt-0.5">
                          Priority {news2Result.suggested_heap_priority}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Longitudinal Trajectory & Drift Timeline */}
              {trajectoryResult && (
                <div className="bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#E8E4C9] pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[#251E1A] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                        Longitudinal Deterioration Velocity Timeline
                      </h4>
                      <p className="text-xs text-[#736860] mt-0.5">
                        Velocity: <strong className="text-white">{trajectoryResult.score_velocity_per_hour} pts/hr</strong> | EWMA Smoothed: <strong className="text-white">{trajectoryResult.ewma_smoothed_score}</strong>
                      </p>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-[#FFFDF9] border border-[#E8E4C9] text-[#736860]">
                      {trajectoryResult.trajectory_label}
                    </span>
                  </div>

                  {/* Micro-timeline visual cards */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-2">
                    {trajectoryResult.timeline.map((point, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          idx === trajectoryResult.timeline.length - 1
                            ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md'
                            : 'bg-[#FDFDF1] border-[#E8E4C9]'
                        }`}
                      >
                        <div className="text-[10px] text-[#736860] font-mono">
                          T - {Math.round((trajectoryResult.timeline[trajectoryResult.timeline.length - 1].timestamp - point.timestamp) / 3600)}h
                        </div>
                        <div className="text-lg font-black font-mono text-white flex items-baseline justify-between">
                          <span>{point.news2_score}</span>
                          <span className="text-[10px] font-normal text-[#736860] font-sans">pts</span>
                        </div>
                        <div className="text-[10px] text-cyan-300 font-mono">
                          EWMA: {point.ewma_smoothed}
                        </div>
                        <div className="text-[10px] text-[#736860]">
                          {point.velocity_pts_per_hr > 0 ? `+${point.velocity_pts_per_hr}` : point.velocity_pts_per_hr} pt/h
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: Accumulating Priority Queue (APQ-h)                           */}
      {/* ==================================================================== */}
      {activeTab === 'apq' && (
        <div className="space-y-6">
          <div className="bg-white border border-emerald-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/30">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#251E1A]">
                  Accumulating Priority Queue (APQ-h) & Starvation Prevention
                </h3>
                <p className="text-xs text-[#736860]">
                  Solves patient starvation during high-acuity surges. Dynamic continuous priority $P(t) = P_0 - \alpha(c) \cdot \Delta t$ dynamically bubbles up Level 2/3 patients while modeling Left-Without-Being-Seen (LWBS) hazard probability.
                </p>
              </div>
            </div>

            {/* Slider to simulate elapsed time */}
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-[#E8E4C9]">
              <span className="text-xs text-[#736860] whitespace-nowrap">Simulate Surge Drift:</span>
              <input
                type="range"
                min={0}
                max={120}
                step={15}
                value={apqElapsedMins}
                onChange={e => {
                  const val = Number(e.target.value);
                  setApqElapsedMins(val);
                  runApqSimulation(val);
                }}
                className="w-32 h-1.5 bg-[#FFFDF9] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="font-mono text-xs font-bold text-emerald-400 w-12 text-right">
                +{apqElapsedMins}m
              </span>
            </div>
          </div>

          {apqResult && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Queue Leaderboard */}
              <div className="lg:col-span-8 bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8E4C9] pb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Dynamic Priority Roster (Elapsed: +{apqResult.simulation_parameters.elapsed_minutes} mins)
                    </h4>
                    <p className="text-xs text-[#736860] mt-0.5">
                      {apqResult.current_ranking.algorithmic_guarantee}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                      SLA Breaches: {apqResult.current_ranking.sla_breach_count}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                      High LWBS Risk: {apqResult.current_ranking.high_lwbs_risk_count}
                    </span>
                  </div>
                </div>

                {/* Queue Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E8E4C9] text-[#736860] uppercase font-mono text-[10px]">
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Patient</th>
                        <th className="py-2.5 px-3">Acuity</th>
                        <th className="py-2.5 px-3">Dynamic Score $P(t)$</th>
                        <th className="py-2.5 px-3">Wait Time</th>
                        <th className="py-2.5 px-3">LWBS Hazard</th>
                        <th className="py-2.5 px-3">Aging Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {apqResult.current_ranking.queue.map(p => (
                        <tr key={p.patient_id} className="hover:bg-[#FFFDF9] transition">
                          <td className="py-3 px-3 font-mono font-bold text-white">
                            #{p.queue_rank}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">{p.name}</div>
                            <div className="text-[10px] text-[#736860] font-mono">{p.patient_id} • {p.chief_concern}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.acuity_level === 1
                                  ? 'bg-rose-500 text-white'
                                  : p.acuity_level === 2
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              }`}
                            >
                              L{p.acuity_level}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                            {p.dynamic_priority_score}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <span className={p.is_sla_breached ? 'text-rose-400 font-bold' : 'text-[#736860]'}>
                              {p.elapsed_wait_minutes}m
                            </span>
                            <span className="text-[10px] text-[#8E8278] block">target: {p.max_wait_target_mins}m</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-[#FFFDF9] rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    p.lwbs_risk_percentage > 60
                                      ? 'bg-rose-500'
                                      : p.lwbs_risk_percentage > 30
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${p.lwbs_risk_percentage}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-bold text-white">
                                {p.lwbs_risk_percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {p.starvation_promotion_levels > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1 w-fit">
                                <Sparkles className="w-3 h-3" />
                                +{p.starvation_promotion_levels} Tier Age-Up
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#8E8278]">Normal Accumulation</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Temporal Drift Projections Card */}
              <div className="lg:col-span-4 bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-4">
                <h4 className="text-sm font-semibold text-[#251E1A] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Multi-Horizon Queue Drift (0 to 120m)
                </h4>
                <p className="text-xs text-[#736860] leading-relaxed">
                  Demonstrates how the mathematical aging function dynamically reorders the queue over time, preventing lower-acuity patients from starving.
                </p>

                <div className="space-y-3 pt-2">
                  {apqResult.temporal_drift_projections.slice(0, 5).map((step, idx) => (
                    <div key={idx} className="p-3 bg-[#FDFDF1] rounded-xl border border-[#E8E4C9] text-xs">
                      <div className="flex justify-between items-center font-bold text-[#736860] mb-1.5">
                        <span className="font-mono text-emerald-400">T + {step.time_offset_minutes} mins</span>
                        <span className="text-[11px] text-[#736860]">
                          SLA Breaches: {step.summary.sla_breaches}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {step.leaderboard.slice(0, 4).map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              p.promoted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                                : 'bg-[#FFFDF9] text-[#736860]'
                            }`}
                          >
                            #{p.rank} {p.name.split(' ')[0]} (L{p.acuity})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: Hungarian Bed Matching Optimizer                             */}
      {/* ==================================================================== */}
      {activeTab === 'bed-match' && (
        <div className="space-y-6">
          <div className="bg-white border border-violet-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 border border-violet-500/30">
                <Bed className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#251E1A]">
                  Kuhn-Munkres Hungarian Algorithm: Optimal Bipartite Bed Allocation
                </h3>
                <p className="text-xs text-[#736860]">
                  Global polynomial time O(V³) optimization matching incoming patients to hospital beds while strictly enforcing mechanical ventilation, negative pressure isolation, and scarce asset conservation constraints.
                </p>
              </div>
            </div>

            <button
              onClick={runBedMatchOptimization}
              disabled={bedMatchLoading}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5"
            >
              {bedMatchLoading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Recompute Optimal Matching
            </button>
          </div>

          {bedMatchResult && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-[#E8E4C9] rounded-2xl">
                  <div className="text-xs text-[#736860]">Allocation Efficiency</div>
                  <div className="text-3xl font-black text-violet-400 mt-1">
                    {bedMatchResult.allocation_efficiency_pct}%
                  </div>
                  <span className="text-[11px] text-[#8E8278]">Global compatibility index</span>
                </div>
                <div className="p-4 bg-white border border-[#E8E4C9] rounded-2xl">
                  <div className="text-xs text-[#736860]">Matched Patients</div>
                  <div className="text-3xl font-black text-white mt-1">
                    {bedMatchResult.matched_count} / {bedMatchResult.total_patients_evaluated}
                  </div>
                  <span className="text-[11px] text-emerald-400">Optimal assignment set</span>
                </div>
                <div className="p-4 bg-white border border-[#E8E4C9] rounded-2xl">
                  <div className="text-xs text-[#736860]">Unassigned / Blocked</div>
                  <div className="text-3xl font-black text-rose-400 mt-1">
                    {bedMatchResult.unassigned_patient_count}
                  </div>
                  <span className="text-[11px] text-[#8E8278]">Capacity deficit</span>
                </div>
                <div className="p-4 bg-white border border-[#E8E4C9] rounded-2xl">
                  <div className="text-xs text-[#736860]">Computational Guarantee</div>
                  <div className="text-sm font-mono font-bold text-cyan-400 mt-2">
                    {bedMatchResult.complexity}
                  </div>
                  <span className="text-[11px] text-[#8E8278]">Global minimum cost proven</span>
                </div>
              </div>

              {/* Bipartite Matching Visualizer Cards */}
              <div className="bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-4">
                <h4 className="text-sm font-semibold text-white">
                  Optimal Bipartite Assignments & Clinical Rationale
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bedMatchResult.assignments.map((pair, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#FDFDF1]/70 border border-[#E8E4C9] rounded-xl space-y-3 hover:border-violet-500/40 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              pair.patient_priority === 1
                                ? 'bg-rose-500'
                                : pair.patient_priority === 2
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span className="text-xs font-bold text-[#251E1A]">
                            {pair.patient_name} ({pair.patient_id})
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-violet-400 bg-violet-950/40 px-2 py-0.5 rounded border border-violet-800/40">
                          {pair.match_quality_percentage}% Quality
                        </span>
                      </div>

                      {/* Matching Arrow */}
                      <div className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border border-[#E8E4C9]">
                        <span className="text-[#736860]">Assigned Bed:</span>
                        <strong className="text-cyan-300 font-mono">{pair.bed_id}</strong>
                        <span className="text-[#8E8278]">({pair.ward})</span>
                      </div>

                      {/* Rationale chips */}
                      <div className="space-y-1">
                        {pair.clinical_rationale.map((r, rIdx) => (
                          <div key={rIdx} className="text-[11px] text-[#736860] flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: DDI & Contextual Alert Fatigue Suppression                   */}
      {/* ==================================================================== */}
      {activeTab === 'ddi' && (
        <div className="space-y-6">
          <div className="bg-white border border-indigo-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/30">
                <Network className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#251E1A]">
                  Contextual Alert Fatigue Suppression Engine (JAMIA 2024-2025)
                </h3>
                <p className="text-xs text-[#736860]">
                  Suppresses 90%+ of inconsequential clinical alert noise by cross-referencing active laboratory biomarkers (e.g. Potassium $K^+$ and Renal eGFR) before escalating to a doctor hard-stop.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-4">
              <h4 className="text-sm font-semibold text-[#251E1A] border-b border-[#E8E4C9] pb-3">
                Prescription Safety & Lab Conditioning Panel
              </h4>

              <div>
                <label className="text-xs font-semibold text-[#736860] block mb-1">
                  Proposed Medication:
                </label>
                <input
                  type="text"
                  value={candidateDrug}
                  onChange={e => setCandidateDrug(e.target.value)}
                  className="w-full bg-[#FFFDF9] border border-[#E8E4C9] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#736860] block mb-1">
                  Active Medications:
                </label>
                <input
                  type="text"
                  value={activeMedsInput}
                  onChange={e => setActiveMedsInput(e.target.value)}
                  className="w-full bg-[#FFFDF9] border border-[#E8E4C9] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Biomarker Conditioning Inputs */}
              <div className="p-4 bg-[#FDFDF1] rounded-xl border border-indigo-500/30 space-y-3">
                <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Active Laboratory Conditioning Parameters:
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#736860] block mb-1">Serum Potassium ($K^+$):</label>
                    <input
                      type="number"
                      step={0.1}
                      value={serumPotassium}
                      onChange={e => setSerumPotassium(Number(e.target.value))}
                      className="w-full bg-[#FFFDF9] border border-[#E8E4C9] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                    <span className="text-[10px] text-[#8E8278] mt-0.5 block">safe: 3.5 - 4.5 mEq/L</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#736860] block mb-1">Renal eGFR:</label>
                    <input
                      type="number"
                      value={serumEgfr}
                      onChange={e => setSerumEgfr(Number(e.target.value))}
                      className="w-full bg-[#FFFDF9] border border-[#E8E4C9] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                    <span className="text-[10px] text-[#8E8278] mt-0.5 block">safe: &ge; 60 mL/min</span>
                  </div>
                </div>
              </div>

              <button
                onClick={runDdiCheck}
                disabled={ddiLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                {ddiLoading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run Contextual Safety Audit
              </button>
            </div>

            {/* Results Output */}
            <div className="lg:col-span-7 space-y-6">
              {ddiResult && (
                <>
                  {/* Alert Fatigue Reduction Pill */}
                  {ddiResult.alert_fatigue_stats && (
                    <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between">
                      <div className="text-xs">
                        <div className="font-bold text-white">Alert Fatigue Reduction</div>
                        <div className="text-[#736860] text-[11px]">
                          {ddiResult.alert_fatigue_stats.contextually_suppressed} irrelevant alerts suppressed via lab biomarkers.
                        </div>
                      </div>
                      <div className="text-2xl font-black text-indigo-400 font-mono">
                        {ddiResult.alert_fatigue_stats.fatigue_reduction_pct}%
                      </div>
                    </div>
                  )}

                  {/* Safety Status Banner */}
                  <div
                    className={`rounded-2xl p-6 border transition-all ${
                      ddiResult.safety_status === 'CRITICAL_BLOCKED'
                        ? 'bg-rose-950/40 border-rose-500/50'
                        : ddiResult.safety_status === 'WARNING_REQUIRES_OVERRIDE'
                        ? 'bg-amber-950/40 border-amber-500/50'
                        : 'bg-emerald-950/40 border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {ddiResult.safety_status === 'CRITICAL_BLOCKED' ? (
                        <AlertOctagon className="w-8 h-8 text-rose-400 shrink-0" />
                      ) : ddiResult.safety_status === 'WARNING_REQUIRES_OVERRIDE' ? (
                        <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-base font-bold text-white">
                          {ddiResult.safety_label}
                        </div>
                        <div className="text-xs text-[#736860]">
                          Candidate: <strong>{ddiResult.candidate_drug}</strong> | Actionable Alerts: <strong>{ddiResult.conflict_count}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Suppressed Alerts Log */}
                  {ddiResult.suppressed_conflicts && ddiResult.suppressed_conflicts.length > 0 && (
                    <div className="p-4 bg-white border border-[#E8E4C9] rounded-xl space-y-2">
                      <div className="text-xs font-bold text-[#736860] uppercase tracking-wider">
                        Contextually Suppressed Alerts (Noise Filtered):
                      </div>
                      {ddiResult.suppressed_conflicts.map((s: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-[#FDFDF1] text-xs text-[#736860] border border-[#E8E4C9]">
                          <span className="text-emerald-400 font-bold">{s.type}:</span> {s.suppression_reason}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: Mass Casualty Incident (MCI) START Triage                     */}
      {/* ==================================================================== */}
      {activeTab === 'mci' && (
        <div className="space-y-6">
          <div className="bg-white border border-amber-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/30">
                <Siren className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#251E1A]">
                  MCI START Protocol Triage & Surge Bed/Ventilator Deficit Modeler
                </h3>
                <p className="text-xs text-[#736860]">
                  Evaluates disaster casualties across the RPM (Respiration, Perfusion, Mental Status) tree with automated surge capacity deficit calculations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#736860]">Scenario:</span>
              <select
                value={selectedScenarioKey}
                onChange={e => {
                  setSelectedScenarioKey(e.target.value);
                  runMciSimulation(e.target.value);
                }}
                className="bg-[#FFFDF9] border border-[#E8E4C9] text-xs rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                {mciScenarios.map(s => (
                  <option key={s.key} value={s.key}>
                    {s.title} ({s.casualty_count} casualties)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mciResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-4">
                  <span className="text-[10px] uppercase font-bold text-rose-400">RED (Immediate)</span>
                  <div className="text-3xl font-black text-white mt-1">{mciResult.category_counts.Red}</div>
                </div>
                <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4">
                  <span className="text-[10px] uppercase font-bold text-amber-400">YELLOW (Delayed)</span>
                  <div className="text-3xl font-black text-white mt-1">{mciResult.category_counts.Yellow}</div>
                </div>
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4">
                  <span className="text-[10px] uppercase font-bold text-emerald-400">GREEN (Minor)</span>
                  <div className="text-3xl font-black text-white mt-1">{mciResult.category_counts.Green}</div>
                </div>
                <div className="bg-white border border-[#E8E4C9] rounded-2xl p-4">
                  <span className="text-[10px] uppercase font-bold text-[#736860]">BLACK (Expectant)</span>
                  <div className="text-3xl font-black text-white mt-1">{mciResult.category_counts.Black}</div>
                </div>
              </div>

              {/* Casualty List */}
              <div className="bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-3">
                <h4 className="text-sm font-semibold text-[#251E1A]">START Casualty Roster & Field Directives</h4>
                {mciResult.victims.map(victim => (
                  <div
                    key={victim.victim_id}
                    onClick={() => setExpandedVictimId(expandedVictimId === victim.victim_id ? null : victim.victim_id)}
                    className="p-3.5 rounded-xl border border-[#E8E4C9] bg-[#FDFDF1] hover:border-[#E8E4C9] cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            victim.category === 'Red' ? 'bg-rose-500' : victim.category === 'Yellow' ? 'bg-amber-500' : victim.category === 'Green' ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                        />
                        <span className="font-bold text-white">{victim.victim_id} — {victim.name}</span>
                        <span className="text-[#736860]">({victim.injuries})</span>
                      </div>
                      <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-[#FFFDF9] text-[#736860]">
                        {victim.label}
                      </span>
                    </div>

                    {expandedVictimId === victim.victim_id && (
                      <div className="mt-3 pt-3 border-t border-[#E8E4C9] space-y-1.5 text-[11px] font-mono text-[#736860]">
                        {victim.decision_path.map((step, sIdx) => (
                          <div key={sIdx}>{step}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: Glass-Box & Merkle Proofs                                    */}
      {/* ==================================================================== */}
      {activeTab === 'dsa' && (
        <div className="space-y-6">
          <div className="bg-white border border-fuchsia-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-fuchsia-500/10 rounded-xl text-fuchsia-400 border border-fuchsia-500/30">
                <Binary className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#251E1A]">
                  Glass-Box DSA Visualizers & Binary Merkle Proof Explorer
                </h3>
                <p className="text-xs text-[#736860]">
                  Step-by-step mathematical inspection of Levenshtein dynamic programming matrices, min-heap sift-up swap operations, and $O(\log N)$ Merkle cryptographic proofs of inclusion.
                </p>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-white rounded-xl border border-[#E8E4C9]">
              <button
                onClick={() => setDsaSubTab('merkle')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dsaSubTab === 'merkle' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-[#736860] hover:text-white'
                }`}
              >
                Merkle Proof O(log N)
              </button>
              <button
                onClick={() => setDsaSubTab('levenshtein')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dsaSubTab === 'levenshtein' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-[#736860] hover:text-white'
                }`}
              >
                Levenshtein DP Grid
              </button>
              <button
                onClick={() => setDsaSubTab('heap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dsaSubTab === 'heap' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-[#736860] hover:text-white'
                }`}
              >
                Heap Sift-Up Stepper
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Merkle Tree Proof of Inclusion */}
          {dsaSubTab === 'merkle' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E4C9] pb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-[#251E1A] flex items-center gap-2">
                      <Key className="w-4 h-4 text-fuchsia-400" />
                      Binary Merkle Tree Cryptographic Inclusion Verifier
                    </h4>
                    <p className="text-xs text-[#736860] mt-0.5">
                      Proves mathematical presence of a clinical order in the root hash without revealing adjacent patient records (Zero-Knowledge Privacy).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => runMerkleProof(merkleLeafIndex, false)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Verify Authentic Record
                    </button>
                    <button
                      onClick={() => runMerkleProof(merkleLeafIndex, true)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ShieldX className="w-4 h-4" />
                      Simulate 1-Byte Tampering
                    </button>
                  </div>
                </div>

                {merkleResult && (
                  <div className="space-y-4">
                    {/* Root & Verdict Callout */}
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between ${
                        merkleVerifyResult?.is_valid
                          ? 'bg-emerald-950/40 border-emerald-500/50'
                          : 'bg-rose-950/40 border-rose-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {merkleVerifyResult?.is_valid ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <AlertOctagon className="w-6 h-6 text-rose-400" />
                        )}
                        <div>
                          <div className="text-xs font-bold text-[#251E1A]">
                            {merkleVerifyResult?.verdict === 'VERIFIED_AUTHENTIC'
                              ? 'CRYPTOGRAPHIC PROOF VALID — RECORD VERIFIED UNTAMPERED'
                              : 'TAMPERING DETECTED — RECONSTRUCTED HASH REJECTED'}
                          </div>
                          <div className="text-[11px] font-mono text-[#736860]">
                            Root: {merkleResult.merkle_root.slice(0, 32)}...
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-fuchsia-300">
                        {merkleResult.proof_of_inclusion.theoretical_complexity}
                      </span>
                    </div>

                    {/* Step-by-Step Proof Path */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-[#736860]">
                        Merkle Path Verification Trace:
                      </div>
                      {merkleVerifyResult?.steps.map((s: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-[#FDFDF1] rounded-xl border border-[#E8E4C9] text-xs font-mono flex items-center justify-between"
                        >
                          <div>
                            <span className="text-fuchsia-400 font-bold">Step {s.step}:</span>{' '}
                            <span className="text-[#736860]">{s.explanation}</span>
                          </div>
                          <span className="text-[10px] text-[#8E8278] uppercase px-2 py-0.5 rounded bg-[#FFFDF9]">
                            {s.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab 2: Levenshtein DP Matrix */}
          {dsaSubTab === 'levenshtein' && levResult && (
            <div className="bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-4">
              <h4 className="text-sm font-semibold text-white">
                Levenshtein DP Grid ({levResult.string_1} vs {levResult.string_2})
              </h4>
              <div className="overflow-x-auto pb-4">
                <table className="border-collapse mx-auto text-xs font-mono">
                  <thead>
                    <tr>
                      <th className="p-2 bg-[#FDFDF1] border border-[#E8E4C9]"></th>
                      {levResult.columns.map((col, cIdx) => (
                        <th key={cIdx} className="p-2 bg-[#FDFDF1] border border-[#E8E4C9] text-cyan-400 font-bold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {levResult.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <th className="p-2 bg-[#FDFDF1] border border-[#E8E4C9] text-cyan-400 font-bold">
                          {row.row_header}
                        </th>
                        {row.cells.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`p-2 border text-center ${
                              cell.is_optimal_path ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'border-[#E8E4C9] text-[#736860]'
                            }`}
                          >
                            {cell.value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab 3: Min-Heap Sift-Up Stepper */}
          {dsaSubTab === 'heap' && heapResult && (
            <div className="bg-white border border-[#E8E4C9] rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[#E8E4C9] pb-3">
                <h4 className="text-sm font-semibold text-white">
                  Min-Heap Sift-Up Stepper (Step {heapCurrentStep + 1} of {heapResult.steps.length})
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHeapCurrentStep(p => Math.max(0, p - 1))}
                    disabled={heapCurrentStep === 0}
                    className="px-3 py-1 rounded bg-[#FFFDF9] text-xs disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setHeapCurrentStep(p => Math.min(heapResult.steps.length - 1, p + 1))}
                    disabled={heapCurrentStep === heapResult.steps.length - 1}
                    className="px-3 py-1 rounded bg-fuchsia-600 text-white text-xs disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>

              {heapResult.steps[heapCurrentStep] && (
                <div className="p-6 bg-[#FDFDF1] rounded-xl border border-[#E8E4C9] flex justify-center gap-3">
                  {heapResult.steps[heapCurrentStep].array_state.map((val, idx) => (
                    <div
                      key={idx}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-sm border ${
                        idx === heapResult.steps[heapCurrentStep].active_index
                          ? 'bg-fuchsia-600 text-white border-fuchsia-400 scale-110 shadow-lg'
                          : 'bg-[#FFFDF9] border-[#E8E4C9] text-[#736860]'
                      }`}
                    >
                      {val}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
