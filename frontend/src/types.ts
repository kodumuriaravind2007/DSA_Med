export interface Patient {
  patient_id: string;
  full_name: string;
  age: number;
  gender: string;
  phone?: string;
  email?: string;
  govt_id?: string;
  address?: string;
  blood_group?: string;
  priority: number; // 1: Critical, 2: Urgent, 3: Normal
  status: string; // Waiting, In Treatment, Lab Requested, Observation, Completed, Referred, Discharged
  department: string;
  reported_concern: string;
  assigned_doctor_id?: string | null;
  assigned_bed_id?: string | null;
  arrival_time: number;
  registration_date: string;
  updated_at: string;
  is_duplicate_flag: boolean;
  triage_notes?: string;
}

export interface VitalSign {
  id: number;
  patient_id: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature_f?: number;
  respiratory_rate?: number;
  oxygen_saturation_spo2?: number;
  pain_score?: number;
  recorded_at: string;
}

export interface Allergy {
  id: number;
  patient_id: string;
  allergen: string;
  severity: string;
  reaction?: string;
}

export interface Medication {
  id: number;
  patient_id: string;
  name: string;
  dosage: string;
  frequency: string;
  status: string;
  prescribed_by: string;
  prescribed_at: string;
}

export interface LabResult {
  id: number;
  lab_order_id: string;
  patient_id: string;
  test_name: string;
  parameter_name: string;
  result_value: string;
  unit: string;
  reference_range: string;
  flag: string;
  verified_by: string;
  verified_at: string;
}

export interface LabOrder {
  id: string;
  patient_id: string;
  test_name: string;
  order_date: string;
  status: string;
  ordering_doctor: string;
  is_released_to_patient?: boolean;
  results: LabResult[];
}

export interface Visit {
  id: number;
  patient_id: string;
  visit_date: string;
  department: string;
  doctor_name: string;
  diagnosis: string;
  notes: string;
  outcome: string;
}

export interface TimelineEvent {
  id: number;
  patient_id: string;
  timestamp: string;
  event_type: string;
  title: string;
  description: string;
  actor: string;
}

export interface Patient360 {
  patient: Patient;
  vitals: VitalSign[];
  allergies: Allergy[];
  medications: Medication[];
  lab_orders: LabOrder[];
  visits: Visit[];
  timeline: TimelineEvent[];
  estimated_wait_minutes?: number;
  queue_position?: number;
  critical_followups?: CriticalFollowUp[];
  change_alerts?: PatientHistoryChangeAlert[];
  handovers?: ClinicalHandover[];
  corrections?: MedicalCorrection[];
}

export interface Doctor {
  doctor_id: string;
  name: string;
  specialty: string;
  department: string;
  duty_status: string; // On Duty, Off Duty, On Call, In Consultation
  is_available: boolean;
  current_patient_count: number;
  max_active_patients: number;
  phone: string;
  email: string;
}

export interface Bed {
  bed_id: string;
  ward: string;
  department: string;
  status: string; // Available, Occupied, Cleaning, Reserved
  current_patient_id: string | null;
  current_patient_name?: string | null;
  last_cleaned_at: string;
}

export interface QueueItem {
  patient_id: string;
  patient_name: string;
  priority: number;
  arrival_time: number;
  reported_concern: string;
  department: string;
  status: string;
  assigned_doctor_id?: string | null;
  queue_position: number;
  estimated_wait_minutes: number;
  formatted_arrival: string;
  waiting_duration_mins: number;
}

export interface AuditLogItem {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  record_id: string;
  details: string;
  prev_hash: string;
  current_hash: string;
}

export interface AuditVerificationResult {
  is_valid: boolean;
  total_events: number;
  verified_blocks: number;
  latest_hash?: string;
  tampered_index?: number;
  error_type?: string;
  message: string;
  genesis_hash: string;
  security_notice: string;
}

export interface DuplicateCandidate {
  patient_1: Patient;
  patient_2: Patient;
  similarity_score: number;
  similarity_percentage: number;
  matched_fields: string[];
  recommended_action: string;
}

