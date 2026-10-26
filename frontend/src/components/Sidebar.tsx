import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Bed, ShieldCheck,
  GitBranch, RefreshCw, Activity, Stethoscope,
  HeartPulse, Building2, Apple, AlertTriangle, Key,
  LogOut, ShieldAlert, Pill, CheckSquare, ChevronDown, ChevronRight, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavScreen } from './TopNavbar';

interface SidebarProps {
  activeScreen: NavScreen;
  setActiveScreen: (screen: NavScreen) => void;
  onResetDemo: () => void;
  isResetting: boolean;
  onOpenAuthModal: () => void;
}

interface NavGroupItem {
  id: NavScreen;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

interface NavGroup {
  id: string;
  title: string;
  items: NavGroupItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  setActiveScreen,
  onResetDemo,
  isResetting,
  onOpenAuthModal,
}) => {
  const { user, role, logout } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // PHASE 12: EXACTLY 4 COLLAPSIBLE GROUPS
  const navGroups: NavGroup[] = [
    {
      id: 'dashboards',
      title: 'Group 1 — Dashboards',
      items: [
        {
          id: 'command-center',
          label: 'Command Center',
          icon: LayoutDashboard,
          badge: 'KPIs',
          roles: ['admin', 'doctor', 'nurse'],
        },
        {
          id: 'doctor-dashboard',
          label: 'Doctor Dashboard',
          icon: Stethoscope,
          badge: 'Physician',
          roles: ['doctor', 'admin'],
        },
        {
          id: 'nurse-dashboard',
          label: 'Nurse Dashboard',
          icon: HeartPulse,
          badge: 'Inpatient',
          roles: ['nurse', 'admin', 'doctor'],
        },
        {
          id: 'patient-dashboard',
          label: 'Patient Dashboard',
          icon: Users,
          badge: 'Self-Care',
          roles: ['patient', 'admin', 'doctor', 'nurse', 'receptionist'],
        },
      ],
    },
    {
      id: 'clinical',
      title: 'Group 2 — Clinical Operations',
      items: [
        {
          id: 'receptionist-desk',
          label: 'Intake & Reception',
          icon: Building2,
          badge: 'Triage',
          roles: ['receptionist', 'admin', 'doctor', 'nurse'],
        },
        {
          id: 'patient-flow',
          label: 'Live Queue Engine',
          icon: Activity,
          badge: 'Min-Heap',
          roles: ['doctor', 'nurse', 'receptionist', 'admin'],
        },
        {
          id: 'patient-360',
          label: 'Patient 360° Timeline',
          icon: Users,
          badge: 'EHR',
          roles: ['doctor', 'nurse', 'receptionist', 'admin'],
        },
      ],
    },
    {
      id: 'resources',
      title: 'Group 3 — Resources & Analytics',
      items: [
        {
          id: 'resources',
          label: 'Beds & Doctor Graph',
          icon: Bed,
          badge: 'Graph',
          roles: ['doctor', 'nurse', 'receptionist', 'admin'],
        },
        {
          id: 'nutrition-inventory',
          label: 'Nutrition & Supplies',
          icon: Apple,
          badge: 'Supplies',
          roles: ['nurse', 'doctor', 'admin'],
        },
        {
          id: 'surge-simulation',
          label: 'Surge Capacity Sim',
          icon: AlertTriangle,
          badge: 'Forecast',
          roles: ['doctor', 'admin'],
        },
        {
          id: 'hospital-analytics',
          label: 'Hospital Analytics',
          icon: TrendingUp,
          badge: 'Analytics',
          roles: ['doctor', 'admin'],
        },
      ],
    },
    {
      id: 'dsa',
      title: 'Group 4 — DSA & Security',
      items: [
        {
          id: 'dsa-board',
          label: 'DSA Algorithms Board',
          icon: GitBranch,
          badge: 'Core Lab',
          roles: ['doctor', 'nurse', 'receptionist', 'admin'],
        },
        {
          id: 'security-analytics',
          label: 'Cryptographic Audit',
          icon: ShieldCheck,
          badge: 'SHA-256',
          roles: ['doctor', 'admin', 'receptionist'],
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#2A050E] text-[#F5EBD0] flex flex-col justify-between h-screen sticky top-0 border-r border-[#4A0A19] select-none z-30 shrink-0 overflow-y-auto">
      {/* Top Branding */}
      <div>
        <div className="p-4 border-b border-[#4A0A19] flex items-center justify-between bg-[#20030A]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center shadow-md font-bold text-lg border border-[#F5EBD0]/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-[#F5EBD0]">MedTree X</h1>
                <span className="text-[10px] font-semibold bg-[#7F011F] text-[#F5EBD0] px-1.5 py-0.2 rounded border border-[#F5EBD0]/30">v2.0</span>
              </div>
              <p className="text-[10px] text-[#D8C7B0] font-medium">DSA Hospital System</p>
            </div>
          </div>
        </div>

        {/* Navigation Sections in 4 Collapsible Groups */}
        <nav className="p-3 space-y-3">
          {navGroups.map((group) => {
            const isCollapsed = !!collapsedGroups[group.id];
            const visibleItems = group.items.filter((item) =>
              item.roles.includes(role || 'doctor')
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1">
                {/* Collapsible Section Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#E8DBC0]/70 uppercase hover:text-[#F5EBD0] transition-colors"
                >
                  <span>{group.title}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-[#E8DBC0]/50" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#E8DBC0]/50" />
                  )}
                </button>

                {/* Group Items */}
                {!isCollapsed && (
                  <div className="space-y-1 pt-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeScreen === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveScreen(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-[#7F011F] text-[#F5EBD0] shadow-md border border-[#F5EBD0]/30'
                              : 'text-[#E8DBC0] hover:bg-[#3D0815] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-[#F5EBD0]' : 'text-[#E8DBC0]/80'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                isActive ? 'bg-[#2A050E] text-[#F5EBD0]' : 'bg-[#3D0815] text-[#D8C7B0]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-[#4A0A19] space-y-3 bg-[#20030A] shrink-0">
        {/* Active Session & Switcher Button */}
        <div className="bg-[#300511] p-3 rounded-xl border border-[#4A0A19] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#D8C7B0]">Active Session</span>
            <span className="text-[9px] font-mono bg-[#7F011F] text-[#F5EBD0] px-1.5 py-0.5 rounded border border-[#F5EBD0]/20 font-bold uppercase">
              {role}
            </span>
          </div>
          <div className="text-xs font-bold truncate text-[#F5EBD0]">
            {user?.full_name || 'Staff User'}
          </div>
          <div className="text-[10px] text-[#D8C7B0]/70 truncate">
            {user?.email || 'Logged in securely'}
          </div>

          <button
            onClick={onOpenAuthModal}
            className="w-full mt-1 py-1.5 px-2 bg-[#20030A] hover:bg-[#7F011F] text-[#F5EBD0] rounded-lg text-[10px] font-semibold border border-[#4A0A19] transition flex items-center justify-center gap-1.5"
          >
            <Key className="w-3 h-3 text-[#D8C7B0]" />
            <span>Switch Role / Portal</span>
          </button>
        </div>

        {/* Global Reset Demo Data Button */}
        <button
          onClick={onResetDemo}
          disabled={isResetting}
          className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-[#3D0815] hover:bg-[#520B1D] text-[#F5EBD0] border border-[#5C0D20] transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting Genesis...' : 'Reset Demo Records'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[#D8C7B0] hover:text-white hover:bg-[#3D0815] transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
