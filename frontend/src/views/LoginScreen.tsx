import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Stethoscope, HeartPulse, User, Lock, ArrowRight,
  ShieldCheck, Activity, UserPlus, AlertCircle, CheckCircle2,
  Sparkles, KeyRound
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, patientRegister } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | 'nurse'>('doctor');
  const [username, setUsername] = useState('dr_smith');
  const [password, setPassword] = useState('doctor123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Patient Registration fields
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAge, setRegAge] = useState(32);
  const [regGender, setRegGender] = useState('Female');
  const [regPhone, setRegPhone] = useState('+91 98765-43210');
  const [regEmail, setRegEmail] = useState('');
  const [regDepartment, setRegDepartment] = useState('Emergency');
  const [regConcern, setRegConcern] = useState('');

  const handleRoleSelect = (role: 'patient' | 'doctor' | 'nurse') => {
    setSelectedRole(role);
    setError(null);
    setIsRegisterMode(false);
    if (role === 'doctor') {
      setUsername('dr_smith');
      setPassword('doctor123');
    } else if (role === 'nurse') {
      setUsername('nurse_sarah');
      setPassword('nurse123');
    } else {
      setUsername('patient101');
      setPassword('password123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your username and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
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
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoSelect = (u: string, p: string, r: 'patient' | 'doctor' | 'nurse') => {
    setSelectedRole(r);
    setUsername(u);
    setPassword(p);
    setError(null);
    setIsRegisterMode(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EC] flex flex-col justify-between text-[#2A161B] selection:bg-[#7F011F] selection:text-[#F5EBD0]">
      {/* Top Minimalist Brand Banner */}
      <header className="px-8 py-5 border-b border-[#E8DBC0] flex items-center justify-between bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center font-bold text-lg shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-[#7F011F]">MedTree X</span>
              <span className="text-[10px] font-semibold bg-[#F5EBD0] text-[#7F011F] px-2 py-0.5 rounded-full border border-[#E8DBC0]">
                Hospital Operating Engine
              </span>
            </div>
            <p className="text-[11px] text-[#6E5A5E]">Data Structures & Algorithms in Real Healthcare Workflows</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#6E5A5E]">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>Single Source of Truth • Real-Time Synchronization</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-6 my-4">
        <div className="w-full max-w-xl bg-white border border-[#E8DBC0] rounded-2xl shadow-xl shadow-[#7F011F]/5 overflow-hidden">
          {/* Header Title */}
          <div className="p-8 pb-6 text-center border-b border-[#E8DBC0] bg-[#FAF6EC]/50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7F011F] bg-[#FAF0F2] px-3 py-1 rounded-full border border-[#E8B6C0]">
              Role-Based Authentication Gateway
            </span>
            <h1 className="text-2xl font-bold text-[#2A161B] mt-3 tracking-tight">
              Sign In to Your Workspace
            </h1>
            <p className="text-xs text-[#6E5A5E] mt-1 max-w-md mx-auto">
              Select your clinical or patient persona to route directly to your dedicated workspace.
            </p>

            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-3 gap-2 mt-6">
              <button
                type="button"
                onClick={() => handleRoleSelect('doctor')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
                  selectedRole === 'doctor'
                    ? 'bg-[#7F011F] text-[#F5EBD0] border-[#7F011F] shadow-sm'
                    : 'bg-white text-[#6E5A5E] hover:text-[#2A161B] border-[#E8DBC0]'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Doctor</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('nurse')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
                  selectedRole === 'nurse'
                    ? 'bg-[#7F011F] text-[#F5EBD0] border-[#7F011F] shadow-sm'
                    : 'bg-white text-[#6E5A5E] hover:text-[#2A161B] border-[#E8DBC0]'
                }`}
              >
                <HeartPulse className="w-4 h-4" />
                <span>Nurse</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('patient')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
                  selectedRole === 'patient'
                    ? 'bg-[#7F011F] text-[#F5EBD0] border-[#7F011F] shadow-sm'
                    : 'bg-white text-[#6E5A5E] hover:text-[#2A161B] border-[#E8DBC0]'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Patient</span>
              </button>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isRegisterMode ? (
              /* Standard Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#2A161B] block mb-1.5">
                    {selectedRole === 'patient' ? 'Patient Username / ID' : `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Username`}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8C7A7E] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full bg-[#FCF9F2] border border-[#E8DBC0] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#2A161B] placeholder-[#8C7A7E] focus:outline-none focus:border-[#7F011F] focus:ring-1 focus:ring-[#7F011F] transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#2A161B] block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8C7A7E] absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#FCF9F2] border border-[#E8DBC0] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#2A161B] placeholder-[#8C7A7E] focus:outline-none focus:border-[#7F011F] focus:ring-1 focus:ring-[#7F011F] transition"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Authenticating...' : `Enter ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Dashboard`}
                  <ArrowRight className="w-4 h-4" />
                </button>

                {selectedRole === 'patient' && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(true)}
                      className="text-xs font-semibold text-[#7F011F] hover:underline"
                    >
                      New patient? Register here for an electronic health record
                    </button>
                  </div>
                )}
              </form>
            ) : (
              /* Patient Self-Registration Form */
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#E8DBC0] pb-2">
                  <h3 className="text-xs font-bold text-[#7F011F] flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" />
                    New Patient Self-Registration
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsRegisterMode(false)}
                    className="text-xs text-[#6E5A5E] hover:text-[#2A161B]"
                  >
                    Back to Login
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#2A161B] block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Maria Gonzalez"
                      className="w-full bg-[#FCF9F2] border border-[#E8DBC0] rounded-lg px-3 py-1.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#2A161B] block mb-1">Username</label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. maria_g"
                      className="w-full bg-[#FCF9F2] border border-[#E8DBC0] rounded-lg px-3 py-1.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#2A161B] block mb-1">Password</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#FCF9F2] border border-[#E8DBC0] rounded-lg px-3 py-1.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#2A161B] block mb-1">Age</label>
                    <input
                      type="number"
                      value={regAge}
                      onChange={(e) => setRegAge(Number(e.target.value))}
                      className="w-full bg-[#FCF9F2] border border-[#E8DBC0] rounded-lg px-3 py-1.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                      min={0}
                      max={120}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#2A161B] block mb-1">Gender</label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value)}
                      className="w-full bg-[#FCF9F2] border border-[#E8DBC0] rounded-lg px-3 py-1.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#2A161B] block mb-1">Reported Symptoms</label>
                  <textarea
                    rows={2}
                    value={regConcern}
                    onChange={(e) => setRegConcern(e.target.value)}
                    placeholder="Chief health concern..."
                    className="w-full bg-[#FCF9F2] border border-[#E8DBC0] rounded-lg px-3 py-1.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#7F011F] hover:bg-[#660119] text-[#F5EBD0] font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {isLoading ? 'Registering...' : 'Register & Generate Unique ID'}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* 1-Click Demonstration Fast Login Chips */}
            <div className="pt-4 border-t border-[#E8DBC0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#6E5A5E] uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-[#7F011F]" />
                  1-Click Test Credentials:
                </span>
                <span className="text-[10px] text-[#8C7A7E]">Click to load</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => quickDemoSelect('dr_smith', 'doctor123', 'doctor')}
                  className="p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC]/60 hover:bg-[#FAF0F2] hover:border-[#7F011F] text-left transition"
                >
                  <span className="font-bold text-xs text-[#7F011F] flex items-center gap-1 block">
                    <Stethoscope className="w-3 h-3" /> Doctor
                  </span>
                  <span className="text-[11px] text-[#2A161B] font-medium block">Dr. Mukherjee</span>
                  <span className="text-[10px] text-[#8C7A7E] font-mono">dr_smith</span>
                </button>

                <button
                  type="button"
                  onClick={() => quickDemoSelect('nurse_sarah', 'nurse123', 'nurse')}
                  className="p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC]/60 hover:bg-[#FAF0F2] hover:border-[#7F011F] text-left transition"
                >
                  <span className="font-bold text-xs text-[#7F011F] flex items-center gap-1 block">
                    <HeartPulse className="w-3 h-3" /> Nurse
                  </span>
                  <span className="text-[11px] text-[#2A161B] font-medium block">Sarah Jenkins, RN</span>
                  <span className="text-[10px] text-[#8C7A7E] font-mono">nurse_sarah</span>
                </button>

                <button
                  type="button"
                  onClick={() => quickDemoSelect('patient101', 'password123', 'patient')}
                  className="p-2.5 rounded-xl border border-[#E8DBC0] bg-[#FAF6EC]/60 hover:bg-[#FAF0F2] hover:border-[#7F011F] text-left transition"
                >
                  <span className="font-bold text-xs text-[#7F011F] flex items-center gap-1 block">
                    <User className="w-3 h-3" /> Patient
                  </span>
                  <span className="text-[11px] text-[#2A161B] font-medium block">Sara Khan (PT-101)</span>
                  <span className="text-[10px] text-[#8C7A7E] font-mono">patient101</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimalist Footer */}
      <footer className="px-8 py-4 border-t border-[#E8DBC0] text-center text-xs text-[#6E5A5E] bg-white/50">
        <span>MedTree X Intelligent Hospital Management System • Built with pure DSA, FastAPI, React & SQLite</span>
      </footer>
    </div>
  );
};
