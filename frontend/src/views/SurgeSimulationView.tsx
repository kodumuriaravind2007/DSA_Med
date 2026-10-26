import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SurgeSimulationResult } from '../types';
import {
  Activity, AlertTriangle, Users, BedDouble, Clock,
  ShieldAlert, Sparkles, TrendingUp, RefreshCw, CheckCircle2,
  Sliders, ArrowRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';

export const SurgeSimulationView: React.FC = () => {
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.8);
  const [doctorShortage, setDoctorShortage] = useState<number>(20.0);
  const [bedReduction, setBedReduction] = useState<number>(15.0);
  const [supplyStrain, setSupplyStrain] = useState<number>(1.4);

  const [simulationResult, setSimulationResult] = useState<SurgeSimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runSimulation = async () => {
    setIsLoading(true);
    try {
      const res = await api.simulateSurge({
        arrival_surge_multiplier: Number(surgeMultiplier),
        doctor_shortage_pct: Number(doctorShortage),
        bed_capacity_reduction_pct: Number(bedReduction),
        supply_strain_factor: Number(supplyStrain),
      });
      setSimulationResult(res);
    } catch (err) {
      console.error('Surge simulation failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [surgeMultiplier, doctorShortage, bedReduction, supplyStrain]);

  const applyPreset = (preset: {
    surge: number;
    docShort: number;
    bedRed: number;
    supply: number;
  }) => {
    setSurgeMultiplier(preset.surge);
    setDoctorShortage(preset.docShort);
    setBedReduction(preset.bedRed);
    setSupplyStrain(preset.supply);
  };

  const sim = simulationResult;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-[#2A161B]">
      {/* Simulation Header */}
      <div className="bg-white border border-[#E8DBC0] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#7F011F] tracking-tight">Hospital Surge Forecasting & Bottleneck Simulation</h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F5EBD0] text-[#7F011F] border border-[#E8DBC0]">
              Crisis Decision Engine
            </span>
          </div>
          <p className="text-xs text-[#6B5B5E]">
            Parametric stress-testing: Evaluate queue delays, resource exhaustion, and bottlenecks under mass casualty or epidemic conditions
          </p>
        </div>

        <button
          onClick={runSimulation}
          className="px-4 py-2.5 bg-[#7F011F] hover:bg-[#680119] text-[#F5EBD0] rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Recompute Simulation
        </button>
      </div>

      {/* Preset Crisis Scenarios Bar */}
      <div className="bg-white border border-[#E8DBC0] rounded-2xl p-4 shadow-sm">
        <span className="text-xs font-semibold text-[#6B5B5E] uppercase tracking-wider mb-2.5 block flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#7F011F]" />
          Load Crisis Scenario Presets:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => applyPreset({ surge: 1.0, docShort: 0.0, bedRed: 0.0, supply: 1.0 })}
            className="p-2.5 bg-[#FAF6EC] hover:bg-[#F5EBD0] rounded-xl text-xs font-medium border border-[#E8DBC0] transition-all text-left"
          >
            <span className="font-bold block text-emerald-800">1. Baseline Normal</span>
            <span className="text-[10px] text-[#6B5B5E]">Standard daily operating load</span>
          </button>

          <button
            onClick={() => applyPreset({ surge: 2.5, docShort: 10.0, bedRed: 10.0, supply: 1.8 })}
            className="p-2.5 bg-[#FAF6EC] hover:bg-[#F5EBD0] rounded-xl text-xs font-medium border border-[#E8DBC0] transition-all text-left"
          >
            <span className="font-bold block text-[#7F011F]">2. Mass Casualty Incident</span>
            <span className="text-[10px] text-[#6B5B5E]">2.5x arrivals, rapid bed drain</span>
          </button>

          <button
            onClick={() => applyPreset({ surge: 1.9, docShort: 35.0, bedRed: 20.0, supply: 2.2 })}
            className="p-2.5 bg-[#FAF6EC] hover:bg-[#F5EBD0] rounded-xl text-xs font-medium border border-[#E8DBC0] transition-all text-left"
          >
            <span className="font-bold block text-amber-800">3. Epidemic / Pandemic</span>
            <span className="text-[10px] text-[#6B5B5E]">35% doctor sick leave, supply strain</span>
          </button>

          <button
            onClick={() => applyPreset({ surge: 1.2, docShort: 45.0, bedRed: 40.0, supply: 2.5 })}
            className="p-2.5 bg-[#FAF6EC] hover:bg-[#F5EBD0] rounded-xl text-xs font-medium border border-[#E8DBC0] transition-all text-left"
          >
            <span className="font-bold block text-purple-800">4. Supply Chain Shock</span>
            <span className="text-[10px] text-[#6B5B5E]">Facility damage & staff shortage</span>
          </button>
        </div>
      </div>

      {/* Interactive Stress-Test Slider Controls */}
      <div className="bg-white border border-[#E8DBC0] rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#7F011F] flex items-center gap-2 border-b border-[#E8DBC0] pb-2">
          <Sliders className="w-4 h-4" />
          Interactive Parametric Stress Factors
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {/* 1. Arrival Multiplier */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#6B5B5E] font-semibold">Arrival Surge Rate</span>
              <span className="font-bold text-[#7F011F] bg-[#FAF0F2] px-2 py-0.5 rounded border border-[#7F011F]/20">
                {surgeMultiplier}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.5"
              step="0.1"
              value={surgeMultiplier}
              onChange={(e) => setSurgeMultiplier(Number(e.target.value))}
              className="w-full accent-[#7F011F]"
            />
            <p className="text-[10px] text-[#8C7B7E]">Simulates sudden influx of emergency walk-ins</p>
          </div>

          {/* 2. Doctor Shortage */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#6B5B5E] font-semibold">Clinician Deficit</span>
              <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {doctorShortage}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="70"
              step="5"
              value={doctorShortage}
              onChange={(e) => setDoctorShortage(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
            <p className="text-[10px] text-[#8C7B7E]">Unavailable on-duty physician capacity</p>
          </div>

          {/* 3. Bed Capacity Reduction */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#6B5B5E] font-semibold">Ward Bed Reduction</span>
              <span className="font-bold text-[#7F011F] bg-[#FAF0F2] px-2 py-0.5 rounded border border-[#7F011F]/20">
                {bedReduction}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={bedReduction}
              onChange={(e) => setBedReduction(Number(e.target.value))}
              className="w-full accent-[#7F011F]"
            />
            <p className="text-[10px] text-[#8C7B7E]">Beds under maintenance, cleaning, or closed</p>
          </div>

          {/* 4. Supply Strain */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#6B5B5E] font-semibold">Supply Strain Factor</span>
              <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {supplyStrain}x
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={supplyStrain}
              onChange={(e) => setSupplyStrain(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <p className="text-[10px] text-[#8C7B7E]">IV fluids & consumables drain</p>
          </div>
        </div>
      </div>

      {/* Critical Identified Bottleneck Alert */}
      {sim && (
        <div className="bg-[#FAF0F2] border border-[#7F011F]/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-[#7F011F] shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-[#7F011F] tracking-wider block">
                Primary Identified Hospital Bottleneck:
              </span>
              <h2 className="text-base font-bold text-[#2A161B] tracking-tight">{sim.critical_bottleneck}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs shrink-0">
            <div>
              <span className="text-[#6B5B5E] block text-[10px]">Physician Stress Index:</span>
              <span className={`text-base font-bold ${sim.simulated_stats.doctor_utilization_pct >= 90 ? 'text-[#7F011F]' : 'text-amber-800'}`}>
                {sim.simulated_stats.doctor_utilization_pct}%
              </span>
            </div>
            <div className="border-l border-[#E8DBC0] pl-4">
              <span className="text-[#6B5B5E] block text-[10px]">Bed Exhaustion Horizon:</span>
              <span className="text-base font-bold text-[#2A161B]">
                {sim.simulated_stats.hours_to_bed_saturation} hrs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Comparative Results & Chart Grid */}
      {sim && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Chart: Projected Queue Buildup by Priority Tier */}
          <div className="lg:col-span-7 bg-white border border-[#E8DBC0] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E8DBC0] pb-3">
              <h3 className="text-sm font-bold text-[#7F011F] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#7F011F]" />
                Queue Buildup Projection (Baseline vs Crisis Surge)
              </h3>
              <span className="text-xs text-[#6B5B5E]">4-Hour Horizon</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sim.projected_queue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DBC0" opacity={0.6} />
                  <XAxis dataKey="tier" stroke="#8C7B7E" fontSize={10} />
                  <YAxis stroke="#8C7B7E" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#FAF5E8', borderColor: '#E8DBC0', borderRadius: '12px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="baseline_count" name="Baseline Patients" fill="#b45309" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="surge_count" name="Simulated Surge Patients" fill="#7F011F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
              <div className="p-2.5 bg-[#FAF6EC] rounded-xl border border-[#E8DBC0]">
                <span className="text-[10px] text-[#6B5B5E] block">Crit Wait (P1)</span>
                <span className="font-bold text-[#7F011F]">{sim.simulated_stats.wait_time_critical_mins}m</span>
              </div>
              <div className="p-2.5 bg-[#FAF6EC] rounded-xl border border-[#E8DBC0]">
                <span className="text-[10px] text-[#6B5B5E] block">Urgent Wait (P2)</span>
                <span className="font-bold text-amber-800">{sim.simulated_stats.wait_time_urgent_mins}m</span>
              </div>
              <div className="p-2.5 bg-[#FAF6EC] rounded-xl border border-[#E8DBC0]">
                <span className="text-[10px] text-[#6B5B5E] block">Normal Wait (P3)</span>
                <span className="font-bold text-emerald-800">{sim.simulated_stats.wait_time_normal_mins}m</span>
              </div>
            </div>
          </div>

          {/* Right Column: Algorithmic Recommendations & Department Stress */}
          <div className="lg:col-span-5 space-y-6">
            {/* Recommendations */}
            <div className="bg-white border border-[#E8DBC0] rounded-2xl p-6 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-[#7F011F] flex items-center gap-2 border-b border-[#E8DBC0] pb-2">
                <Sparkles className="w-4 h-4 text-[#7F011F]" />
                Algorithmic Incident Command Recommendations
              </h3>

              <div className="space-y-2">
                {sim.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#FAF6EC] border border-[#E8DBC0] flex items-start gap-2 text-xs text-[#2A161B]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Load Simulation */}
            <div className="bg-white border border-[#E8DBC0] rounded-2xl p-6 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-[#7F011F] flex items-center gap-2 border-b border-[#E8DBC0] pb-2">
                <Users className="w-4 h-4 text-[#7F011F]" />
                Simulated Department Capacity Saturation
              </h3>

              <div className="space-y-3">
                {sim.department_load.map((dept, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#2A161B] font-medium">{dept.name}</span>
                      <span className={`font-bold ${dept.simulated_load_pct >= 90 ? 'text-[#7F011F]' : dept.simulated_load_pct >= 70 ? 'text-amber-800' : 'text-emerald-700'}`}>
                        {dept.simulated_load_pct}%
                      </span>
                    </div>
                    <div className="w-full bg-[#FAF6EC] rounded-full h-2 overflow-hidden border border-[#E8DBC0]">
                      <div
                        className={`h-full transition-all duration-500 ${
                          dept.simulated_load_pct >= 90 ? 'bg-[#7F011F]' : dept.simulated_load_pct >= 70 ? 'bg-amber-600' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, dept.simulated_load_pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
