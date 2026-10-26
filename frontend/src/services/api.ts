import {
  Patient, Patient360, Doctor, Bed, QueueItem,
  AuditLogItem, AuditVerificationResult, DuplicateCandidate, CommandCenterData,
  CriticalFollowUp, PatientHistoryChangeAlert, ClinicalHandover,
  DuplicateReviewRecord, DataQualityReport, MedicalCorrection,
  TemporaryQRAccessGrant, QRDoctorVerifyResult
} from '../types';

const BASE_URL = '/api';

export const api = {
  // Command Center Analytics
  getCommandCenter: async (): Promise<CommandCenterData> => {
    const res = await fetch(`${BASE_URL}/analytics/command-center`);
    if (!res.ok) throw new Error('Failed to load command center data');
    return res.json();
  },

  getHistoricalWaits: async () => {
    const res = await fetch(`${BASE_URL}/analytics/historical-waits`);
    if (!res.ok) throw new Error('Failed to load historical waits');
    return res.json();
  },

  // Patients
  getPatients: async (params?: { search?: string; priority?: number; department?: string; status?: string }): Promise<Patient[]> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.priority) searchParams.append('priority', params.priority.toString());
    if (params?.department && params.department !== 'All') searchParams.append('department', params.department);
    if (params?.status && params.status !== 'All') searchParams.append('status', params.status);

    const res = await fetch(`${BASE_URL}/patients/?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to load patients');
    return res.json();
  },

  getPatient360: async (patientId: string): Promise<Patient360> => {
    const res = await fetch(`${BASE_URL}/patients/${patientId}`);
    if (!res.ok) throw new Error(`Failed to load patient 360 for ${patientId}`);
    return res.json();
  },

  registerPatient: async (payload: any): Promise<Patient> => {
    const res = await fetch(`${BASE_URL}/patients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to register patient');
    }
    return res.json();
  },

  updatePatientStatus: async (patientId: string, newStatus: string, notes?: string, actor = 'Attending Clinician') => {
    const res = await fetch(`${BASE_URL}/patients/${patientId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_status: newStatus, notes, actor }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  updatePatientPriority: async (patientId: string, newPriority: number, reason: string, actor = 'Triage Officer') => {
    const res = await fetch(`${BASE_URL}/patients/${patientId}/priority`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_priority: newPriority, reason, actor }),
    });
    if (!res.ok) throw new Error('Failed to update priority');
    return res.json();
  },

  // Queue
  getLiveQueue: async () => {
    const res = await fetch(`${BASE_URL}/queue/`);
    if (!res.ok) throw new Error('Failed to load live queue');
    return res.json();
  },

  callNextPatient: async (actor = 'Triage Clinician') => {
    const res = await fetch(`${BASE_URL}/queue/call-next?actor=${encodeURIComponent(actor)}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to call next patient');
    }
    return res.json();
  },

  // Resources (Beds & Doctors)
  getBeds: async (params?: { department?: string; ward?: string; status?: string }): Promise<Bed[]> => {
    const searchParams = new URLSearchParams();
    if (params?.department) searchParams.append('department', params.department);
    if (params?.ward) searchParams.append('ward', params.ward);
    if (params?.status) searchParams.append('status', params.status);

    const res = await fetch(`${BASE_URL}/resources/beds?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to load beds');
    return res.json();
  },

  allocateBed: async (bedId: string, patientId: string, actor = 'Ward Staff') => {
    const res = await fetch(`${BASE_URL}/resources/beds/${bedId}/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, actor }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to allocate bed');
    }
    return res.json();
  },

  releaseBed: async (bedId: string, actor = 'Ward Staff', markAs = 'Cleaning') => {
    const res = await fetch(`${BASE_URL}/resources/beds/${bedId}/release?actor=${encodeURIComponent(actor)}&mark_as=${markAs}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to release bed');
    return res.json();
  },

  updateBedStatus: async (bedId: string, status: string, actor = 'Housekeeping Staff') => {
    const res = await fetch(`${BASE_URL}/resources/beds/${bedId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, actor }),
    });
    if (!res.ok) throw new Error('Failed to update bed status');
    return res.json();
  },

  getDoctors: async (params?: { department?: string; duty_status?: string }): Promise<Doctor[]> => {
    const searchParams = new URLSearchParams();
    if (params?.department) searchParams.append('department', params.department);
    if (params?.duty_status) searchParams.append('duty_status', params.duty_status);

    const res = await fetch(`${BASE_URL}/resources/doctors?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to load doctors');
    return res.json();
  },

  assignDoctor: async (doctorId: string, patientId: string, actor = 'Triage Staff') => {
    const res = await fetch(`${BASE_URL}/resources/doctors/${doctorId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, actor }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to assign doctor');
    }
    return res.json();
  },

  updateDoctorDuty: async (doctorId: string, dutyStatus: string, isAvailable = true, actor = 'Admin') => {
    const res = await fetch(`${BASE_URL}/resources/doctors/${doctorId}/duty`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duty_status: dutyStatus, is_available: isAvailable, actor }),
    });
    if (!res.ok) throw new Error('Failed to update doctor duty');
    return res.json();
  },

  getResourceGraph: async () => {
    const res = await fetch(`${BASE_URL}/resources/graph`);
    if (!res.ok) throw new Error('Failed to load resource graph');
    return res.json();
  },

  runGraphBFS: async (startNodeId: string) => {
    const res = await fetch(`${BASE_URL}/resources/graph/bfs/${encodeURIComponent(startNodeId)}`);
    if (!res.ok) throw new Error('Failed to run BFS');
    return res.json();
  },

  runGraphDFS: async (startNodeId: string) => {
    const res = await fetch(`${BASE_URL}/resources/graph/dfs/${encodeURIComponent(startNodeId)}`);
    if (!res.ok) throw new Error('Failed to run DFS');
    return res.json();
  },

  // Labs
  getClinicalCatalog: async () => {
    const res = await fetch(`${BASE_URL}/labs/catalog`);
    if (!res.ok) throw new Error('Failed to load clinical catalog');
    return res.json();
  },

  orderLabTest: async (patientId: string, testName: string, orderingDoctor = 'Attending Physician') => {
    const res = await fetch(`${BASE_URL}/labs/patient/${patientId}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_name: testName, ordering_doctor: orderingDoctor }),
    });
    if (!res.ok) throw new Error('Failed to order lab');
    return res.json();
  },

  enterLabResult: async (orderId: string, payload: any) => {
    const res = await fetch(`${BASE_URL}/labs/order/${orderId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to enter lab result');
    return res.json();
  },

  // Clinical Decision Support (CDS)
  evaluateCDS: async (payload: { reported_concern: string; age?: number; vitals?: any; known_conditions?: string[] }) => {
    const res = await fetch(`${BASE_URL}/cds/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to evaluate CDS rules');
    return res.json();
  },

  recordCDSReview: async (payload: any) => {
    const res = await fetch(`${BASE_URL}/cds/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to record review');
    return res.json();
  },

  // Audit
  getAuditLogs: async (params?: { action?: string; actor?: string; record_id?: string; limit?: number }): Promise<AuditLogItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.action && params.action !== 'All') searchParams.append('action', params.action);
    if (params?.actor) searchParams.append('actor', params.actor);
    if (params?.record_id) searchParams.append('record_id', params.record_id);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const res = await fetch(`${BASE_URL}/audit/logs?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to load audit logs');
    return res.json();
  },

  verifyAuditTrail: async (): Promise<AuditVerificationResult> => {
    const res = await fetch(`${BASE_URL}/audit/verify`);
    if (!res.ok) throw new Error('Failed to verify audit trail');
    return res.json();
  },

  simulateTamper: async (targetIndex = 2) => {
    const res = await fetch(`${BASE_URL}/audit/simulate-tamper?target_index=${targetIndex}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to run tamper simulation');
    return res.json();
  },

  // Duplicates
  scanDuplicates: async (threshold = 0.65): Promise<{ candidates: DuplicateCandidate[]; total_scanned_patients: number; total_duplicate_candidates_found: number; policy: string }> => {
    const res = await fetch(`${BASE_URL}/duplicates/scan?threshold=${threshold}`);
    if (!res.ok) throw new Error('Failed to scan duplicates');
    return res.json();
  },

  getDuplicateCandidates: async (): Promise<DuplicateCandidate[]> => {
    const res = await api.scanDuplicates();
    return res.candidates || [];
  },

  reviewDuplicate: async (payload: {
    patient_id_1: string;
    patient_id_2: string;
    decision: string;
    notes: string;
    reviewed_by?: string;
    similarity_percentage?: number;
    matched_fields?: string;
  }) => {
    const res = await fetch(`${BASE_URL}/duplicates/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to review duplicate');
    return res.json();
  },

  // Export
  getPatientFHIR: async (patientId: string) => {
    const res = await fetch(`${BASE_URL}/export/patient/${patientId}/fhir`);
    if (!res.ok) throw new Error('Failed to fetch FHIR export');
    return res.json();
  },

  // Reset Demo Data
  resetDemoData: async () => {
    const res = await fetch(`${BASE_URL}/system/reset-demo`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset demo data');
    return res.json();
  },

  // --- AUTHENTICATION & PORTAL IDENTITY ---
  login: async (username: string, password: string): Promise<any> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Authentication failed. Please verify credentials.');
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('medtree_token', data.access_token);
    }
    return data;
  },

  patientPortalRegister: async (payload: any): Promise<any> => {
    const res = await fetch(`${BASE_URL}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Patient registration failed');
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('medtree_token', data.access_token);
    }
    return data;
  },

  getCurrentUser: async (): Promise<any> => {
    const token = localStorage.getItem('medtree_token');
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error('Failed to retrieve user profile');
    return res.json();
  },

  getDemoUsers: async (): Promise<any[]> => {
    const res = await fetch(`${BASE_URL}/auth/demo-users`);
    if (!res.ok) throw new Error('Failed to load demo accounts');
    return res.json();
  },

  updatePatientDemographics: async (payload: any) => {
    const token = localStorage.getItem('medtree_token');
    const res = await fetch(`${BASE_URL}/auth/patient/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update patient demographic profile');
    }
    return res.json();
  },

  // --- APPOINTMENTS & CHECK-IN ---
  getAppointments: async (params?: { patient_id?: string; doctor_id?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.patient_id) searchParams.append('patient_id', params.patient_id);
    if (params?.doctor_id) searchParams.append('doctor_id', params.doctor_id);
    if (params?.status) searchParams.append('status_filter', params.status);

    const res = await fetch(`${BASE_URL}/appointments/?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to load appointments');
    return res.json();
  },

  createAppointment: async (payload: any) => {
    const res = await fetch(`${BASE_URL}/appointments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to schedule appointment');
    }
    return res.json();
  },

  checkInAppointment: async (appointmentId: string, actor = 'Reception Desk') => {
    const res = await fetch(`${BASE_URL}/appointments/${appointmentId}/check-in?actor=${encodeURIComponent(actor)}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to complete check-in');
    return res.json();
  },

  // --- MAR (Medication Administration Records) ---
  getPatientMAR: async (patientId: string) => {
    const res = await fetch(`${BASE_URL}/mar/patient/${patientId}`);
    if (!res.ok) throw new Error('Failed to load MAR tasks');
    return res.json();
  },

  getDueMAR: async () => {
    const res = await fetch(`${BASE_URL}/mar/due`);
    if (!res.ok) throw new Error('Failed to load due MAR tasks');
    return res.json();
  },

  generateMARSchedule: async (patientId: string) => {
    const res = await fetch(`${BASE_URL}/mar/patient/${patientId}/generate-schedule`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to generate medication schedule');
    return res.json();
  },

  administerMedication: async (taskId: string, administeredBy: string, notes?: string) => {
    const res = await fetch(`${BASE_URL}/mar/tasks/${taskId}/administer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ administered_by: administeredBy, notes: notes || '' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to record medication administration');
    }
    return res.json();
  },

  holdMedication: async (taskId: string, reason: string, action = 'Held', nurseName = 'Staff Nurse') => {
    const res = await fetch(`${BASE_URL}/mar/tasks/${taskId}/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, action, nurse_name: nurseName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to hold medication');
    }
    return res.json();
  },

  // --- INPATIENT & POST-OP CARE ---
  getPostOpPlans: async (patientId: string) => {
    const res = await fetch(`${BASE_URL}/inpatient/post-op/${patientId}`);
    if (!res.ok) throw new Error('Failed to load post-op recovery plans');
    return res.json();
  },

  createPostOpPlan: async (payload: any) => {
    const res = await fetch(`${BASE_URL}/inpatient/post-op`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create post-op plan');
    return res.json();
  },

  completePostOpTask: async (taskId: string, nurseName: string, notes?: string) => {
    const res = await fetch(`${BASE_URL}/inpatient/post-op/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nurse_name: nurseName, notes: notes || '' }),
    });
    if (!res.ok) throw new Error('Failed to complete post-op task');
    return res.json();
  },

  recordInpatientVitals: async (patientId: string, vitals: any, actor = 'Ward Nurse') => {
    const res = await fetch(`${BASE_URL}/inpatient/vitals?patient_id=${patientId}&actor=${encodeURIComponent(actor)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vitals),
    });
    if (!res.ok) throw new Error('Failed to record inpatient vitals');
    return res.json();
  },

  getVitalsTrends: async (patientId: string) => {
    const res = await fetch(`${BASE_URL}/inpatient/vitals/trends/${patientId}`);
    if (!res.ok) throw new Error('Failed to load vital sign telemetry trends');
    return res.json();
  },

  // --- NUTRITION & MEAL DELIVERIES ---
  getDietOrders: async (patientId: string) => {
    const res = await fetch(`${BASE_URL}/nutrition/orders/${patientId}`);
    if (!res.ok) throw new Error('Failed to load diet orders');
    return res.json();
  },

  createDietOrder: async (payload: any) => {
    const res = await fetch(`${BASE_URL}/nutrition/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create diet order');
    return res.json();
  },

  getMealDeliveries: async (patientId?: string) => {
    const url = patientId ? `${BASE_URL}/nutrition/deliveries?patient_id=${patientId}` : `${BASE_URL}/nutrition/deliveries`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load meal deliveries');
    return res.json();
  },

  verifyAndDeliverMeal: async (deliveryId: string, deliveredBy = 'Dietary Aide', mealItems?: string) => {
    const searchParams = new URLSearchParams();
    searchParams.append('delivered_by', deliveredBy);
    if (mealItems) searchParams.append('meal_items', mealItems);

    const res = await fetch(`${BASE_URL}/nutrition/deliveries/${deliveryId}/verify-and-deliver?${searchParams.toString()}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to verify meal delivery');
    return res.json();
  },

  // --- PHARMACY & INVENTORY ---
  getInventoryItems: async (category?: string) => {
    const url = category && category !== 'All' ? `${BASE_URL}/inventory/items?category=${encodeURIComponent(category)}` : `${BASE_URL}/inventory/items`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load inventory');
    return res.json();
  },

  recordStockTransaction: async (payload: any) => {
    const res = await fetch(`${BASE_URL}/inventory/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to record stock transaction');
    }
    return res.json();
  },

  getInventoryAlerts: async () => {
    const res = await fetch(`${BASE_URL}/inventory/alerts`);
    if (!res.ok) throw new Error('Failed to load inventory alerts');
    return res.json();
  },

  // --- SURGE SIMULATION ---
  simulateSurge: async (params: {
    arrival_surge_multiplier: number;
    doctor_shortage_pct: number;
    bed_capacity_reduction_pct: number;
    supply_strain_factor: number;
  }) => {
    const res = await fetch(`${BASE_URL}/surge/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to execute surge forecast simulation');
    return res.json();
  },

  // --- QR IDENTIFICATION ---
  getQRToken: async (patientId: string) => {
    const res = await fetch(`${BASE_URL}/qr/token/${patientId}`);
    if (!res.ok) throw new Error('Failed to generate signed QR token');
    return res.json();
  },

  verifyQRToken: async (qrToken: string) => {
    const res = await fetch(`${BASE_URL}/qr/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_token: qrToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Cryptographic verification failed for QR token');
    }
    return res.json();
  },

  // --- LABS RELEASE ---
  releaseLabToPatient: async (orderId: string, reviewedBy = 'Attending Physician', notes = '') => {
    const res = await fetch(`${BASE_URL}/labs/order/${orderId}/release-to-patient?reviewed_by=${encodeURIComponent(reviewedBy)}&notes=${encodeURIComponent(notes)}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to release lab report to patient');
    return res.json();
  },

  // Aliases for dashboard convenience
  orderDiet: async (payload: any) => {
    return api.createDietOrder(payload);
  },

  recordVitals: async (payload: any) => {
    return api.recordInpatientVitals(payload.patient_id, payload, payload.recorded_by);
  },

  verifyMealDelivery: async (deliveryId: string, deliveredBy = 'Ward Nurse') => {
    return api.verifyAndDeliverMeal(deliveryId, deliveredBy);
  },

  // --- CRITICAL RESULTS (Feature A) ---
  getCriticalResults: async (params?: { patient_id?: string; status?: string; unacknowledged_only?: boolean }): Promise<CriticalFollowUp[]> => {
    const searchParams = new URLSearchParams();
    if (params?.patient_id) searchParams.append('patient_id', params.patient_id);
    if (params?.status && params.status !== 'All') searchParams.append('status', params.status);
    if (params?.unacknowledged_only) searchParams.append('unacknowledged_only', 'true');
    const res = await fetch(`${BASE_URL}/critical-results?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to load critical results');
    return res.json();
  },

  evaluateCriticalResults: async () => {
    const res = await fetch(`${BASE_URL}/critical-results/evaluate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to evaluate critical rules');
    return res.json();
  },

  acknowledgeCriticalResult: async (id: string, acknowledgedBy: string, notes = '') => {
    const res = await fetch(`${BASE_URL}/critical-results/${id}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledged_by: acknowledgedBy, notes }),
    });
    if (!res.ok) throw new Error('Failed to acknowledge critical result');
    return res.json();
  },

  recordCriticalAction: async (id: string, actionTaken: string, actor: string) => {
    const res = await fetch(`${BASE_URL}/critical-results/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_taken: actionTaken, actor }),
    });
    if (!res.ok) throw new Error('Failed to record action on critical result');
    return res.json();
  },

  resolveCriticalResult: async (id: string, resolutionDetails: string, resolvedBy: string) => {
    const res = await fetch(`${BASE_URL}/critical-results/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_details: resolutionDetails, resolved_by: resolvedBy }),
    });
    if (!res.ok) throw new Error('Failed to resolve critical result');
    return res.json();
  },

  escalateCriticalResult: async (id: string, escalatedBy: string, escalationReason: string) => {
    const res = await fetch(`${BASE_URL}/critical-results/${id}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escalated_by: escalatedBy, escalation_reason: escalationReason }),
    });
    if (!res.ok) throw new Error('Failed to escalate critical result');
    return res.json();
  },

  // --- PATIENT HISTORY CHANGE ALERTS (Feature B) ---
  getUnreviewedChangeAlerts: async (): Promise<PatientHistoryChangeAlert[]> => {
    const res = await fetch(`${BASE_URL}/change-alerts/unreviewed`);
    if (!res.ok) throw new Error('Failed to load unreviewed alerts');
    return res.json();
  },

  getPatientChangeAlerts: async (patientId: string, unreviewedOnly = false): Promise<PatientHistoryChangeAlert[]> => {
    const res = await fetch(`${BASE_URL}/change-alerts/${patientId}?unreviewed_only=${unreviewedOnly}`);
    if (!res.ok) throw new Error('Failed to load patient change alerts');
    return res.json();
  },

  reviewChangeAlert: async (alertId: string, reviewedBy = 'Dr. Attending Physician') => {
    const res = await fetch(`${BASE_URL}/change-alerts/${alertId}/review?reviewed_by=${encodeURIComponent(reviewedBy)}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to review change alert');
    return res.json();
  },

  reviewAllPatientAlerts: async (patientId: string, reviewedBy = 'Dr. Attending Physician') => {
    const res = await fetch(`${BASE_URL}/change-alerts/review-all/${patientId}?reviewed_by=${encodeURIComponent(reviewedBy)}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to review all patient alerts');
    return res.json();
  },

  // --- CLINICAL HANDOVER (Feature C) ---
  getHandovers: async (params?: { patient_id?: string; ward?: string; status?: string }): Promise<ClinicalHandover[]> => {
    const searchParams = new URLSearchParams();
    if (params?.patient_id) searchParams.append('patient_id', params.patient_id);
    if (params?.ward && params.ward !== 'All') searchParams.append('ward', params.ward);
    if (params?.status && params.status !== 'All') searchParams.append('status', params.status);
    const res = await fetch(`${BASE_URL}/handovers?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to load clinical handovers');
    return res.json();
  },

  getHandoverSummary: async (patientId: string) => {
    const res = await fetch(`${BASE_URL}/handovers/generate/${patientId}`);
    if (!res.ok) throw new Error('Failed to generate handover summary');
    return res.json();
  },

  createHandover: async (payload: {
    patient_id: string;
    ward?: string;
    outgoing_staff_id?: string;
    outgoing_staff_name: string;
    outgoing_role: string;
    incoming_staff_name?: string;
    incoming_role?: string;
    clinical_summary: string;
    pending_tasks?: string;
    critical_concerns?: string;
    contingency_plans?: string;
    notes?: string;
  }) => {
    const res = await fetch(`${BASE_URL}/handovers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit clinical handover');
    return res.json();
  },

  acknowledgeHandover: async (handoverId: string, acknowledgedBy: string, notes = '') => {
    const res = await fetch(`${BASE_URL}/handovers/${handoverId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledged_by: acknowledgedBy, notes }),
    });
    if (!res.ok) throw new Error('Failed to acknowledge clinical handover');
    return res.json();
  },

  // --- DATA QUALITY & DUPLICATE REVIEWS (Feature D) ---
  getDataQualityReport: async (): Promise<DataQualityReport> => {
    const res = await fetch(`${BASE_URL}/duplicates/data-quality`);
    if (!res.ok) throw new Error('Failed to run hospital data quality audit');
    return res.json();
  },

  getDuplicateReviews: async (): Promise<DuplicateReviewRecord[]> => {
    const res = await fetch(`${BASE_URL}/duplicates/reviews`);
    if (!res.ok) throw new Error('Failed to load duplicate review history');
    return res.json();
  },

  // --- MEDICAL CORRECTIONS (Feature E) ---
  getPatientCorrections: async (patientId: string): Promise<MedicalCorrection[]> => {
    const res = await fetch(`${BASE_URL}/corrections/${patientId}`);
    if (!res.ok) throw new Error('Failed to load patient medical corrections');
    return res.json();
  },

  getPendingCorrections: async (): Promise<MedicalCorrection[]> => {
    const res = await fetch(`${BASE_URL}/corrections/pending/list`);
    if (!res.ok) throw new Error('Failed to load pending corrections');
    return res.json();
  },

  submitMedicalCorrection: async (payload: {
    patient_id: string;
    record_type: string;
    record_id?: string;
    field_name: string;
    previous_value?: string;
    new_value: string;
    reason: string;
    author_name: string;
    author_role: string;
  }) => {
    const res = await fetch(`${BASE_URL}/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, record_id: payload.record_id || `CORR-${Date.now()}` }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit medical record correction');
    }
    return res.json();
  },

  submitCorrection: async (payload: {
    patient_id: string;
    record_type: string;
    record_id?: string;
    field_name: string;
    previous_value?: string;
    new_value: string;
    reason: string;
    author_name: string;
    author_role: string;
  }) => {
    const res = await fetch(`${BASE_URL}/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, record_id: payload.record_id || `CORR-${Date.now()}` }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit medical record correction');
    }
    return res.json();
  },

  approveMedicalCorrection: async (correctionId: string, doctorName: string, doctorId: string, decision: 'Approved' | 'Rejected') => {
    const res = await fetch(
      `${BASE_URL}/corrections/${correctionId}/approve?doctor_name=${encodeURIComponent(doctorName)}&doctor_id=${encodeURIComponent(doctorId)}&decision=${decision}`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error('Failed to review correction');
    return res.json();
  },

  approveCorrection: async (correctionId: string, doctorName: string, doctorId: string, decision: 'Approved' | 'Rejected') => {
    const res = await fetch(
      `${BASE_URL}/corrections/${correctionId}/approve?doctor_name=${encodeURIComponent(doctorName)}&doctor_id=${encodeURIComponent(doctorId)}&decision=${decision}`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error('Failed to review correction');
    return res.json();
  },

  // --- DOCTOR-SPECIFIC QR ACCESS (Phase 4) ---
  verifyDoctorQRAccess: async (payload: {
    qr_token: string;
    username: string;
    role: string;
    doctor_id?: string;
  }): Promise<QRDoctorVerifyResult> => {
    const res = await fetch(`${BASE_URL}/qr/verify-doctor-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Bedside Access Denied');
    }
    return res.json();
  },

  grantTemporaryQRAccess: async (payload: {
    patient_id: string;
    covering_doctor_id: string;
    granted_by_doctor_id: string;
    duration_hours?: number;
    access_level?: string;
  }): Promise<TemporaryQRAccessGrant> => {
    const res = await fetch(`${BASE_URL}/qr/grant-temporary-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to grant temporary bedside access');
    return res.json();
  },

  getPatientQRGrants: async (patientId: string): Promise<TemporaryQRAccessGrant[]> => {
    const res = await fetch(`${BASE_URL}/qr/grants/${patientId}`);
    if (!res.ok) throw new Error('Failed to load QR access grants');
    return res.json();
  },

  revokeTemporaryQRGrant: async (grantId: string, revokedBy = 'Dr. Attending Physician') => {
    const res = await fetch(`${BASE_URL}/qr/grants/${grantId}/revoke?revoked_by=${encodeURIComponent(revokedBy)}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to revoke temporary grant');
    return res.json();
  },
};
