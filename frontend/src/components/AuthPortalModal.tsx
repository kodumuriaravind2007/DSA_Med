import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DemoUser } from '../types';
import {
  ShieldCheck, UserCheck, Stethoscope, HeartPulse, Building2,
  Lock, Key, ArrowRight, UserPlus, AlertCircle, CheckCircle2, X
} from 'lucide-react';

interface AuthPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'staff' | 'patient';
}

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'staff',
}) => {
  const { login, patientRegister, quickSwitchDemo } = useAuth();
  const [activeTab, setActiveTab] = useState<'staff' | 'patient'>(defaultTab);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New patient registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAge, setRegAge] = useState(30);
  const [regGender, setRegGender] = useState('Female');
  const [regPhone, setRegPhone] = useState('+91 98765-00000');
  const [regEmail, setRegEmail] = useState('');
  const [regDepartment, setRegDepartment] = useState('Emergency');
  const [regConcern, setRegConcern] = useState('');

  useEffect(() => {
    api.getDemoUsers()
      .then((users) => setDemoUsers(users))
      .catch((err) => console.error('Failed to load demo users', err));
  }, []);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await patientRegister({
        full_name: regFullName,
        username: regUsername,
        password: regPassword,
        age: Number(regAge),
        gender: regGender,
        phone: regPhone,
        email: regEmail,
        department: regDepartment,
        reported_concern: regConcern,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoClick = async (demo: DemoUser) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await quickSwitchDemo(demo);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const staffDemos = demoUsers.filter((u) => u.role !== 'patient');
  const patientDemos = demoUsers.filter((u) => u.role === 'patient');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-[#E8DBC0] rounded-2xl shadow-2xl overflow-hidden my-8 text-[#2A161B]">
        {/* Top Header */}
        <div className="p-6 bg-[#FAF6EC] border-b border-[#E8DBC0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#7F011F] tracking-tight flex items-center gap-2">
                MedTree X <span className="text-xs bg-[#FAF0F2] text-[#7F011F] px-2 py-0.5 rounded-full border border-[#7F011F]/20 font-semibold">Switch Persona</span>
              </h2>
              <p className="text-xs text-[#6B5B5E]">Role-Based Workspace Routing & Access Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#8C7B7E] hover:text-[#2A161B] rounded-lg hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-3 bg-[#FAF5E8] border-b border-[#E8DBC0] gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('staff');
              setIsRegisterMode(false);
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs transition-all border ${
              activeTab === 'staff'
                ? 'bg-[#7F011F] text-[#F5EBD0] border-[#7F011F] shadow-sm'
                : 'bg-white text-[#6B5B5E] hover:text-[#2A161B] border-[#E8DBC0]'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Staff Workspace Entry
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('patient');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs transition-all border ${
              activeTab === 'patient'
                ? 'bg-[#7F011F] text-[#F5EBD0] border-[#7F011F] shadow-sm'
                : 'bg-white text-[#6B5B5E] hover:text-[#2A161B] border-[#E8DBC0]'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            Patient Health Portal Entry
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'staff' ? (
            <div>
              {/* Quick One-Click Demo Role Selector */}
              <div className="mb-6">
                <label className="text-xs font-semibold uppercase text-[#7F011F] tracking-wider mb-2.5 block">
                  1-Click Staff Demonstration Profiles:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {staffDemos.map((demo) => (
                    <button
                      key={demo.username}
                      type="button"
                      onClick={() => handleDemoClick(demo)}
                      disabled={isSubmitting}
                      className="p-3 rounded-xl bg-[#FAF6EC] border border-[#E8DBC0] hover:border-[#7F011F] text-left transition-all hover:bg-[#FAF5E8] group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-[#2A161B] group-hover:text-[#7F011F] transition-colors flex items-center gap-1.5">
                          {demo.role === 'doctor' && <Stethoscope className="w-3.5 h-3.5 text-[#7F011F]" />}
                          {demo.role === 'nurse' && <HeartPulse className="w-3.5 h-3.5 text-[#7F011F]" />}
                          {demo.role === 'receptionist' && <Building2 className="w-3.5 h-3.5 text-amber-700" />}
                          {demo.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />}
                          {demo.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white text-[#7F011F] border border-[#E8DBC0]">
                          {demo.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B5B5E] leading-relaxed line-clamp-1">{demo.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Standard Staff Credentials Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4 pt-4 border-t border-[#E8DBC0]">
                <div className="text-xs font-semibold uppercase text-[#6B5B5E] tracking-wider mb-1">
                  Or Log In with Staff Account:
                </div>
                <div>
                  <label className="text-xs text-[#6B5B5E] block mb-1">Staff Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. receptionist, dr_smith, nurse_sarah"
                    className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-4 py-2.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-[#6B5B5E] block mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-4 py-2.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#7F011F] hover:bg-[#680119] text-[#F5EBD0] font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {isSubmitting ? 'Authenticating...' : 'Sign In to Staff Workspace'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div>
              {/* Patient Portal Entry */}
              {!isRegisterMode ? (
                <div>
                  {/* One-Click Patient Demos */}
                  <div className="mb-6">
                    <label className="text-xs font-semibold uppercase text-[#7F011F] tracking-wider mb-2.5 block">
                      1-Click Patient Demonstration Profiles:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {patientDemos.map((demo) => (
                        <button
                          key={demo.username}
                          type="button"
                          onClick={() => handleDemoClick(demo)}
                          disabled={isSubmitting}
                          className="p-3 rounded-xl bg-[#FAF6EC] border border-[#E8DBC0] hover:border-[#7F011F] text-left transition-all hover:bg-[#FAF5E8] group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-[#2A161B] group-hover:text-[#7F011F] transition-colors flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-[#7F011F]" />
                              {demo.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#7F011F] border border-[#E8DBC0]">
                              {demo.patient_id}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6B5B5E] leading-relaxed line-clamp-1">{demo.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Patient Login Form */}
                  <form onSubmit={handleLoginSubmit} className="space-y-4 pt-4 border-t border-[#E8DBC0]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase text-[#6B5B5E] tracking-wider">
                        Patient Login:
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsRegisterMode(true)}
                        className="text-xs text-[#7F011F] hover:underline font-semibold flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        New Patient? Register here
                      </button>
                    </div>

                    <div>
                      <label className="text-xs text-[#6B5B5E] block mb-1">Username / Patient ID</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. patient101 or patient102"
                        className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-4 py-2.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#6B5B5E] block mb-1">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-4 py-2.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 bg-[#7F011F] hover:bg-[#680119] text-[#F5EBD0] font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      {isSubmitting ? 'Authenticating...' : 'Sign In to Patient Portal'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ) : (
                /* Patient Registration Form */
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#E8DBC0] pb-3">
                    <h3 className="text-sm font-bold text-[#7F011F] flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      New Patient Self-Registration
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(false)}
                      className="text-xs text-[#6B5B5E] hover:text-[#2A161B]"
                    >
                      Back to Login
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#6B5B5E] block mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Maria Gonzalez"
                        className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:border-[#7F011F] focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#6B5B5E] block mb-1">Desired Username</label>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. maria_g"
                        className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:border-[#7F011F] focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-[#6B5B5E] block mb-1">Password</label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:border-[#7F011F] focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#6B5B5E] block mb-1">Age</label>
                      <input
                        type="number"
                        value={regAge}
                        onChange={(e) => setRegAge(Number(e.target.value))}
                        className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:border-[#7F011F] focus:outline-none"
                        min={0}
                        max={120}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#6B5B5E] block mb-1">Gender</label>
                      <select
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
                        className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:border-[#7F011F] focus:outline-none"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#6B5B5E] block mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:border-[#7F011F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#6B5B5E] block mb-1">Initial Department</label>
                      <select
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:border-[#7F011F] focus:outline-none"
                      >
                        <option value="Emergency">Emergency</option>
                        <option value="General Medicine">General Medicine</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Pediatrics">Pediatrics</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#6B5B5E] block mb-1">Reported Symptoms or Chief Complaint</label>
                    <textarea
                      rows={2}
                      value={regConcern}
                      onChange={(e) => setRegConcern(e.target.value)}
                      placeholder="Describe what symptoms or condition you are experiencing..."
                      className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:border-[#7F011F] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-[#7F011F] hover:bg-[#680119] text-[#F5EBD0] font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    {isSubmitting ? 'Registering Patient & Enqueueing...' : 'Register & Generate Unique Patient ID'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
