import { apiGet, apiPost, apiPostEmpty } from "./client";

export interface ClaimPayload {
  productId: number;
  purchasePrice: number;
  purchaseDate: string;
  invoiceNumber?: string;
  deviceIdentifier: string;
  customerName: string;
  phone: string;
  consent: true;
}

export interface ClaimResult {
  claimReference: string;
  status: string;
  rewardMin: number;
  rewardMax: number;
  statusToken: string;
}

export function submitClaim(payload: ClaimPayload, idempotencyKey: string) {
  return apiPost<ClaimResult>("/api/public/claims", payload, { "Idempotency-Key": idempotencyKey });
}

export type RewardState = "ASSIGNED" | "REVEALED" | "REDEEMED";

/** What the public status page may see. No personal data and no device identifier. */
export interface ClaimStatusData {
  claimReference: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  rewardMin: number;
  rewardMax: number;
  rewardState: RewardState | null;
  statusToken: string | null;
}

const TOKEN_HEADER = "X-Claim-Token";

/** The identifier travels in the POST body only, never in a URL. */
export function lookupClaimStatus(deviceIdentifier: string) {
  return apiPost<ClaimStatusData>("/api/public/claims/status-lookup", { deviceIdentifier });
}

export function fetchClaimStatus(reference: string, token: string, signal?: AbortSignal) {
  return apiGet<ClaimStatusData>(
    `/api/public/claims/${encodeURIComponent(reference)}/status`, signal, { [TOKEN_HEADER]: token });
}

export function scratchClaim(reference: string, token: string) {
  return apiPostEmpty<ClaimStatusData>(
    `/api/public/claims/${encodeURIComponent(reference)}/scratch`, { [TOKEN_HEADER]: token });
}
