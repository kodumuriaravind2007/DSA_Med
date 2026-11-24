import React from 'react';
import {
  LayoutDashboard, Users, Bed, ShieldCheck,
  GitBranch, RefreshCw, Activity, Stethoscope,
  HeartPulse, Building2, Apple, AlertTriangle, Key,
  LogOut, ShieldAlert, Pill, CheckSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavScreen =
  | 'patient-dashboard'
  | 'doctor-dashboard'
  | 'nurse-dashboard'
  | 'patient-portal'
  | 'receptionist-desk'
  | 'doctor-workspace'
  | 'inpatient-care'
  | 'command-center'
  | 'patient-flow'
  | 'patient-360'
  | 'resources'
  | 'nutrition-inventory'
  | 'surge-simulation'
  | 'security-analytics'
  | 'dsa-board';

interface SidebarProps {
  activeScreen: NavScreen;
  setActiveScreen: (screen: NavScreen) => void;
  onResetDemo: () => void;
  isResetting: boolean;
  onOpenAuthModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  setActiveScreen,
  onResetDemo,
  isResetting,
  onOpenAuthModal,
}) => {
  const { user, role, logout } = useAuth();

  // Role Dashboards (The 3 Core Persons)
  const roleDashboards = [
    {
      id: 'doctor-dashboard' as NavScreen,
      label: 'Doctor Dashboard',
      icon: Stethoscope,
      badge: 'Physician',
      roles: ['doctor', 'admin'],
    },
    {
      id: 'nurse-dashboard' as NavScreen,
      label: 'Nurse Dashboard',
      icon: HeartPulse,
      badge: 'Inpatient MAR',
      roles: ['nurse', 'admin', 'doctor'],
    },
    {
      id: 'patient-dashboard' as NavScreen,
      label: 'Patient Dashboard',
      icon: Users,
      badge: 'Self-Care',
      roles: ['patient', 'admin', 'doctor', 'nurse', 'receptionist'],
    },
  ];

  // Clinical & Operational Modules
  const operationalItems = [
    {
      id: 'receptionist-desk' as NavScreen,
      label: 'Intake & Reception',
      icon: Building2,
      badge: 'Triage',
      roles: ['receptionist', 'admin', 'doctor', 'nurse'],
    },
    {
      id: 'patient-flow' as NavScreen,
      label: 'Live Queue Engine',
      icon: Activity,
      badge: 'Min-Heap',
      roles: ['doctor', 'nurse', 'receptionist', 'admin'],
    },
    {
      id: 'patient-360' as NavScreen,
      label: 'Patient 360° Timeline',
      icon: Users,
      badge: 'EHR',
      roles: ['doctor', 'nurse', 'receptionist', 'admin'],
    },
    {
      id: 'resources' as NavScreen,
      label: 'Beds & Doctor Graph',
      icon: Bed,
      badge: 'Graph',
      roles: ['doctor', 'nurse', 'receptionist', 'admin'],
    },
    {
      id: 'nutrition-inventory' as NavScreen,
      label: 'Nutrition & Supplies',
      icon: Apple,
      badge: 'Allergens',
      roles: ['nurse', 'doctor', 'admin'],
    },
    {
      id: 'surge-simulation' as NavScreen,
      label: 'Surge Capacity Sim',
      icon: AlertTriangle,
      badge: 'Forecast',
      roles: ['doctor', 'admin'],
    },
    {
      id: 'command-center' as NavScreen,
      label: 'Command Center',
      icon: LayoutDashboard,
      badge: 'KPIs',
      roles: ['admin', 'doctor'],
    },
  ];

  // Algorithms & Security
  const algorithmItems = [
    {
      id: 'dsa-board' as NavScreen,
      label: 'DSA Algorithms Board',
      icon: GitBranch,
      badge: 'Core Lab',
      roles: ['doctor', 'nurse', 'receptionist', 'admin'],
    },
    {
      id: 'security-analytics' as NavScreen,
      label: 'Cryptographic Audit',
      icon: ShieldCheck,
      badge: 'SHA-256',
      roles: ['doctor', 'admin', 'receptionist'],
    },
  ];

  // Filter based on active role
  const isPatient = role === 'patient';
  const visibleRoleDashboards = roleDashboards.filter((item) =>
    item.roles.includes(role || 'doctor')
  );
  const visibleOperational = operationalItems.filter((item) =>
    item.roles.includes(role || 'doctor')
  );
  const visibleAlgorithms = algorithmItems.filter((item) =>
    item.roles.includes(role || 'doctor')
  );

  return (
    <aside className="w-64 bg-[#251E1A] text-[#FFF3EC] flex flex-col justify-between h-screen sticky top-0 border-r border-[#4A0A19] select-none z-30 shrink-0 overflow-y-auto">
      {/* Top Branding */}
      <div>
        <div className="p-4 border-b border-[#4A0A19] flex items-center justify-between bg-[#191411]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EC5E27] text-[#FFF3EC] flex items-center justify-center shadow-md font-bold text-lg border border-[#FFF3EC]/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-[#FFF3EC]">MedTree X</h1>
                <span className="text-[10px] font-semibold bg-[#EC5E27] text-[#FFF3EC] px-1.5 py-0.2 rounded border border-[#FFF3EC]/30">v2.0</span>
              </div>
              <p className="text-[10px] text-[#D8C7B0] font-medium">DSA Hospital System</p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-4">
          {/* Section 1: The 3 Core Dashboards */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#E8E4C9]/70 uppercase">
              Role Workspaces
            </div>
            {visibleRoleDashboards.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-md border border-[#FFF3EC]/30'
                      : 'text-[#E8E4C9] hover:bg-[#3D342E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFF3EC]' : 'text-[#E8E4C9]/80'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isActive ? 'bg-[#251E1A] text-[#FFF3EC]' : 'bg-[#3D342E] text-[#D8C7B0]'
                  }`}>
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section 2: Clinical & Operations (for staff) */}
          {!isPatient && visibleOperational.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#E8E4C9]/70 uppercase">
                Hospital Operations
              </div>
              {visibleOperational.map((item) => {
                const Icon = item.icon;
                const isActive = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveScreen(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-md border border-[#FFF3EC]/30'
                        : 'text-[#E8E4C9] hover:bg-[#3D342E] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFF3EC]' : 'text-[#D8C7B0]/70'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                        isActive ? 'bg-[#251E1A] text-[#FFF3EC]' : 'bg-[#3D342E] text-[#D8C7B0]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Section 3: DSA Core & Audit */}
          {!isPatient && visibleAlgorithms.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#E8E4C9]/70 uppercase">
                DSA Algorithms & Audit
              </div>
              {visibleAlgorithms.map((item) => {
                const Icon = item.icon;
                const isActive = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveScreen(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#EC5E27] text-[#FFF3EC] shadow-md border border-[#FFF3EC]/30'
                        : 'text-[#E8E4C9] hover:bg-[#3D342E] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFF3EC]' : 'text-[#E8E4C9]/80'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      isActive ? 'bg-[#251E1A] text-[#FFF3EC]' : 'bg-[#3D342E] text-[#D8C7B0]'
                    }`}>
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-[#4A0A19] space-y-3 bg-[#191411] shrink-0">
        {/* Active Session & Switcher Button */}
        <div className="bg-[#300511] p-3 rounded-xl border border-[#4A0A19] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#D8C7B0] text-[11px]">Active User:</span>
            <span className="font-bold text-[#FFF3EC] text-[11px] capitalize bg-[#EC5E27] px-2 py-0.5 rounded border border-[#FFF3EC]/20">
              {role || 'Guest'}
            </span>
          </div>

          <p className="text-xs font-semibold text-[#FFF3EC] truncate">
            {user?.full_name || 'Authorized User'}
          </p>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={onOpenAuthModal}
              className="py-1.5 px-2 bg-[#EC5E27] hover:bg-[#D54813] text-[#FFF3EC] rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
              title="Switch role"
            >
              <Key className="w-3 h-3" />
              <span>Switch</span>
            </button>
            <button
              onClick={logout}
              className="py-1.5 px-2 bg-[#420815] hover:bg-[#520B1B] text-[#FFF3EC] rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors border border-[#EC5E27]/30"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3 text-[#FFF3EC]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Reset Synthetic Demo Button */}
        {!isPatient && (
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-medium bg-[#300511] hover:bg-[#3D342E] text-[#D8C7B0] hover:text-[#FFF3EC] border border-[#4A0A19] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FFF3EC] ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting Demo...' : 'Reset Synthetic Demo'}</span>
          </button>
        )}

        {/* Engine Status */}
        <div className="flex items-center justify-between text-[10px] text-[#D8C7B0]/70 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Min-Heap & Graph Active
          </span>
          <span className="font-mono text-[#D8C7B0]/50">SHA-256</span>
        </div>
      </div>
    </aside>
  );
};
