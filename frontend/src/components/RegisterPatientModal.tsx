import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, ShieldAlert, CheckCircle2, Stethoscope } from 'lucide-react';
import { api } from '../services/api';

interface RegisterPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientRegistered: (patient: any) => void;
}

const COMMON_CONCERNS = [
  "Fever", "Cough", "Sore throat", "Headache", "Dizziness",
  "Chest pain", "Difficulty breathing", "Abdominal pain", "Vomiting",
  "Diarrhea", "Dehydration", "Wounds and cuts", "Burns", "Sprains",
  "Joint pain", "Back pain", "Skin rash or allergy", "High blood pressure",
  "Diabetes follow-up", "Fatigue", "Urinary symptoms", "Ear pain",
  "Eye irritation", "Routine check-up"
];

export const RegisterPatientModal: React.FC<RegisterPatientModalProps> = ({
  isOpen,
  onClose,
  onPatientRegistered,
}) => {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<number>(35);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [govtId, setGovtId] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [department, setDepartment] = useState('Emergency');
  const [reportedConcern, setReportedConcern] = useState('Chest pain');
  const [priority, setPriority] = useState<number>(2);
  const [triageNotes, setTriageNotes] = useState('');

  // Initial Vitals
  const [sbp, setSbp] = useState<number | ''>(120);
  const [dbp, setDbp] = useState<number | ''>(80);
  const [hr, setHr] = useState<number | ''>(78);
  const [temp, setTemp] = useState<number | ''>(98.6);
  const [spo2, setSpo2] = useState<number | ''>(98);
  const [rr, setRr] = useState<number | ''>(16);

  // Live CDS suggestion state
  const [cdsSuggestion, setCdsSuggestion] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Evaluate CDS live when concern or vitals change
  useEffect(() => {
    const fetchCDS = async () => {
      try {
        const vitalsObj: any = {};
        if (sbp !== '') vitalsObj.blood_pressure_systolic = Number(sbp);
        if (dbp !== '') vitalsObj.blood_pressure_diastolic = Number(dbp);
        if (hr !== '') vitalsObj.heart_rate = Number(hr);
        if (temp !== '') vitalsObj.temperature_f = Number(temp);
        if (spo2 !== '') vitalsObj.oxygen_saturation_spo2 = Number(spo2);
        if (rr !== '') vitalsObj.respiratory_rate = Number(rr);

        const res = await api.evaluateCDS({
          reported_concern: reportedConcern,
          age: Number(age) || 35,
          vitals: vitalsObj,
        });
        setCdsSuggestion(res);
        // Automatically default priority to suggestion for clinical convenience
        if (res.suggested_priority) {
          setPriority(res.suggested_priority);
        }
        if (res.suggested_department && department === 'Emergency') {
          setDepartment(res.suggested_department);
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (isOpen && reportedConcern) {
      const debounce = setTimeout(fetchCDS, 400);
      return () => clearTimeout(debounce);
    }
  }, [isOpen, reportedConcern, age, sbp, dbp, hr, temp, spo2, rr]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload: any = {
        full_name: fullName,
        age: Number(age),
        gender,
        phone,
        email,
        govt_id: govtId,
        blood_group: bloodGroup,
        priority: Number(priority),
        department,
        reported_concern: reportedConcern,
        triage_notes: triageNotes,
      };

      if (sbp !== '' || hr !== '' || spo2 !== '') {
        payload.initial_vitals = {
          blood_pressure_systolic: sbp !== '' ? Number(sbp) : undefined,
          blood_pressure_diastolic: dbp !== '' ? Number(dbp) : undefined,
          heart_rate: hr !== '' ? Number(hr) : undefined,
          temperature_f: temp !== '' ? Number(temp) : undefined,
          respiratory_rate: rr !== '' ? Number(rr) : undefined,
          oxygen_saturation_spo2: spo2 !== '' ? Number(spo2) : undefined,
        };
      }

      const res = await api.registerPatient(payload);
      onPatientRegistered(res);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error registering patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DBC0] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E8DBC0] flex items-center justify-between bg-[#FAF6EC]">
          <div>
            <h3 className="text-base font-bold text-[#7F011F] flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#7F011F]" />
              <span>Register Patient & Clinical Triage Intake</span>
            </h3>
            <p className="text-xs text-[#6E5A5E]">
              Unique ID generation, duplicate pre-check, and Min-Heap queue insertion
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-[#8C7B7E] hover:text-[#2A161B] hover:bg-[#F5EBD0] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Section 1: Demographics */}
          <div>
            <div className="text-[11px] font-bold text-[#7F011F] uppercase tracking-wider mb-2">
              1. Demographics & Identification
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[#6E5A5E] font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] focus:bg-white focus:outline-none focus:border-[#7F011F] text-[#2A161B]"
                />
              </div>

              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Age *</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={125}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] focus:bg-white focus:outline-none focus:border-[#7F011F] text-[#2A161B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] focus:bg-white focus:outline-none focus:border-[#7F011F] text-[#2A161B]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765-43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] focus:bg-white focus:outline-none focus:border-[#7F011F] text-[#2A161B]"
                />
              </div>

              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">National ID / Aadhaar</label>
                <input
                  type="text"
                  placeholder="AADHAAR-XXXX-XXXX"
                  value={govtId}
                  onChange={(e) => setGovtId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] focus:bg-white focus:outline-none focus:border-[#7F011F] text-[#2A161B]"
                />
              </div>

              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] focus:bg-white focus:outline-none focus:border-[#7F011F] text-[#2A161B]"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Vitals */}
          <div className="pt-2 border-t border-[#E8DBC0]">
            <div className="text-[11px] font-bold text-[#7F011F] uppercase tracking-wider mb-2">
              2. Initial Triage Vital Signs
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Systolic BP</label>
                <input
                  type="number"
                  placeholder="120"
                  value={sbp}
                  onChange={(e) => setSbp(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full p-2 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-center focus:bg-white focus:outline-none focus:border-[#7F011F]"
                />
              </div>
              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Diastolic BP</label>
                <input
                  type="number"
                  placeholder="80"
                  value={dbp}
                  onChange={(e) => setDbp(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full p-2 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-center focus:bg-white focus:outline-none focus:border-[#7F011F]"
                />
              </div>
              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Heart Rate</label>
                <input
                  type="number"
                  placeholder="78"
                  value={hr}
                  onChange={(e) => setHr(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full p-2 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-center focus:bg-white focus:outline-none focus:border-[#7F011F]"
                />
              </div>
              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">SpO2 (%)</label>
                <input
                  type="number"
                  placeholder="98"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full p-2 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-center focus:bg-white focus:outline-none focus:border-[#7F011F]"
                />
              </div>
              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full p-2 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-center focus:bg-white focus:outline-none focus:border-[#7F011F]"
                />
              </div>
              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Resp. Rate</label>
                <input
                  type="number"
                  placeholder="16"
                  value={rr}
                  onChange={(e) => setRr(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full p-2 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-center focus:bg-white focus:outline-none focus:border-[#7F011F]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Reported Concern & CDS Suggestion */}
          <div className="pt-2 border-t border-[#E8DBC0]">
            <div className="text-[11px] font-bold text-[#7F011F] uppercase tracking-wider mb-2">
              3. Chief Complaint & Triage Urgency
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Reported Concern / Symptom *</label>
                <select
                  value={reportedConcern}
                  onChange={(e) => setReportedConcern(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] focus:bg-white focus:outline-none focus:border-[#7F011F] font-medium"
                >
                  {COMMON_CONCERNS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Target Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] focus:bg-white focus:outline-none focus:border-[#7F011F] font-medium"
                >
                  <option value="Emergency">Emergency</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="ICU">ICU</option>
                </select>
              </div>
            </div>

            {/* CDS Explainable Suggestion Banner */}
            {cdsSuggestion && (
              <div className="mt-3 p-3.5 bg-[#FAF6EC] border border-[#E8DBC0] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#7F011F] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#7F011F]" />
                    CDS Rule Suggestion: {cdsSuggestion.suggested_priority_label}
                  </span>
                  <span className="text-[10px] text-[#6E5A5E] font-bold">
                    Target Dept: {cdsSuggestion.suggested_department}
                  </span>
                </div>

                <div className="text-[11px] text-[#2A161B] space-y-0.5">
                  {cdsSuggestion.triggered_rules?.map((r: any, idx: number) => (
                    <div key={idx} className="font-mono text-[10px] text-[#7F011F]">
                      • Rule [{r.rule_id}]: {r.name} ➔ {r.rationale}
                    </div>
                  ))}
                </div>

                {cdsSuggestion.missing_information?.length > 0 && (
                  <div className="text-[10px] text-amber-800">
                    ⚠️ Missing data alerts: {cdsSuggestion.missing_information.join(', ')}
                  </div>
                )}

                <div className="text-[9px] text-[#8C7B7E] italic border-t border-[#E8DBC0] pt-1">
                  {cdsSuggestion.disclaimer}
                </div>
              </div>
            )}

            {/* Final Confirmed Priority */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Confirmed Triage Priority *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] focus:bg-white focus:outline-none focus:border-[#7F011F] font-bold"
                >
                  <option value={1}>Priority 1 — Critical (Red)</option>
                  <option value={2}>Priority 2 — Urgent (Amber)</option>
                  <option value={3}>Priority 3 — Normal (Sand)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#6E5A5E] font-semibold mb-1">Clinician Triage Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Diaphoretic, pale, alert"
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] focus:bg-white focus:outline-none focus:border-[#7F011F]"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#E8DBC0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E8DBC0] text-[#6E5A5E] hover:bg-[#FAF6EC] font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fullName.trim()}
              className="px-5 py-2 rounded-xl bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-bold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Registering & Enqueueing...' : 'Register Patient & Enqueue (Min-Heap)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
