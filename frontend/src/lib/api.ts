const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  requested_plan: "micro" | "starter" | "growth" | "enterprise";
};

export type Membership = {
  id: string;
  role: "owner" | "admin" | "member" | "viewer";
  job_title: string;
  is_active: boolean;
  organization: Organization;
};

export type CurrentUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  memberships: Membership[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

function cookie(name: string) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  const item = document.cookie.split("; ").find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : "";
}

async function csrfToken() {
  const response = await fetch(`${API_URL}/auth/csrf/`, { credentials: "include" });
  if (!response.ok) throw new ApiError("Unable to establish a secure session.", response.status);
  const body = (await response.json()) as { csrf_token: string };
  return cookie("offshora_csrftoken") || body.csrf_token;
}

function errorFields(body: unknown): Record<string, string[]> {
  if (!body || typeof body !== "object") return {};
  return Object.fromEntries(Object.entries(body as Record<string, unknown>).flatMap(([key, value]) => {
    const messages = (Array.isArray(value) ? value : [value]).filter((item): item is string => typeof item === "string");
    return messages.length ? [[key, messages]] : [];
  }));
}

function errorMessage(body: unknown) {
  if (!body || typeof body !== "object") return "The request could not be completed.";
  const fields = errorFields(body);
  return fields.detail?.[0] ?? Object.values(fields)[0]?.[0] ?? "The request could not be completed.";
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("X-CSRFToken", await csrfToken());
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(errorMessage(body), response.status, errorFields(body));
  }
  return body as T;
}

export const authApi = {
  me: () => apiRequest<CurrentUser>("/auth/me/"),
  login: (payload: { email: string; password: string; remember_me: boolean }) =>
    apiRequest<CurrentUser>("/auth/login/", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    organization_name: string;
    job_title: string;
    requested_plan: string;
    terms_accepted: boolean;
  }) => apiRequest<CurrentUser>("/auth/register/", { method: "POST", body: JSON.stringify(payload) }),
  refresh: () => apiRequest<CurrentUser>("/auth/session/refresh/", { method: "POST" }),
  logout: () => apiRequest<void>("/auth/logout/", { method: "POST" }),
};

export type BunkerStatus =
  | "draft"
  | "confirmed"
  | "sounding_recorded"
  | "bdn_draft"
  | "under_review"
  | "approved"
  | "issued"
  | "cancelled";

