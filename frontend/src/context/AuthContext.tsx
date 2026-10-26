import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, DemoUser } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: 'patient' | 'doctor' | 'receptionist' | 'nurse' | 'admin';
  patientId: string | null;
  doctorId: string | null;
  portalType: 'patient' | 'staff';
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<any>;
  patientRegister: (payload: any) => Promise<any>;
  quickSwitchDemo: (demoUser: DemoUser) => Promise<void>;
  logout: () => void;
  setPortalType: (type: 'patient' | 'staff') => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('medtree_token'));
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'patient' | 'doctor' | 'receptionist' | 'nurse' | 'admin'>('receptionist');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [portalType, setPortalType] = useState<'patient' | 'staff'>('staff');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUserProfile = async () => {
    const storedToken = localStorage.getItem('medtree_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const u = await api.getCurrentUser();
      setUser(u);
      setRole(u.role);
      setPatientId(u.patient_id || null);
      setDoctorId(u.doctor_id || null);
      setPortalType(u.role === 'patient' ? 'patient' : 'staff');
    } catch (err) {
      console.warn('Token session expired or invalid:', err);
      localStorage.removeItem('medtree_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUserProfile();
  }, [token]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const authRes = await api.login(username, password);
      setToken(authRes.access_token);
      setRole(authRes.role);
      setPatientId(authRes.patient_id || null);
      setDoctorId(authRes.doctor_id || null);
      setPortalType(authRes.role === 'patient' ? 'patient' : 'staff');
      await refreshUserProfile();
      return authRes;
    } finally {
      setIsLoading(false);
    }
  };

  const patientRegister = async (payload: any) => {
    setIsLoading(true);
    try {
      const authRes = await api.patientPortalRegister(payload);
      setToken(authRes.access_token);
      setRole(authRes.role);
      setPatientId(authRes.patient_id || null);
      setDoctorId(null);
      setPortalType('patient');
      await refreshUserProfile();
      return authRes;
    } finally {
      setIsLoading(false);
    }
  };

  const quickSwitchDemo = async (demoUser: DemoUser) => {
    try {
      await login(demoUser.username, demoUser.password);
    } catch (err) {
      console.error('Demo switch failed:', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('medtree_token');
    setToken(null);
    setUser(null);
    setPatientId(null);
    setDoctorId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        patientId,
        doctorId,
        portalType,
        isLoggedIn: !!token && !!user,
        isLoading,
        login,
        patientRegister,
        quickSwitchDemo,
        logout,
        setPortalType,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
