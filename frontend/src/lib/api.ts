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
