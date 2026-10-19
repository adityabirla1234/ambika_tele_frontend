import { clearAuthToken, getAuthToken } from "../lib/authToken";

// The localhost fallback exists only in a dev build; a production build requires VITE_API_BASE_URL (see vite.config.ts).
const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? (import.meta.env.DEV ? "http://localhost:8080" : "");
const TIMEOUT_MS = 20_000; // Render Free can take a while to wake up.

/** Fired when the server says the staff session is no longer valid, so the app can show the sign-in screen. */
export const SESSION_ENDED_EVENT = "staff-session-ended";

export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiRequestError extends Error {
  constructor(
    public readonly kind: "timeout" | "network" | "http",
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly fields: FieldIssue[] = [],
  ) {
    super(message);
  }
}

interface ServerError {
  code?: string;
  message?: string;
  fields?: FieldIssue[];
}

const LOGIN_PATH = "/api/staff/auth/login";

function isStaffPath(path: string): boolean {
  return (
    path.startsWith("/api/admin") ||
    path.startsWith("/api/product-manager") ||
    (path.startsWith("/api/staff/") && path !== LOGIN_PATH)
  );
}

async function request<T>(path: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort());
  try {
    const staff = isStaffPath(path);
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    const token = staff ? getAuthToken() : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: "omit", // no cookies anywhere: the staff token goes in the Authorization header
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ServerError;
      // 401 on a staff route = the session ended (idle, expired, signed out elsewhere, password changed).
      // Only a 401 does this: a 500 or a network error during an outage must NOT sign anyone out.
      if (res.status === 401 && staff) {
        clearAuthToken();
        window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
      }
      throw new ApiRequestError("http", body.message ?? "Request failed.", res.status, body.code, body.fields ?? []);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    if (timedOut) {
      throw new ApiRequestError("timeout", "The server is taking longer than usual to respond.");
    }
    throw new ApiRequestError("network", "Could not reach the server. Check your connection.");
  } finally {
    clearTimeout(timer);
  }
}

export function apiGet<T>(path: string, signal?: AbortSignal, headers: Record<string, string> = {}): Promise<T> {
  return request<T>(path, { headers: { Accept: "application/json", ...headers } }, signal);
}

export function apiPost<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function send<T>(method: "PUT" | "PATCH", path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const apiPut = <T>(path: string, body: unknown) => send<T>("PUT", path, body);
export const apiPatch = <T>(path: string, body: unknown) => send<T>("PATCH", path, body);

/** POST with no body (used by the scratch card, which sends only the claim token header). */
export function apiPostEmpty<T>(path: string, headers: Record<string, string> = {}): Promise<T> {
  return request<T>(path, { method: "POST", headers: { Accept: "application/json", ...headers } });
}
