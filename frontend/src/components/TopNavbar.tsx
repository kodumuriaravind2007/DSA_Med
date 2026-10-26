import React, { useState, useEffect, useRef } from 'react';
import {
  Stethoscope, HeartPulse, Users, Building2,
  Activity, Bed, Apple, AlertTriangle, GitBranch,
  ShieldCheck, ShieldAlert, LayoutDashboard, Bell, LogOut,
  ChevronDown, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { wsClient } from '../services/websocket';
import { Patient } from '../types';

export type NavScreen =
  | 'command-center'
  | 'doctor-dashboard'
  | 'nurse-dashboard'
  | 'patient-dashboard'
  | 'receptionist-desk'
  | 'patient-flow'
  | 'patient-360'
  | 'resources'
  | 'nutrition-inventory'
  | 'surge-simulation'
  | 'hospital-analytics'
  | 'security-analytics';

export type NavCategory = 'dashboards' | 'clinical' | 'resources' | 'dsa';

interface SubPartItem {
  id: NavScreen;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface CategoryDefinition {
  id: NavCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultScreen: NavScreen;
  subParts: SubPartItem[];
}

interface TopNavbarProps {
  activeScreen: NavScreen;
  setActiveScreen: (screen: NavScreen) => void;
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
  onOpenRegister: () => void;
  onResetDemo: () => void;
  isResetting: boolean;
  alerts: Array<{ id: string; type: string; title: string; message: string; time: string }>;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeScreen,
  setActiveScreen,
  onOpenRegister,
  alerts,
}) => {
  const { user, role, logout } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<NavCategory | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(wsClient.getStatus());
  const navRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time status
  useEffect(() => {
    const unsub = wsClient.onStatusChange((status) => {
      setIsWsConnected(status);
    });
    return unsub;
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Default workspace screen according to logged in user role
  const roleDefaultScreen: NavScreen =
    role === 'patient'
      ? 'patient-dashboard'
      : role === 'nurse'
      ? 'nurse-dashboard'
      : role === 'receptionist'
      ? 'receptionist-desk'
      : role === 'admin'
      ? 'command-center'
      : 'doctor-dashboard';

  // EXACTLY 4 PRIMARY GROUPS (Phase 12: Group 1 Dashboards, Group 2 Clinical Ops, Group 3 Resources & Analytics, Group 4 DSA & Security)
  const categories: CategoryDefinition[] = [
    {
      id: 'dashboards',
      label: 'Dashboards',
      icon: LayoutDashboard,
      defaultScreen: roleDefaultScreen,
      subParts: [
        { id: 'command-center', label: 'Command Center', badge: 'Overview', icon: LayoutDashboard, roles: ['doctor', 'admin', 'nurse'] },
        { id: 'doctor-dashboard', label: 'Doctor Dashboard', badge: 'MD', icon: Stethoscope, roles: ['doctor', 'admin'] },
        { id: 'nurse-dashboard', label: 'Nurse Dashboard', badge: 'RN', icon: HeartPulse, roles: ['nurse', 'admin', 'doctor'] },
        { id: 'patient-dashboard', label: 'Patient Dashboard', badge: 'Self-Care', icon: Users, roles: ['patient', 'admin', 'doctor', 'nurse', 'receptionist'] },
      ],
    },
    {
      id: 'clinical',
      label: 'Clinical Operations',
      icon: Activity,
      defaultScreen: 'patient-flow',
      subParts: [
        { id: 'receptionist-desk', label: 'Intake & Reception', badge: 'Triage', icon: Building2, roles: ['receptionist', 'admin', 'doctor', 'nurse'] },
        { id: 'patient-flow', label: 'Live Queue Engine', badge: 'Min-Heap', icon: Activity, roles: ['doctor', 'nurse', 'receptionist', 'admin'] },
        { id: 'patient-360', label: 'Patient 360° Timeline', badge: 'EHR', icon: Users, roles: ['doctor', 'nurse', 'receptionist', 'admin'] },
      ],
    },
    {
      id: 'resources',
      label: 'Resources & Analytics',
      icon: Bed,
      defaultScreen: 'resources',
      subParts: [
        { id: 'resources', label: 'Beds & Doctor Graph', badge: 'Graph', icon: Bed, roles: ['doctor', 'nurse', 'receptionist', 'admin'] },
        { id: 'nutrition-inventory', label: 'Nutrition & Supplies', badge: 'Supplies', icon: Apple, roles: ['nurse', 'doctor', 'admin'] },
        { id: 'surge-simulation', label: 'Surge Capacity Sim', badge: 'Forecast', icon: AlertTriangle, roles: ['doctor', 'admin'] },
      ],
    },
    {
      id: 'dsa',
      label: 'DSA & Security',
      icon: ShieldAlert,
      defaultScreen: 'security-analytics',
      subParts: [
        { id: 'security-analytics', label: 'Duplicate Detection', badge: 'Levenshtein', icon: ShieldAlert, roles: ['doctor', 'admin', 'receptionist', 'nurse'] },
      ],
    },
  ];

  // Determine current active category from activeScreen
  const getActiveCategory = (): NavCategory => {
    for (const cat of categories) {
      if (cat.subParts.some((sp) => sp.id === activeScreen)) {
        return cat.id;
      }
    }
    return 'dashboards';
  };

  const activeCategory = getActiveCategory();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8DBC0] shadow-2xs select-none">
      <div className="max-w-7xl mx-auto px-6 h-15 flex items-center justify-between gap-4">
        {/* Left: Clean Brand Identity with Subtle Pulse Dot */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center font-bold shadow-xs">
            <Activity className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-[#7F011F]">MedTree X</span>
              <span className="text-[10px] font-bold text-[#8C7B7E] font-mono">v2.0</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`} />
              <span className="text-[10px] text-[#6B5B5E] font-semibold leading-none">
                {isWsConnected ? 'Live Connection' : 'Polling Sync'}
              </span>
            </div>
          </div>
        </div>

        {/* MIDDLE TOP: EXACTLY 4 PRIMARY CATEGORIES (Centered, Perfectly Symmetrical Capsule Bar) */}
        <nav ref={navRef} className="flex items-center gap-1 bg-[#FAF6EC] p-1 rounded-full border border-[#E8DBC0] shadow-2xs relative">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isCatActive = activeCategory === cat.id;
            const isDropdownOpen = openDropdown === cat.id;
            const userSubParts = cat.subParts.filter(
              (sp) => !sp.roles || sp.roles.includes(role || 'doctor')
            );

            return (
              <div key={cat.id} className="relative">
                <button
                  onClick={() => {
                    if (cat.id === 'dashboards') {
                      if (!cat.subParts.some(sp => sp.id === activeScreen)) {
                        setActiveScreen(roleDefaultScreen);
                      }
                    } else if (!isCatActive) {
                      setActiveScreen(cat.defaultScreen);
                    }
                    if (userSubParts.length > 1) {
                      setOpenDropdown(isDropdownOpen ? null : cat.id);
                    } else {
                      setOpenDropdown(null);
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isCatActive
                      ? 'bg-[#7F011F] text-[#F5EBD0] shadow-xs'
                      : 'text-[#6B5B5E] hover:text-[#2A161B] hover:bg-[#F5EBD0]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isCatActive ? 'text-[#F5EBD0]' : 'text-[#7F011F]'}`} />
                  <span className="tracking-tight">{cat.label}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      isDropdownOpen ? 'rotate-180' : ''
                    } ${isCatActive ? 'text-[#F5EBD0]/80' : 'text-[#8C7B7E]'}`}
                  />
                </button>

                {/* Sleek Floating Dropdown for Sub-Parts */}
                {isDropdownOpen && userSubParts.length > 1 && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white rounded-2xl border border-[#E8DBC0] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="text-[10px] font-bold text-[#8C7B7E] px-3 py-1 uppercase tracking-wider">
                      {cat.label} Views
                    </div>
                    {userSubParts.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeScreen === sub.id;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setActiveScreen(sub.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                            isSubActive
                              ? 'bg-[#FAF0F2] text-[#7F011F] shadow-2xs'
                              : 'text-[#6B5B5E] hover:text-[#2A161B] hover:bg-[#FAF6EC]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-[#7F011F]' : 'text-[#8C7B7E]'}`} />
                            <span>{sub.label}</span>
                          </div>
                          {sub.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                isSubActive
                                  ? 'bg-[#7F011F] text-[#F5EBD0]'
                                  : 'bg-[#FAF6EC] text-[#6B5B5E] border border-[#E8DBC0]'
                              }`}
                            >
                              {sub.badge}
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

        {/* Right Side: Quick Register, Alerts, User Profile */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Register (Staff only) */}
          {role !== 'patient' && (
            <button
              onClick={onOpenRegister}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#7F011F] hover:bg-[#680119] text-[#F5EBD0] shadow-2xs transition hover:shadow-xs"
            >
              + Register
            </button>
          )}

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="p-2 rounded-full hover:bg-[#FAF6EC] text-[#2A161B] relative transition border border-transparent hover:border-[#E8DBC0]"
              title="Clinical Alerts"
            >
              <Bell className="w-4 h-4 text-[#7F011F]" />
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#7F011F] ring-2 ring-white"></span>
              )}
            </button>

            {showAlerts && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-[#E8DBC0] p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8DBC0]">
                  <span className="text-xs font-bold text-[#7F011F]">Clinical Alerts</span>
                  <span className="text-[10px] font-bold bg-[#FAF0F2] text-[#7F011F] px-2 py-0.5 rounded-full border border-[#7F011F]/20">
                    {alerts.length} Active
                  </span>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {alerts.map((alt) => (
                    <div
                      key={alt.id}
                      className={`p-2.5 rounded-xl text-xs border ${
                        alt.type === 'critical'
                          ? 'bg-[#FAF0F2] border-[#7F011F]/30 text-[#7F011F]'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{alt.title}</span>
                        <span className="text-[10px] text-[#8C7B7E] font-normal">{alt.time}</span>
                      </div>
                      <p className="text-[11px] mt-0.5 opacity-90">{alt.message}</p>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="p-4 text-center text-xs text-[#8C7B7E] font-medium">
                      No active clinical alerts.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Sign Out (No Text Truncation) */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E8DBC0]">
            <div className="flex items-center gap-2.5 bg-[#FAF6EC] py-1 px-3 rounded-full border border-[#E8DBC0]">
              <div className="w-6 h-6 rounded-full bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center font-bold text-[10px]">
                {role === 'patient' ? 'PT' : role ? role.slice(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-[#2A161B] leading-none capitalize whitespace-nowrap">
                  {user ? user.full_name : `${role} User`}
                </div>
                <div className="text-[10px] text-[#7F011F] font-bold leading-tight capitalize mt-0.5">
                  {role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-full hover:bg-[#FAF0F2] text-[#8C7B7E] hover:text-[#7F011F] transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
