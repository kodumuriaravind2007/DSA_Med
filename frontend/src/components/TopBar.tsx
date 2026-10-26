import React, { useState, useEffect } from 'react';
import { Search, Bell, Shield, User, AlertTriangle, ArrowRight, Radio, Key, LogOut } from 'lucide-react';
import { Patient } from '../types';
import { useAuth } from '../context/AuthContext';
import { wsClient } from '../services/websocket';

interface TopBarProps {
  title: string;
  subtitle: string;
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
  onOpenRegister: () => void;
  onOpenAuthModal: () => void;
  alerts: Array<{ id: string; type: string; title: string; message: string; time: string }>;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  patients,
  onSelectPatient,
  onOpenRegister,
  onOpenAuthModal,
  alerts,
}) => {
  const { user, role, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(wsClient.getStatus());

  useEffect(() => {
    const unsub = wsClient.onStatusChange((status) => {
      setIsWsConnected(status);
    });
    return unsub;
  }, []);

  const filteredPatients = searchTerm.trim()
    ? patients.filter(
        (p) =>
          p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.phone && p.phone.includes(searchTerm))
      )
    : [];

  return (
    <header className="h-16 bg-white border-b border-[#E8DBC0] px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-base font-bold text-[#7F011F] flex items-center gap-2">
          <span>{title}</span>
        </h2>
        <p className="text-xs text-[#6B5B5E]">{subtitle}</p>
      </div>

      {/* Center Search Bar */}
      <div className="relative w-80 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8C7B7E] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search patient by ID, name, phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E8DBC0] bg-[#FAF6EC] text-[#2A161B] focus:bg-white focus:outline-none focus:border-[#7F011F] transition"
          />
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchTerm.trim() && (
          <div className="absolute top-10 left-0 right-0 bg-white rounded-xl shadow-xl border border-[#E8DBC0] max-h-64 overflow-y-auto z-50">
            {filteredPatients.length > 0 ? (
              <div className="p-1.5">
                <div className="text-[10px] font-semibold text-[#8C7B7E] px-2 py-1 uppercase">
                  Patient Records ({filteredPatients.length})
                </div>
                {filteredPatients.slice(0, 5).map((p) => (
                  <button
                    key={p.patient_id}
                    onClick={() => {
                      onSelectPatient(p.patient_id);
                      setIsSearchOpen(false);
                      setSearchTerm('');
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#FAF6EC] flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-semibold text-[#2A161B] flex items-center gap-1.5">
                        <span className="font-mono text-[#7F011F]">{p.patient_id}</span>
                        <span>{p.full_name}</span>
                      </div>
                      <div className="text-[11px] text-[#6B5B5E]">
                        {p.gender}, {p.age}y • {p.department} • Priority {p.priority}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8C7B7E]" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-[#8C7B7E]">
                No matching patients found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* WebSocket Real-time Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            isWsConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title={isWsConnected ? 'Connected to live hospital event hub via WebSockets' : 'Polling mode active'}
        >
          <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="hidden sm:inline">{isWsConnected ? 'Live Sync' : 'Polling'}</span>
        </div>

        {/* Quick Action: Register Patient (for staff) */}
        {role !== 'patient' && (
          <button
            onClick={onOpenRegister}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#7F011F] hover:bg-[#680119] text-[#F5EBD0] shadow-sm transition flex items-center gap-1.5"
          >
            <span>+ Register</span>
          </button>
        )}

        {/* Alerts Popover */}
        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="p-2 rounded-xl hover:bg-[#FAF6EC] text-[#2A161B] relative transition border border-transparent hover:border-[#E8DBC0]"
          >
            <Bell className="w-4 h-4 text-[#7F011F]" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#7F011F] ring-2 ring-white"></span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-[#E8DBC0] p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8DBC0]">
                <span className="text-xs font-bold text-[#7F011F]">Live Hospital Alerts</span>
                <span className="text-[10px] font-semibold bg-[#FAF0F2] text-[#7F011F] px-1.5 py-0.5 rounded border border-[#7F011F]/20">
                  {alerts.length} Active
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-2 rounded-xl text-xs border ${
                      alt.type === 'critical'
                        ? 'bg-[#FAF0F2] border-[#7F011F]/30 text-[#7F011F]'
                        : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>{alt.title}</span>
                      <span className="text-[10px] text-[#8C7B7E] font-normal">{alt.time}</span>
                    </div>
                    <p className="text-[11px] mt-0.5 opacity-90">{alt.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Session Pill with Portal Switcher */}
        <div className="flex items-center gap-2 pl-3 border-l border-[#E8DBC0]">
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 hover:bg-[#FAF6EC] p-1.5 rounded-xl transition text-left"
            title="Click to switch role or portal"
          >
            <div className="w-8 h-8 rounded-xl bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center font-bold text-xs shadow-sm">
              {role === 'patient' ? 'PT' : role ? role.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-[#2A161B] leading-none capitalize">
                {user ? user.full_name : `${role} User`}
              </div>
              <div className="text-[10px] text-[#7F011F] font-semibold leading-tight flex items-center gap-1 mt-0.5">
                <Key className="w-2.5 h-2.5" />
                <span className="capitalize">{role} Workspace</span>
              </div>
            </div>
          </button>

          {/* Quick Log Out Action */}
          <button
            onClick={logout}
            className="p-2 rounded-xl hover:bg-[#FAF0F2] text-[#8C7B7E] hover:text-[#7F011F] transition-colors border border-transparent hover:border-[#7F011F]/20"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
