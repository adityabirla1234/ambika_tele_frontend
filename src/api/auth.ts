import { apiGet, apiPost } from "./client";

export type StaffRole = "CLAIM_ADMIN" | "PRODUCT_MANAGER";

export interface StaffProfile {
  email: string;
  roles: StaffRole[];
  mustChangePassword: boolean;
}

export interface LoginResponse extends StaffProfile {
  token: string;
  expiresAt: string;
}

export const loginRequest = (email: string, password: string) =>
  apiPost<LoginResponse>("/api/staff/auth/login", { email, password });

export const meRequest = () => apiGet<StaffProfile>("/api/staff/auth/me");

export const logoutRequest = () => apiPost<{ status: string }>("/api/staff/auth/logout", {});

export const changePasswordRequest = (currentPassword: string, newPassword: string) =>
  apiPost<{ status: string }>("/api/staff/auth/change-password", { currentPassword, newPassword });