export interface CommandCenterData {
  kpis: {
    total_patients: number;
    waiting_patients: number;
    critical_cases: number;
    available_beds: number;
    occupied_beds: number;
    cleaning_beds: number;
    total_beds: number;
    doctors_on_duty: number;
    total_doctors: number;
    estimated_wait_time: number;
  };
  load_metrics: {
    load_score: number;
    status: string;
    color: string;
    bed_occupancy_pct: number;
    patient_to_doctor_ratio: number;
  };
  priority_distribution: Array<{ name: string; count: number; color: string }>;
  department_workload: Array<{
    department: string;
    active_patients: number;
    doctors_on_duty: number;
    occupied_beds: number;
    capacity_pct: number;
  }>;
  arrivals_completions: Array<{ time: string; arrivals: number; completions: number }>;
  recent_alerts: Array<{ id: string; type: string; title: string; message: string; time: string }>;
}

export interface User {
  id: number;
  username: string;
  role: 'patient' | 'doctor' | 'receptionist' | 'nurse' | 'admin';
  patient_id?: string | null;
  doctor_id?: string | null;
  full_name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  role: 'patient' | 'doctor' | 'receptionist' | 'nurse' | 'admin';
  patient_id?: string | null;
  doctor_id?: string | null;
  full_name: string;
}

export interface DemoUser {
  role: string;
  name: string;
  username: string;
  password: string;
  patient_id?: string;
  doctor_id?: string;
  badge: string;
  description: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  department: string;
  scheduled_time: string;
  reason: string;
  status: 'Scheduled' | 'Checked In' | 'In Progress' | 'Completed' | 'Cancelled';
  created_at: string;
}

export interface MARTask {
  id: string;
  medication_id?: number | null;
  patient_id: string;
  medication_name: string;
  dosage: string;
  route: string;
  scheduled_time: string;
  administered_time?: string | null;
  status: 'Due' | 'Due Soon' | 'Administered' | 'Delayed' | 'Held' | 'Omitted' | 'Requires Review';
  administered_by: string;
  hold_reason: string;
  notes: string;
  created_at: string;
}

export interface PostOpTask {
  id: string;
  plan_id: string;
  patient_id: string;
  task_type: string;
  title: string;
  due_time: string;
  completed_time?: string | null;
  status: 'Pending' | 'Completed' | 'Delayed';
  notes: string;
  nurse_name: string;
}

export interface PostOpCarePlan {
  id: string;
  patient_id: string;
  doctor_id: string;
  procedure_name: string;
  surgery_date: string;
  target_discharge_date?: string;
  status: string;
  wound_care_instructions: string;
  mobility_goal: string;
  created_at: string;
  tasks: PostOpTask[];
}

export interface DietOrder {
  id: string;
  patient_id: string;
  diet_type: string;
  allergens_restricted: string;
  texture: string;
  is_npo: boolean;
  status: string;
  ordering_clinician: string;
  notes: string;
  created_at: string;
}

export interface MealDelivery {
  id: string;
  diet_order_id: string;
  patient_id: string;
  meal_period: string;
  scheduled_date: string;
  scheduled_time: string;
  delivery_status: 'Scheduled' | 'Prepared' | 'Verified' | 'Delivered' | 'Refused' | 'Conflict Blocked';
  allergy_check_passed: boolean;
  conflict_details: string;
  delivered_by: string;
  delivered_at?: string | null;
}

export interface InventoryItem {
  id: string;
  item_code: string;
  name: string;
  category: string;
  unit: string;
  quantity_on_hand: number;
  reserved_quantity: number;
  reorder_threshold: number;
  batch_number: string;
  expiry_date: string;
  location: string;
}

