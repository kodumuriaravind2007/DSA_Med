import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TopNavbar, NavScreen } from './components/TopNavbar';
import { AuthPortalModal } from './components/AuthPortalModal';
import { RegisterPatientModal } from './components/RegisterPatientModal';

// Dedicated Dashboards for the 3 Personas
import { LoginScreen } from './views/LoginScreen';
import { DoctorDashboard } from './views/DoctorDashboard';
import { NurseDashboard } from './views/NurseDashboard';
import { PatientDashboard } from './views/PatientDashboard';

// Supporting Clinical, Operational & DSA Views
import { ReceptionistWorkspaceView } from './views/ReceptionistWorkspaceView';
import { NutritionInventoryView } from './views/NutritionInventoryView';
import { SurgeSimulationView } from './views/SurgeSimulationView';
import { CommandCenterView } from './views/CommandCenterView';
import { LivePatientFlowView } from './views/LivePatientFlowView';
import { Patient360View } from './views/Patient360View';
import { ResourceManagementView } from './views/ResourceManagementView';
import { SecurityAnalyticsView } from './views/SecurityAnalyticsView';

import { api } from './services/api';
import { wsClient } from './services/websocket';
import { Patient } from './types';
import { Activity } from 'lucide-react';

function MainApp() {
  const { role, user, isLoggedIn, isLoading: isAuthLoading } = useAuth();
  const [activeScreen, setActiveScreen] = useState<NavScreen>('doctor-dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('PT-101');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [alerts, setAlerts] = useState<Array<{ id: string; type: string; title: string; message: string; time: string }>>([]);

  const loadPatients = async () => {
    try {
      const res = await api.getPatients();
      setPatients(res);
      if (res.length > 0 && !selectedPatientId) {
        setSelectedPatientId(res[0].patient_id);
      }
    } catch (err) {
      console.error('Failed to load patients', err);
    }
  };

  const loadAlerts = async () => {
    try {
      const cc = await api.getCommandCenter();
      setAlerts(cc.recent_alerts || []);
    } catch (err) {
      console.error('Failed to load alerts', err);
    }
  };

  // Initialize data & real-time WebSocket connection
  useEffect(() => {
    if (!isLoggedIn) return;

    loadPatients();
    loadAlerts();

    // Connect WebSocket
    wsClient.connect();
    const unsubWs = wsClient.subscribe((event) => {
      console.log('Real-time hospital event received:', event);
      loadPatients();
      loadAlerts();
    });

    const interval = setInterval(() => {
      loadPatients();
      loadAlerts();
    }, 20000);

    return () => {
      clearInterval(interval);
      unsubWs();
    };
  }, [isLoggedIn]);

  // Synchronize initial default screen based on user role
  useEffect(() => {
    if (role === 'patient') {
      setActiveScreen('patient-dashboard');
    } else if (role === 'doctor') {
      setActiveScreen('doctor-dashboard');
    } else if (role === 'nurse') {
      setActiveScreen('nurse-dashboard');
    } else if (role === 'receptionist') {
      setActiveScreen('receptionist-desk');
    } else if (role === 'admin') {
      setActiveScreen('command-center');
    }
  }, [role]);

  // If auth is still resolving from localStorage
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#FAF6EC] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7F011F] text-[#F5EBD0] flex items-center justify-center mx-auto shadow-md animate-pulse">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-[#7F011F] tracking-wide">
            Initializing MedTree X Clinical Engine...
          </p>
        </div>
      </div>
    );
  }

  // REQUIREMENT 1: If not logged in, show initial Login Screen asking for credentials
  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveScreen('patient-360');
  };

  const handlePatientRegistered = async (newPatient: any) => {
    await loadPatients();
    await loadAlerts();
    handleSelectPatient(newPatient.patient_id);
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset hospital database and cryptographic audit trail back to pristine synthetic demo state?')) {
      return;
    }
    try {
      setIsResetting(true);
      await api.resetDemoData();
      await loadPatients();
      await loadAlerts();
      setSelectedPatientId('PT-101');
      alert('Hospital database, triage queue, and SHA-256 audit chain successfully reset to pristine demo records.');
    } catch (err: any) {
      alert(err.message || 'Reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EC] text-[#2A161B] font-sans selection:bg-[#7F011F] selection:text-[#F5EBD0] flex flex-col">
      {/* Centered Top Navbar with Exactly 4 Options and Sub-parts */}
      <TopNavbar
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        patients={patients}
        onSelectPatient={handleSelectPatient}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
        alerts={alerts}
      />

      {/* Main Full-Width Content Canvas */}
      <main className="flex-1 w-full pb-16">
        {/* THE 3 CORE PERSON DASHBOARDS */}
        {activeScreen === 'doctor-dashboard' && (
          <DoctorDashboard onSelectPatient={handleSelectPatient} />
        )}

        {activeScreen === 'nurse-dashboard' && (
          <NurseDashboard onSelectPatient={handleSelectPatient} />
        )}

        {activeScreen === 'patient-dashboard' && (
          <PatientDashboard />
        )}

        {/* SUPPORTING VIEWS */}
        {activeScreen === 'receptionist-desk' && (
          <ReceptionistWorkspaceView
            onOpenRegister={() => setIsRegisterOpen(true)}
            onSelectPatient={handleSelectPatient}
          />
        )}

        {activeScreen === 'nutrition-inventory' && (
          <NutritionInventoryView />
        )}

        {activeScreen === 'surge-simulation' && (
          <SurgeSimulationView />
        )}

        {activeScreen === 'command-center' && (
          <CommandCenterView
            onNavigateToQueue={() => setActiveScreen('patient-flow')}
            onOpenRegister={() => setIsRegisterOpen(true)}
            onSelectPatient={handleSelectPatient}
          />
        )}

        {activeScreen === 'patient-flow' && (
          <LivePatientFlowView
            onSelectPatient={handleSelectPatient}
            onOpenRegister={() => setIsRegisterOpen(true)}
          />
        )}

        {activeScreen === 'patient-360' && (
          <Patient360View
            patientId={selectedPatientId}
            allPatients={patients}
            onSelectPatient={setSelectedPatientId}
          />
        )}

        {activeScreen === 'resources' && (
          <ResourceManagementView
            onSelectPatient={handleSelectPatient}
          />
        )}

        {activeScreen === 'hospital-analytics' && (
          <SecurityAnalyticsView initialTab="analytics" />
        )}

        {activeScreen === 'security-analytics' && (
          <SecurityAnalyticsView initialTab="audit" />
        )}
      </main>

      {/* Global Patient Registration Modal */}
      <RegisterPatientModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onPatientRegistered={handlePatientRegistered}
      />

      {/* Role Switcher Modal */}
      <AuthPortalModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={role === 'patient' ? 'patient' : 'staff'}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
