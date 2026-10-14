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
  return cookie("petroledger_csrftoken") || body.csrf_token;
}

function errorMessage(body: unknown) {
  if (!body || typeof body !== "object") return "The request could not be completed.";
  const fields = body as Record<string, unknown>;
  const first = Object.values(fields).flatMap((value) => (Array.isArray(value) ? value : [value]))[0];
  return typeof first === "string" ? first : "The request could not be completed.";
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
    throw new ApiError(errorMessage(body), response.status, (body ?? {}) as Record<string, string[]>);
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