export interface SurgeSimulationResult {
  scenario_params: {
    arrival_surge_multiplier: number;
    doctor_shortage_pct: number;
    bed_capacity_reduction_pct: number;
    supply_strain_factor: number;
  };
  baseline_stats: {
    arrival_rate_per_hr: number;
    on_duty_doctors: number;
    available_beds: number;
    total_beds: number;
    avg_wait_minutes: number;
    waiting_count: number;
  };
  simulated_stats: {
    simulated_arrival_rate_per_hr: number;
    effective_doctors: number;
    effective_available_beds: number;
    doctor_utilization_pct: number;
    hours_to_bed_saturation: number;
    wait_time_critical_mins: number;
    wait_time_urgent_mins: number;
    wait_time_normal_mins: number;
    projected_total_waiting: number;
  };
  department_load: Array<{
    name: string;
    baseline_load_pct: number;
    simulated_load_pct: number;
    status: string;
  }>;
  projected_queue: Array<{
    tier: string;
    baseline_count: number;
    surge_count: number;
    avg_wait_mins: number;
  }>;
  critical_bottleneck: string;
  recommendations: string[];
}

export interface QRTokenResponse {
  patient_id: string;
  full_name: string;
  qr_token: string;
  issued_at: string;
  verification_url: string;
}

export interface QRVerifiedPatient {
  status: string;
  verification_status: string;
  patient_id: string;
  full_name: string;
  age: number;
  gender: string;
  blood_group: string;
  priority: number;
  clinical_status: string;
  department: string;
  assigned_bed: string;
  ward: string;
  allergies: string[];
  verification_time: string;
}

export interface CriticalFollowUp {
  id: string;
  patient_id: string;
  lab_order_id: string;
  lab_result_id?: number | null;
  test_name: string;
  parameter_name: string;
  result_value: string;
  unit: string;
  reference_range: string;
  critical_rationale: string;
  status: 'Awaiting Acknowledgement' | 'Acknowledged' | 'Follow-up In Progress' | 'Resolved';
  deadline: string;
  acknowledged_by: string;
  acknowledged_at?: string | null;
  assigned_doctor_id?: string | null;
  action_taken: string;
  resolution_details: string;
  resolved_by: string;
  resolved_at?: string | null;
  created_at: string;
}

export interface PatientHistoryChangeAlert {
  id: string;
  patient_id: string;
  record_type: string;
  record_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  author_name: string;
  author_role: string;
  reason: string;
  is_reviewed: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface ClinicalHandover {
  id: string;
  patient_id: string;
  ward: string;
  outgoing_staff_id: string;
  outgoing_staff_name: string;
  outgoing_role: string;
  incoming_staff_name: string;
  incoming_role: string;
  status: 'Draft' | 'Submitted' | 'Acknowledged';
  clinical_summary: string;
  pending_tasks: string; // JSON string or array string
  critical_concerns: string;
  contingency_plans: string;
  version: number;
  created_at: string;
  acknowledged_at?: string | null;
  acknowledged_by: string;
  notes: string;
}

export interface DuplicateReviewRecord {
  id: number;
  patient_id_1: string;
  patient_id_2: string;
  decision: string;
  similarity_percentage: number;
  matched_fields: string;
  reviewed_by: string;
  reviewed_at: string;
  notes: string;
}

export interface DataQualityIssue {
  patient_id: string;
  patient_name: string;
  issue_type: string;
  severity: 'High' | 'Medium' | 'Low';
  description: string;
}

export interface DataQualityReport {
  total_records_analyzed: number;
  data_quality_score: number;
  issues_found: DataQualityIssue[];
  duplicate_candidates_count: number;
  timestamp: string;
}

export interface MedicalCorrection {
  id: string;
  patient_id: string;
  record_type: string;
  record_id: string;
  field_name: string;
  previous_value: string;
  new_value: string;
  user_id: string;
  author_name: string;
  author_role: string;
  reason: string;
  approval_status: 'Approved' | 'Pending Approval' | 'Rejected';
  approver_id: string;
  approver_name: string;
  approved_at?: string | null;
  timestamp: string;
  audit_hash: string;
}

export interface TemporaryQRAccessGrant {
  id: string;
  patient_id: string;
  doctor_id: string;
  granted_by: string;
  access_level: string;
  expires_at: string;
  is_revoked: boolean;
  created_at?: string;
}

export interface QRDoctorVerifyResult {
  status: string;
  access_type: string;
  temporary_grant?: {
    grant_id: string;
    granted_by: string;
    access_level: string;
    expires_at: string;
  } | null;
  patient: QRVerifiedPatient;
}
