import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiRequestError, SESSION_ENDED_EVENT } from "../api/client";
import { changePasswordRequest, loginRequest, logoutRequest, meRequest, StaffProfile } from "../api/auth";
import { clearAuthToken, getAuthToken, setAuthToken } from "../lib/authToken";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "unavailable" } // the server could not be reached; we do not know whether the session is still valid
  | { status: "authenticated"; profile: StaffProfile };

interface AuthApi {
  state: AuthState;
  /** True after the server ended a session, so the sign-in page can explain why. */
  sessionEnded: boolean;
  login(email: string, password: string): Promise<StaffProfile>;
  logout(): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
  retry(): void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => (getAuthToken() ? { status: "loading" } : { status: "anonymous" }));
  const [sessionEnded, setSessionEnded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // On start (and on retry), find out whether a stored token is still valid.
  useEffect(() => {
    if (!getAuthToken()) return;
    let cancelled = false;
    setState({ status: "loading" });
    meRequest()
      .then((profile) => !cancelled && setState({ status: "authenticated", profile }))
      .catch((err: unknown) => {
        if (cancelled) return;
        // A 401 already cleared the token (see client.ts). Anything else is an outage, not a sign-out.
        if (err instanceof ApiRequestError && err.status === 401) setState({ status: "anonymous" });
        else setState({ status: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    const onEnded = () => {
      setSessionEnded(true);
      setState({ status: "anonymous" });
    };
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginRequest(email, password);
    setAuthToken(res.token);
    const profile: StaffProfile = { email: res.email, roles: res.roles, mustChangePassword: res.mustChangePassword };
    setSessionEnded(false);
    setState({ status: "authenticated", profile });
    return profile;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      /* even if the server cannot be reached, this browser forgets the token */
    }
    clearAuthToken();
    setSessionEnded(false);
    setState({ status: "anonymous" });
  }, []);

  const changePassword = useCallback(async (current: string, next: string) => {
    await changePasswordRequest(current, next);
    setState((s) => (s.status === "authenticated" ? { status: "authenticated", profile: { ...s.profile, mustChangePassword: false } } : s));
  }, []);

  const value = useMemo<AuthApi>(
    () => ({ state, sessionEnded, login, logout, changePassword, retry: () => setAttempt((n) => n + 1) }),
    [state, sessionEnded, login, logout, changePassword],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Where a person lands after signing in. */
export function homeFor(profile: StaffProfile): string {
  if (profile.mustChangePassword) return "/staff/change-password";
  return profile.roles.includes("CLAIM_ADMIN") ? "/admin" : "/manager";
}
