import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError, apiGet, apiPost } from "./client";

export interface ClaimSummary {
  id: number;
  claimReference: string;
  status: string;
  customerName: string;
  productName: string;
  purchasePrice: number;
  invoiceNumber: string | null;
  submittedAt: string;
  rewardMin: number;
  rewardMax: number;
}

export interface ClaimPage {
  items: ClaimSummary[];
  page: number;
  totalPages: number;
  totalItems: number;
}

export interface ReviewEntry {
  decision: string;
  reason: string | null;
  reviewer: string;
  at: string;
}

export interface RewardInfo {
  state: string;
  rewardMin: number;
  rewardMax: number;
  paidAmount: number | null;
  paidBy: string | null;
  paidAt: string | null;
}

export interface ClaimDetail {
  id: number;
  claimReference: string;
  status: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  productCategory: string;
  purchasePrice: number;
  purchaseDate: string;
  invoiceNumber: string | null;
  otherClaimsWithSameInvoice: number;
  deviceLabel: string;
  deviceIdentifier: string;
  rewardMin: number;
  rewardMax: number;
  submittedAt: string;
  reward: RewardInfo | null;
  history: ReviewEntry[];
  personalDataErased: boolean;
}

export function isAccessDenied(err: unknown): boolean {
  return err instanceof ApiRequestError && (err.status === 401 || err.status === 403);
}

const noRetryOnDenied = (count: number, err: unknown) => !isAccessDenied(err) && count < 2;

export function useAdminClaims(status: string, q: string, page: number) {
  return useQuery({
    queryKey: ["admin-claims", status, q, page],
    // The search text (a name, phone or invoice number) goes in the POST body, never in the URL.
    queryFn: () => apiPost<ClaimPage>("/api/admin/claims/search", { status, q, page }),
    placeholderData: keepPreviousData,
    retry: noRetryOnDenied,
  });
}

export function useAdminClaim(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-claim", id],
    queryFn: ({ signal }) => apiGet<ClaimDetail>(`/api/admin/claims/${id}`, signal),
    enabled: Boolean(id),
    retry: noRetryOnDenied,
  });
}

export type ClaimAction = "approve" | "reject" | "reopen" | "mark-paid" | "correct-device" | "erase-personal-data";

export function useClaimAction(id: string | undefined, action: ClaimAction) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<ClaimDetail>(`/api/admin/claims/${id}/${action}`, body),
    onSuccess: (detail) => {
      qc.setQueryData(["admin-claim", id], detail);
      void qc.invalidateQueries({ queryKey: ["admin-claims"] });
    },
  });
}