export type BunkerSounding = {
  id: string;
  tank_reference: string;
  forward_sounding_m: string;
  aft_sounding_m: string;
  observed_volume_m3: string;
  observed_temperature_c: string;
  density_kg_m3: string;
  reviewed_volume_m3: string;
  reviewed_mass_mt: string;
  calculation_method_note: string;
  status: "draft" | "reviewed";
  version: number;
  recorded_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type BunkerDeliveryNote = {
  id: string;
  number: string;
  delivered_quantity_mt: string;
  flashpoint_c: string;
  viscosity_cst: string;
  sulphur_percent: string;
  water_percent: string;
  supplier_acknowledged_by: string;
  supplier_acknowledged_at: string | null;
  receiver_acknowledged_by: string;
  receiver_acknowledged_at: string | null;
  status: "draft" | "under_review" | "approved" | "issued";
  version: number;
  approved_by: string | null;
  approved_at: string | null;
  issued_by: string | null;
  issued_at: string | null;
};

export type BunkerAuditEvent = {
  id: string;
  request_id: string;
  actor: string;
  action: string;
  outcome: "success" | "failure";
  reason: string;
  from_status: string;
  to_status: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BunkerNomination = {
  id: string;
  reference: string;
  customer_name: string;
  vessel_name: string;
  imo_number: string;
  port: string;
  product_grade: string;
  nominated_quantity_mt: string;
  delivered_quantity_mt: string | null;
  delivery_window_start: string;
  delivery_window_end: string;
  status: BunkerStatus;
  version: number;
  sounding_count: number;
  notes?: string;
  soundings?: BunkerSounding[];
  bdn?: BunkerDeliveryNote | null;
  audit_events?: BunkerAuditEvent[];
  allowed_actions?: string[];
  created_at: string;
  updated_at: string;
};

export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type BunkerSummary = { active_stems: number; nominated_quantity_mt: string; issued_bdns: number; delivered_quantity_mt: string };

export const bunkerApi = {
  summary: () => apiRequest<BunkerSummary>("/bunkerflow/summary/"),
  list: (params = "") => apiRequest<Paginated<BunkerNomination>>(`/bunkerflow/nominations/${params ? `?${params}` : ""}`),
  detail: (id: string) => apiRequest<BunkerNomination>(`/bunkerflow/nominations/${id}/`),
  create: (payload: Record<string, unknown>) => apiRequest<BunkerNomination>("/bunkerflow/nominations/", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: Record<string, unknown>) => apiRequest<BunkerNomination>(`/bunkerflow/nominations/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  transition: (id: string, action: string, version: number, reason: string) =>
    apiRequest<BunkerNomination>(`/bunkerflow/nominations/${id}/actions/${action}/`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  createSounding: (id: string, payload: Record<string, unknown>) => apiRequest<BunkerSounding>(`/bunkerflow/nominations/${id}/soundings/`, { method: "POST", body: JSON.stringify(payload) }),
  reviewSounding: (id: string, soundingId: string, version: number, reason: string) =>
    apiRequest<BunkerNomination>(`/bunkerflow/nominations/${id}/soundings/review/`, { method: "POST", body: JSON.stringify({ sounding_id: soundingId, version, reason }) }),
  createBdn: (id: string, payload: Record<string, unknown>) => apiRequest<BunkerNomination>(`/bunkerflow/nominations/${id}/bdn/`, { method: "POST", body: JSON.stringify(payload) }),
  updateBdn: (id: string, payload: Record<string, unknown>) => apiRequest<BunkerNomination>(`/bunkerflow/nominations/${id}/bdn/`, { method: "PATCH", body: JSON.stringify(payload) }),
};

export async function downloadBdn(id: string, filename: string) {
  const response = await fetch(`${API_URL}/bunkerflow/nominations/${id}/bdn/export/`, { credentials: "include" });
  if (!response.ok) throw new ApiError("The BDN could not be exported.", response.status);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export type HaulStatus = "draft" | "dispatched" | "in_transit" | "arrived" | "discharging" | "delivered" | "closed" | "cancelled";
export type HaulCustomer = { id: string; name: string; contact_name: string; contact_phone: string; is_active: boolean; created_at: string };
export type HaulLocation = { id: string; name: string; address: string; contact_name: string; contact_phone: string; is_active: boolean; created_at: string };
export type HaulTruck = { id: string; registration_number: string; fleet_number: string; make_model: string; capacity_litres: string; is_active: boolean; created_at: string };
export type HaulTrailer = { id: string; registration_number: string; fleet_number: string; capacity_litres: string; calibration_expires_on: string | null; is_active: boolean; created_at: string };
export type HaulDriver = { id: string; full_name: string; phone_number: string; licence_number: string; licence_expires_on: string; is_active: boolean; created_at: string };
export type WeighbridgeReading = { id: string; kind: "tare" | "gross"; weight_kg: string; captured_at: string; weighbridge_name: string; ticket_number: string; source: "manual" | "integration"; recorded_by: string; created_at: string };
export type ElectronicWaybill = { id: string; number: string; verification_code: string; issued_at: string };
export type ProofOfDelivery = { id: string; delivered_quantity_litres: string; ullage_mm: string; observed_temperature_c: string; water_paste_result: "clear" | "water_detected"; receiver_name: string; receiver_title: string; receiver_acknowledged_at: string; notes: string; recorded_by: string; created_at: string };
export type HaulAuditEvent = { id: string; request_id: string; actor: string; action: string; outcome: "success" | "failure"; reason: string; from_status: string; to_status: string; metadata: Record<string, unknown>; created_at: string };
export type HaulFleet = {
  id: string; reference: string; status: "draft" | "ready"; version: number;
  completed_steps: number; next_step: "customer" | "route" | "truck" | "trailer" | "driver" | "complete";
  customer: HaulCustomer | null; origin: HaulLocation | null; destination: HaulLocation | null;
  truck: HaulTruck | null; trailer: HaulTrailer | null; driver: HaulDriver | null;
  created_at: string; updated_at: string;
};
export type HaulDispatch = {
  id: string; reference: string; customer_name: string; origin_name: string; destination_name: string;
  truck_registration: string; trailer_registration: string; driver_name: string; product: string;
  planned_quantity_litres: string; scheduled_departure_at: string; status: HaulStatus; version: number;
  waybill_number: string | null; created_at: string; updated_at: string;
  customer?: HaulCustomer; origin?: HaulLocation; destination?: HaulLocation; truck?: HaulTruck;
  trailer?: HaulTrailer; driver?: HaulDriver; notes?: string; weighbridge_readings?: WeighbridgeReading[];
  waybill?: ElectronicWaybill | null; proof_of_delivery?: ProofOfDelivery | null;
  audit_events?: HaulAuditEvent[]; allowed_actions?: string[];
};
export type HaulSummary = { active_trips: number; draft_dispatches: number; closed_trips: number; planned_quantity_litres: string };
export type HaulReferences = { customers: HaulCustomer[]; locations: HaulLocation[]; trucks: HaulTruck[]; trailers: HaulTrailer[]; drivers: HaulDriver[] };

export const haulApi = {
  summary: () => apiRequest<HaulSummary>("/haultrac/summary/"),
  fleets: (params = "") => apiRequest<HaulFleet[]>(`/haultrac/fleets/${params ? `?${params}` : ""}`),
  createFleet: () => apiRequest<HaulFleet>("/haultrac/fleets/", { method: "POST", body: JSON.stringify({}) }),
  fleet: (id: string) => apiRequest<HaulFleet>(`/haultrac/fleets/${id}/`),
  saveFleetStage: (id: string, stage: string, version: number, data: Record<string, unknown>) =>
    apiRequest<HaulFleet>(`/haultrac/fleets/${id}/stage/`, { method: "POST", body: JSON.stringify({ stage, version, data }) }),
  list: (params = "") => apiRequest<Paginated<HaulDispatch>>(`/haultrac/dispatches/${params ? `?${params}` : ""}`),
  detail: (id: string) => apiRequest<HaulDispatch>(`/haultrac/dispatches/${id}/`),
  create: (payload: Record<string, unknown>) => apiRequest<HaulDispatch>("/haultrac/dispatches/", { method: "POST", body: JSON.stringify(payload) }),
  transition: (id: string, action: string, version: number, reason: string) => apiRequest<HaulDispatch>(`/haultrac/dispatches/${id}/actions/${action}/`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  recordWeighbridge: (id: string, payload: Record<string, unknown>) => apiRequest<HaulDispatch>(`/haultrac/dispatches/${id}/weighbridge/`, { method: "POST", body: JSON.stringify(payload) }),
  generateWaybill: (id: string, version: number, number = "") => apiRequest<HaulDispatch>(`/haultrac/dispatches/${id}/waybill/`, { method: "POST", body: JSON.stringify({ version, number }) }),
  recordPod: (id: string, payload: Record<string, unknown>) => apiRequest<HaulDispatch>(`/haultrac/dispatches/${id}/proof-of-delivery/`, { method: "POST", body: JSON.stringify(payload) }),
  customers: () => apiRequest<HaulCustomer[]>("/haultrac/customers/"),
  locations: () => apiRequest<HaulLocation[]>("/haultrac/locations/"),
  trucks: () => apiRequest<HaulTruck[]>("/haultrac/trucks/"),
  trailers: () => apiRequest<HaulTrailer[]>("/haultrac/trailers/"),
  drivers: () => apiRequest<HaulDriver[]>("/haultrac/drivers/"),
  createReference: (kind: "customers" | "locations" | "trucks" | "trailers" | "drivers", payload: Record<string, unknown>) => apiRequest<unknown>(`/haultrac/${kind}/`, { method: "POST", body: JSON.stringify(payload) }),
};

export type PipeAsset = { id: string; reference: string; name: string; fluid_type: "liquid" | "gas"; governing_code: string; is_active: boolean; created_at: string; updated_at: string };
export type PipePigRun = { id: string; asset: string; reference: string; pig_type: string; launcher_kp: string; receiver_kp: string; status: string; launched_at: string | null; arrived_at: string | null; recovered_at: string | null; transit_velocity_mps: string | null; debris_volume_m3: string | null; notes: string; version: number; allowed_actions: string[] };
export type PipeHydrotest = { id: string; asset: string; reference: string; test_pressure_bar: string; hold_duration_minutes: number; pressure_drop_bar: string | null; minimum_temperature_c: string | null; maximum_temperature_c: string | null; status: string; version: number; allowed_actions: string[] };
export type PipeInspection = { id: string; asset: string; reference: string; inspection_type: string; subject_reference: string; result: string; measured_wall_thickness_mm: string | null; corrosion_rate_mm_per_year: string | null; remaining_life_years: string | null; inspected_at: string; inspector_name: string };
export type PipeCpPoint = { id: string; asset: string; reference: string; kp: string; potential_mv: string; electrode: string; surveyed_at: string; surveyor_name: string };
export type PipeRowObservation = { id: string; asset: string; reference: string; kp: string; category: string; severity: string; status: string; observed_at: string; observer_name: string; description: string };

export type PipeIntegrityDossier = {
  asset: { id: string; reference: string; name: string; fluid_type: "liquid" | "gas"; governing_code: string; is_active: boolean };
  integrity_summary: {
    integrity_score: number;
    status: "satisfactory" | "requires_action" | "critical";
    governing_standards: string[];
    latest_hydrotest_passed: string | null;
    hydrotest_pressure_bar: string | null;
    hydrotest_hold_minutes: number | null;
    min_remaining_life_years: string;
    max_corrosion_rate_mm_yr: string;
    cp_compliance_percent: number;
    total_cp_survey_points: number;
    open_row_anomalies: number;
    critical_row_anomalies: number;
  };
  pig_operations: {
    total_runs: number;
    completed_runs: number;
    latest_run_reference: string | null;
    latest_pig_type: string | null;
    latest_status: string | null;
  };
  records: {
    inspections_count: number;
    rejected_inspections: number;
    hydrotests_count: number;
    cp_points_count: number;
    row_observations_count: number;
  };
};

export const pipeIntegrityApi = {
  assets: (params = "") => apiRequest<Paginated<PipeAsset>>(`/pipeintegrity/assets/${params ? `?${params}` : ""}`),
  dossier: (assetId: string) => apiRequest<PipeIntegrityDossier>(`/pipeintegrity/assets/${assetId}/dossier/`),
  createAsset: (payload: Record<string, unknown>) => apiRequest<PipeAsset>("/pipeintegrity/assets/", { method: "POST", body: JSON.stringify(payload) }),
  pigRuns: (params = "") => apiRequest<Paginated<PipePigRun>>(`/pipeintegrity/pig-runs/${params ? `?${params}` : ""}`),
  createPigRun: (payload: Record<string, unknown>) => apiRequest<PipePigRun>("/pipeintegrity/pig-runs/", { method: "POST", body: JSON.stringify(payload) }),
  transitionPig: (id: string, action: string, version: number, reason: string) => apiRequest<PipePigRun>(`/pipeintegrity/pig-runs/${id}/actions/${action}/`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  hydrotests: (params = "") => apiRequest<Paginated<PipeHydrotest>>(`/pipeintegrity/hydrotests/${params ? `?${params}` : ""}`),
  createHydrotest: (payload: Record<string, unknown>) => apiRequest<PipeHydrotest>("/pipeintegrity/hydrotests/", { method: "POST", body: JSON.stringify(payload) }),
  transitionHydrotest: (id: string, action: string, version: number, reason: string, updates?: Record<string, unknown>) => apiRequest<PipeHydrotest>(`/pipeintegrity/hydrotests/${id}/actions/${action}/`, { method: "POST", body: JSON.stringify({ version, reason, updates }) }),
  inspections: (params = "") => apiRequest<Paginated<PipeInspection>>(`/pipeintegrity/inspections/${params ? `?${params}` : ""}`),
  cpSurveyPoints: (params = "") => apiRequest<Paginated<PipeCpPoint>>(`/pipeintegrity/cp-survey-points/${params ? `?${params}` : ""}`),
  rowObservations: (params = "") => apiRequest<Paginated<PipeRowObservation>>(`/pipeintegrity/row-observations/${params ? `?${params}` : ""}`),
  createInspection: (payload: Record<string, unknown>) => apiRequest<PipeInspection>("/pipeintegrity/inspections/", { method: "POST", body: JSON.stringify(payload) }),
  createCpSurveyPoint: (payload: Record<string, unknown>) => apiRequest<PipeCpPoint>("/pipeintegrity/cp-survey-points/", { method: "POST", body: JSON.stringify(payload) }),
  createRowObservation: (payload: Record<string, unknown>) => apiRequest<PipeRowObservation>("/pipeintegrity/row-observations/", { method: "POST", body: JSON.stringify(payload) }),
};

export type SafePassSummary = { active_workers: number; active_permits: number; open_mobilizations: number; credential_alerts: number };
export type SafePassWorker = { id: string; employee_number: string; full_name: string; job_title: string; email: string; phone_number: string; is_active: boolean; created_at: string; updated_at: string };
export type SafePassCredential = { id: string; worker_name: string; kind: string; certificate_number: string; issuer: string; valid_from: string; expires_on: string; status: "pending" | "verified" | "rejected" | "revoked"; evidence_reference: string };
export type SafePassProcedure = { id: string; name: string; site: string; credential_buffer_days: number; oxygen_min_percent: string; oxygen_max_percent: string; max_lel_percent: string; max_h2s_ppm: string; required_credential_kinds: string[]; is_approved: boolean };
export type SafePassCrew = { worker_id: string; worker_name: string; is_cleared: boolean; blocking_reasons: string[]; checked_at: string | null };
export type SafePassMobilization = { id: string; reference: string; destination: string; scheduled_at: string; procedure_name: string; status: string; version: number; crew_entries: SafePassCrew[]; created_at: string; updated_at: string };
export type SafePassGasTest = { id: string; tested_at: string; oxygen_percent: string; lel_percent: string; h2s_ppm: string; instrument_reference: string; instrument_calibration_expires_on: string; passed: boolean };
export type SafePassPermit = { id: string; reference: string; kind: string; title: string; site: string; work_description: string; procedure_name: string; performing_authority_name: string; starts_at: string; expires_at: string; hazards: string[]; controls: string[]; status: string; version: number; gas_tests: SafePassGasTest[]; acknowledgements: { id: string; worker_name: string; kind: string; acknowledged_at: string; statement: string }[]; audit_events: { id: string; actor: string; action: string; reason: string; from_status: string; to_status: string; created_at: string }[] };

export const safePassApi = {
  summary: () => apiRequest<SafePassSummary>("/safepass/summary/"),
  workers: () => apiRequest<SafePassWorker[]>("/safepass/workers/"),
  createWorker: (payload: Record<string, unknown>) => apiRequest<SafePassWorker>("/safepass/workers/", { method: "POST", body: JSON.stringify(payload) }),
  credentials: () => apiRequest<SafePassCredential[]>("/safepass/credentials/"),
  createCredential: (payload: Record<string, unknown>) => apiRequest<SafePassCredential>("/safepass/credentials/", { method: "POST", body: JSON.stringify(payload) }),
  verifyCredential: (id: string) => apiRequest<SafePassCredential>(`/safepass/credentials/${id}/verify/`, { method: "POST", body: "{}" }),
  procedures: () => apiRequest<SafePassProcedure[]>("/safepass/procedures/"),
  createProcedure: (payload: Record<string, unknown>) => apiRequest<SafePassProcedure>("/safepass/procedures/", { method: "POST", body: JSON.stringify(payload) }),
  approveProcedure: (id: string) => apiRequest<SafePassProcedure>(`/safepass/procedures/${id}/approve/`, { method: "POST", body: "{}" }),
  mobilizations: () => apiRequest<SafePassMobilization[]>("/safepass/mobilizations/"),
  createMobilization: (payload: Record<string, unknown>) => apiRequest<SafePassMobilization>("/safepass/mobilizations/", { method: "POST", body: JSON.stringify(payload) }),
  addCrew: (id: string, workerId: string) => apiRequest<SafePassMobilization>(`/safepass/mobilizations/${id}/crew/`, { method: "POST", body: JSON.stringify({ worker_id: workerId }) }),
  assessMobilization: (id: string, version: number) => apiRequest<SafePassMobilization>(`/safepass/mobilizations/${id}/assess/`, { method: "POST", body: JSON.stringify({ version }) }),
  releaseMobilization: (id: string, version: number, reason: string) => apiRequest<SafePassMobilization>(`/safepass/mobilizations/${id}/release/`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  permits: () => apiRequest<SafePassPermit[]>("/safepass/permits/"),
  permit: (id: string) => apiRequest<SafePassPermit>(`/safepass/permits/${id}/`),
  createPermit: (payload: Record<string, unknown>) => apiRequest<SafePassPermit>("/safepass/permits/", { method: "POST", body: JSON.stringify(payload) }),
  gasTest: (id: string, payload: Record<string, unknown>) => apiRequest<SafePassGasTest>(`/safepass/permits/${id}/gas-tests/`, { method: "POST", body: JSON.stringify(payload) }),
  acknowledge: (id: string, payload: Record<string, unknown>) => apiRequest(`/safepass/permits/${id}/acknowledgements/`, { method: "POST", body: JSON.stringify(payload) }),
  transition: (id: string, action: string, version: number, reason: string) => apiRequest<SafePassPermit>(`/safepass/permits/${id}/actions/${action}/`, { method: "POST", body: JSON.stringify({ version, reason }) }),
};

export async function downloadSafePassPermit(id: string, filename: string) {
  const response = await fetch(`${API_URL}/safepass/permits/${id}/export/`, { credentials: "include" });
  if (!response.ok) throw new ApiError("The Permit-to-Work PDF could not be exported.", response.status);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = url; link.download = `${filename}.pdf`; link.click(); URL.revokeObjectURL(url);
}

export const haulQrUrl = (id: string) => `${API_URL}/haultrac/dispatches/${id}/waybill/qr/`;

export async function downloadDeliveryDocument(id: string, filename: string) {
  const response = await fetch(`${API_URL}/haultrac/dispatches/${id}/export/`, { credentials: "include" });
  if (!response.ok) throw new ApiError("The delivery document could not be exported.", response.status);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export type RefineryTerminal = {
  id: string;
  code: string;
  name: string;
  location: string;
  is_active: boolean;
};

export type RefineryTank = {
  id: string;
  terminal_id: string;
  terminal_code: string;
  terminal_name: string;
  tank_number: string;
  product_type: "pms" | "ago" | "dpk" | "atk";
  nominal_capacity_litres: string;
  safe_fill_level_mm: number;
  current_status: "receiving" | "settling" | "dispensing" | "idle" | "maintenance";
};

export type RefineryAppointment = {
  id: string;
  terminal_id: string;
  terminal_code: string;
  terminal_name: string;
  reference: string;
  truck_plate: string;
  driver_name: string;
  driver_phone: string;
  driver_license: string;
  product_type: "pms" | "ago" | "dpk" | "atk";
  nominated_volume_litres: string;
  holding_park_slot: string;
  rfid_tag: string;
  e_callup_reference: string;
  status: "scheduled" | "checked_in" | "called_up" | "loading" | "completed" | "cancelled";
  scheduled_at: string;
  checked_in_at: string | null;
  called_up_at: string | null;
  completed_at: string | null;
  version: number;
  allowed_actions: string[];
  notes: string;
};

export type RefineryTankDip = {
  id: string;
  tank_id: string;
  tank_number: string;
  terminal_code: string;
  reference: string;
  dip_type: "manual" | "automated";
  observed_level_mm: string;
  water_cut_mm: string;
  temperature_c: string;
  observed_density_kg_m3: string;
  gross_observed_volume_litres: string;
  net_standard_volume_litres: string;
  recorded_at: string;
  operator_name: string;
};

export type RefineryMeterTicket = {
  id: string;
  appointment_id: string;
  appointment_reference: string;
  truck_plate: string;
  tank_id: string;
  tank_number: string;
  ticket_number: string;
  meter_id: string;
  batch_start_reading: string;
  batch_end_reading: string;
  gross_volume_litres: string;
  net_volume_litres: string;
  temperature_c: string;
  density_at_15c: string;
  variance_litres: string;
  variance_percent: string;
  status: "issued" | "reconciled" | "flagged_variance";
  started_at: string;
  completed_at: string;
};

export type RefineryQualityCert = {
  id: string;
  certificate_number: string;
  product_type: "pms" | "ago" | "dpk" | "atk";
  batch_number: string;
  density_at_15c: string;
  flash_point_c: string | null;
  ron: string | null;
  distillation_recovery_percent: string | null;
  sulphur_ppm: string;
  is_compliant_nmdpra: boolean;
  laboratory_name: string;
  tested_at: string;
  authorized_chemist: string;
};

export type RefinerySummary = {
  today_throughput_litres: string;
  holding_park_queue_count: number;
  called_up_queue_count: number;
  reconciled_tickets_count: number;
  flagged_tickets_count: number;
  active_tanks_count: number;
};

export const refineryLinkApi = {
  summary: () => apiRequest<RefinerySummary>("/refinerylink/summary/"),
  terminals: () => apiRequest<RefineryTerminal[]>("/refinerylink/terminals/"),
  createTerminal: (payload: Record<string, unknown>) =>
    apiRequest<RefineryTerminal>("/refinerylink/terminals/", { method: "POST", body: JSON.stringify(payload) }),
  tanks: (params = "") => apiRequest<Paginated<RefineryTank>>(`/refinerylink/tanks/${params ? `?${params}` : ""}`),
  createTank: (payload: Record<string, unknown>) =>
    apiRequest<RefineryTank>("/refinerylink/tanks/", { method: "POST", body: JSON.stringify(payload) }),
  appointments: (params = "") =>
    apiRequest<Paginated<RefineryAppointment>>(`/refinerylink/appointments/${params ? `?${params}` : ""}`),
  appointment: (id: string) => apiRequest<RefineryAppointment>(`/refinerylink/appointments/${id}/`),
  createAppointment: (payload: Record<string, unknown>) =>
    apiRequest<RefineryAppointment>("/refinerylink/appointments/", { method: "POST", body: JSON.stringify(payload) }),
  transitionAppointment: (id: string, action: string, version: number, reason: string) =>
    apiRequest<RefineryAppointment>(`/refinerylink/appointments/${id}/actions/${action}/`, {
      method: "POST",
      body: JSON.stringify({ version, reason }),
    }),
  dips: (params = "") => apiRequest<Paginated<RefineryTankDip>>(`/refinerylink/tank-dips/${params ? `?${params}` : ""}`),
  createDip: (payload: Record<string, unknown>) =>
    apiRequest<RefineryTankDip>("/refinerylink/tank-dips/", { method: "POST", body: JSON.stringify(payload) }),
  tickets: (params = "") =>
    apiRequest<Paginated<RefineryMeterTicket>>(`/refinerylink/meter-tickets/${params ? `?${params}` : ""}`),
  createTicket: (payload: Record<string, unknown>) =>
    apiRequest<RefineryMeterTicket>("/refinerylink/meter-tickets/", { method: "POST", body: JSON.stringify(payload) }),
  qualityCerts: (params = "") =>
    apiRequest<Paginated<RefineryQualityCert>>(`/refinerylink/quality-certs/${params ? `?${params}` : ""}`),
  createQualityCert: (payload: Record<string, unknown>) =>
    apiRequest<RefineryQualityCert>("/refinerylink/quality-certs/", { method: "POST", body: JSON.stringify(payload) }),
};

export type MarineCatalogueItem = {
  id: string;
  item_code: string;
  name: string;
  category: "ship_spares" | "lubricants" | "provisions" | "medical" | "gases" | "safety_ppe";
  unit_of_measure: string;
  brand: string;
  impa_code: string;
  minimum_stock_level: number;
  is_active: boolean;
  total_stock_on_hand: string | number;
  created_at: string;
  updated_at: string;
};

export type StoreInventoryItem = {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  location: string;
  batch_or_lot_number: string;
  serial_number: string;
  quantity_on_hand: string;
  unit_cost_minor: number;
  currency: string;
  expires_on: string | null;
  storage_condition: string;
  created_at: string;
  updated_at: string;
};

export type RefrigerantCylinder = {
  id: string;
  cylinder_serial: string;
  gas_type: string;
  tare_weight_kg: string;
  gross_weight_kg: string;
  net_gas_weight_kg: string;
  status: "full" | "in_service" | "empty" | "recovered";
  assigned_vessel_or_facility: string;
  marpol_compliant: boolean;
  recovery_logged_at: string | null;
  environmental_notes: string;
  created_at: string;
  updated_at: string;
};

export type StoreOrderItem = {
  id: string;
  catalogue_item_id: string;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  quantity_requested: string;
  quantity_delivered: string;
  unit_price_minor: number;
  currency: string;
  notes: string;
};

export type StoreOrder = {
  id: string;
  order_number: string;
  vessel_or_installation: string;
  destination: string;
  status: "draft" | "approved" | "dispatched" | "delivered" | "cancelled";
  requested_delivery_date: string;
  delivered_at: string | null;
  receiving_officer_name: string;
  receiving_signature_ref: string;
  total_minor: number;
  currency: string;
  version: number;
  allowed_actions: string[];
  line_items: StoreOrderItem[];
  notes: string;
  created_at: string;
  updated_at: string;
};

export type InventoryMovement = {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  movement_type: "receipt" | "issuance" | "adjustment" | "recovery";
  quantity_delta: string;
  resulting_quantity: string;
  location: string;
  actor_name: string;
  reason: string;
  created_at: string;
};

export type MarineStoresSummary = {
  total_catalogue_items: number;
  total_active_catalogue_items: number;
  low_stock_alerts_count: number;
  total_refrigerant_cylinders: number;
  in_service_cylinders: number;
  marpol_compliant_cylinders: number;
  total_orders: number;
  pending_orders: number;
  dispatched_orders: number;
  delivered_orders: number;
  recent_movements: InventoryMovement[];
};

export const marineStoresApi = {
  summary: () => apiRequest<MarineStoresSummary>("/marinestores/summary/"),
  catalogue: (params = "") =>
    apiRequest<MarineCatalogueItem[]>(`/marinestores/catalogue/${params ? `?${params}` : ""}`),
  createCatalogueItem: (payload: Record<string, unknown>) =>
    apiRequest<MarineCatalogueItem>("/marinestores/catalogue/", { method: "POST", body: JSON.stringify(payload) }),
  inventory: (params = "") =>
    apiRequest<StoreInventoryItem[]>(`/marinestores/inventory/${params ? `?${params}` : ""}`),
  recordReceipt: (payload: Record<string, unknown>) =>
    apiRequest<StoreInventoryItem>("/marinestores/inventory/", { method: "POST", body: JSON.stringify(payload) }),
  cylinders: (params = "") =>
    apiRequest<RefrigerantCylinder[]>(`/marinestores/cylinders/${params ? `?${params}` : ""}`),
  createCylinder: (payload: Record<string, unknown>) =>
    apiRequest<RefrigerantCylinder>("/marinestores/cylinders/", { method: "POST", body: JSON.stringify(payload) }),
  updateCylinder: (id: string, payload: Record<string, unknown>) =>
    apiRequest<RefrigerantCylinder>(`/marinestores/cylinders/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  orders: (params = "") =>
    apiRequest<Paginated<StoreOrder>>(`/marinestores/orders/${params ? `?${params}` : ""}`),
  order: (id: string) => apiRequest<StoreOrder>(`/marinestores/orders/${id}/`),
  createOrder: (payload: Record<string, unknown>) =>
    apiRequest<StoreOrder>("/marinestores/orders/", { method: "POST", body: JSON.stringify(payload) }),
  transitionOrder: (id: string, action: string, version: number, reason = "", delivery_data?: Record<string, string>) =>
    apiRequest<StoreOrder>(`/marinestores/orders/${id}/actions/${action}/`, {
      method: "POST",
      body: JSON.stringify({ version, reason, delivery_data }),
    }),
  movements: (params = "") =>
    apiRequest<Paginated<InventoryMovement>>(`/marinestores/movements/${params ? `?${params}` : ""}`),
};

export type TankFieldJob = {
  id: string;
  job_number: string;
  client_name: string;
  terminal_or_facility: string;
  tank_identifier: string;
  tank_capacity_m3: string | null;
  scope_of_work: "evac_cleaning" | "blast_coat" | "full_refurb" | "inspect_repair";
  status: "draft" | "permit_pending" | "active" | "inspection" | "completed" | "cancelled";
  safepass_permit_ref: string;
  gas_test_cleared: boolean;
  estimated_cost_minor: number;
  actual_cost_minor: number;
  currency: string;
  version: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string;
  allowed_actions: string[];
  waste_manifests?: SludgeWasteManifest[];
  coating_inspections?: CoatingInspection[];
  audit_events?: TankWorksAuditEvent[];
  created_at: string;
  updated_at: string;
};

export type SludgeWasteManifest = {
  id: string;
  job_id: string;
  job_number: string;
  manifest_number: string;
  waste_classification: "hydrocarbon_sludge" | "contaminated_water" | "spent_grit" | "rust_scale";
  quantity: string;
  unit_of_measure: string;
  transporter_name: string;
  vehicle_registration: string;
  driver_name: string;
  nesrea_permit_number: string;
  disposal_facility: string;
  treatment_method: string;
  is_consignment_signed: boolean;
  dispatched_at: string;
  disposed_at: string | null;
  notes: string;
  created_at: string;
};

export type CoatingInspection = {
  id: string;
  job_id: string;
  job_number: string;
  surface_location: string;
  blast_standard: string;
  surface_profile_microns: string;
  coating_system: string;
  specified_dft_microns: number;
  measured_min_dft_microns: number;
  measured_avg_dft_microns: number;
  measured_max_dft_microns: number;
  dft_passed: boolean;
  adhesion_test_method: string;
  adhesion_result_mpa: string | null;
  ambient_temp_c: string | null;
  steel_temp_c: string | null;
  relative_humidity_percent: string | null;
  dew_point_c: string | null;
  inspector_name: string;
  nace_level: string;
  inspection_date: string;
  passed: boolean;
  notes: string;
  created_at: string;
};

export type CrewEquipmentUtilization = {
  id: string;
  job_id: string;
  job_number: string;
  entry_date: string;
  personnel_role: string;
  headcount: number;
  man_hours: string;
  equipment_description: string;
  equipment_hours: string;
  consumables_used: string;
  created_at: string;
};

export type TankWorksAuditEvent = {
  id: string;
  actor_name: string;
  action: string;
  from_status: string;
  to_status: string;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type TankWorksSummary = {
  total_jobs: number;
  active_jobs: number;
  permit_pending_jobs: number;
  completed_jobs: number;
  total_waste_evacuated_qty: string;
  total_coating_inspections: number;
  passed_coating_inspections: number;
  total_man_hours: string;
  total_equipment_hours: string;
};

export const tankWorksApi = {
  summary: () => apiRequest<TankWorksSummary>("/tankworks/summary/"),
  jobs: (params = "") =>
    apiRequest<Paginated<TankFieldJob>>(`/tankworks/jobs/${params ? `?${params}` : ""}`),
  job: (id: string) => apiRequest<TankFieldJob>(`/tankworks/jobs/${id}/`),
  createJob: (payload: Record<string, unknown>) =>
    apiRequest<TankFieldJob>("/tankworks/jobs/", { method: "POST", body: JSON.stringify(payload) }),
  transitionJob: (
    id: string,
    action: string,
    version: number,
    reason = "",
    permit_data?: { safepass_permit_ref?: string; gas_test_cleared?: boolean },
  ) =>
    apiRequest<TankFieldJob>(`/tankworks/jobs/${id}/actions/${action}/`, {
      method: "POST",
      body: JSON.stringify({ version, reason, permit_data }),
    }),
  manifests: (params = "") =>
    apiRequest<Paginated<SludgeWasteManifest>>(`/tankworks/manifests/${params ? `?${params}` : ""}`),
  recordManifest: (payload: Record<string, unknown>) =>
    apiRequest<SludgeWasteManifest>("/tankworks/manifests/", { method: "POST", body: JSON.stringify(payload) }),
  inspections: (params = "") =>
    apiRequest<Paginated<CoatingInspection>>(`/tankworks/inspections/${params ? `?${params}` : ""}`),
  recordInspection: (payload: Record<string, unknown>) =>
    apiRequest<CoatingInspection>("/tankworks/inspections/", { method: "POST", body: JSON.stringify(payload) }),
  utilization: (params = "") =>
    apiRequest<Paginated<CrewEquipmentUtilization>>(`/tankworks/utilization/${params ? `?${params}` : ""}`),
  logUtilization: (payload: Record<string, unknown>) =>
    apiRequest<CrewEquipmentUtilization>("/tankworks/utilization/", { method: "POST", body: JSON.stringify(payload) }),
};

export type ApprovedVendor = {
  id: string;
  vendor_code: string;
  vendor_name: string;
  category: "tubulars" | "valves" | "structural" | "fittings_flanges" | "services";
  status: "active" | "probation" | "blacklisted";
  audit_rating: "A" | "B" | "C";
  nogic_jqs_id: string;
  nuprc_permit_ref: string;
  iso_certification: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  created_at: string;
};

export type MaterialRequisition = {
  id: string;
  requisition_number: string;
  project_name: string;
  client_name: string;
  wbs_code: string;
  priority: "routine" | "urgent" | "emergency";
  status: "draft" | "submitted" | "approved" | "rejected" | "fulfilled" | "cancelled";
  required_date: string;
  delivery_location: string;
  estimated_cost_minor: number;
  currency: string;
  version: number;
  requested_by_name: string;
  approved_by_name: string | null;
  approved_at: string | null;
  notes: string;
  allowed_actions: string[];
  created_at: string;
};

export type PipeYardItem = {
  id: string;
  item_tag: string;
  material_type: "line_pipe" | "casing_tubing" | "structural" | "flanges_fittings" | "valves" | "consumables";
  grade_specification: string;
  outer_diameter_inches: string | null;
  wall_thickness_mm: string | null;
  schedule: string;
  length_meters: string;
  quantity: string;
  unit_of_measure: string;
  heat_number: string;
  mill_manufacturer: string;
  mtc_number: string;
  mtc_type: "en_10204_3_1" | "en_10204_3_2" | "standard_mill";
  yield_strength_mpa: string | null;
  tensile_strength_mpa: string | null;
  impact_test_joules: string | null;
  yard_location: string;
  bay_rack_position: string;
  qr_tag: string;
  status: "available" | "reserved" | "issued" | "quarantine";
  vendor_id: string | null;
  vendor_name: string | null;
  reservation_id: string | null;
  reservation_number: string | null;
  unit_cost_minor: number;
  currency: string;
  nigerian_content_percent: string;
  notes: string;
  created_at: string;
};

export type MaterialIssueSlipItem = {
  id: string;
  yard_item_id: string;
  item_tag: string;
  material_type: string;
  grade_specification: string;
  heat_number: string;
  quantity_issued: string;
  unit_of_measure: string;
  notes: string;
};

export type MaterialIssueSlip = {
  id: string;
  issue_slip_number: string;
  requisition_id: string;
  requisition_number: string;
  issued_to: string;
  contractor_name: string;
  issued_date: string;
  receiver_signature_ref: string;
  issued_by_name: string;
  items: MaterialIssueSlipItem[];
  notes: string;
  created_at: string;
};

export type NigerianContentReport = {
  organization_name: string;
  generated_at: string;
  inventory_summary: {
    total_unique_tags: number;
    total_quantity_stock: string;
    total_inventory_value_minor: number;
    overall_nigerian_content_percent: string;
  };
  mtc_compliance: {
    mtc_3_1_or_3_2_coverage_percent: string;
    breakdown: { mtc_type: string; count: number }[];
  };
  material_type_distribution: {
    material_type: string;
    count: number;
    total_qty: string;
  }[];
  vendor_governance: {
    total_approved_vendors: number;
    active_qualified_vendors: number;
    nogic_jqs_registered_vendors: number;
  };
};

export type EpcLinkSummary = {
  total_yard_items: number;
  available_yard_items: number;
  reserved_yard_items: number;
  total_requisitions: number;
  pending_requisitions: number;
  approved_requisitions: number;
  total_vendors: number;
  active_vendors: number;
  total_issue_slips: number;
  overall_nigerian_content_percent: string;
};

export const epcLinkApi = {
  summary: () => apiRequest<EpcLinkSummary>("/epclink/summary/"),
  vendors: (params = "") =>
    apiRequest<Paginated<ApprovedVendor>>(`/epclink/vendors/${params ? `?${params}` : ""}`),
  createVendor: (payload: Record<string, unknown>) =>
    apiRequest<ApprovedVendor>("/epclink/vendors/", { method: "POST", body: JSON.stringify(payload) }),
  requisitions: (params = "") =>
    apiRequest<Paginated<MaterialRequisition>>(`/epclink/requisitions/${params ? `?${params}` : ""}`),
  requisition: (id: string) => apiRequest<MaterialRequisition>(`/epclink/requisitions/${id}/`),
  createRequisition: (payload: Record<string, unknown>) =>
    apiRequest<MaterialRequisition>("/epclink/requisitions/", { method: "POST", body: JSON.stringify(payload) }),
  transitionRequisition: (id: string, action: string, version: number, reason = "") =>
    apiRequest<MaterialRequisition>(`/epclink/requisitions/${id}/actions/${action}/`, {
      method: "POST",
      body: JSON.stringify({ version, reason }),
    }),
  yardItems: (params = "") =>
    apiRequest<Paginated<PipeYardItem>>(`/epclink/yard-items/${params ? `?${params}` : ""}`),
  yardItem: (id: string) => apiRequest<PipeYardItem>(`/epclink/yard-items/${id}/`),
  createYardItem: (payload: Record<string, unknown>) =>
    apiRequest<PipeYardItem>("/epclink/yard-items/", { method: "POST", body: JSON.stringify(payload) }),
  issueSlips: (params = "") =>
    apiRequest<Paginated<MaterialIssueSlip>>(`/epclink/issue-slips/${params ? `?${params}` : ""}`),
  issueMaterials: (payload: Record<string, unknown>) =>
    apiRequest<MaterialIssueSlip>("/epclink/issue-slips/", { method: "POST", body: JSON.stringify(payload) }),
  nigerianContentReport: () => apiRequest<NigerianContentReport>("/epclink/nigerian-content-report/"),
};


