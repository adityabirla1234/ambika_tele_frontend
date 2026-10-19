import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost, apiPut } from "./client";
import { isAccessDenied } from "./admin";

export interface ProductSummary {
  id: number;
  category: string;
  brand: string;
  model: string;
  sku: string;
  active: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  updatedAt: string;
}

export interface RuleEntry {
  id: number;
  minPrice: number;
  maxPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  state: "CURRENT" | "SCHEDULED" | "PAST" | "REPLACED";
}

export interface AuditEntry {
  action: string;
  actor: string;
  changes: string | null;
  at: string;
}

export interface ProductDetail {
  product: ProductSummary;
  rules: RuleEntry[];
  history: AuditEntry[];
}

export interface ProductPage {
  items: ProductSummary[];
  page: number;
  totalPages: number;
  totalItems: number;
}

export interface ProductFilters {
  categories: string[];
  brands: string[];
}

export interface ProductPayload {
  category: string;
  brand: string;
  model: string;
  sku: string;
  minPrice?: number;
  maxPrice?: number;
  effectiveFrom?: string;
}

export interface Tier {
  id: number;
  purchaseMin: number;
  purchaseMax: number;
  rewardMin: number;
  rewardMax: number;
  active: boolean;
  effectiveFrom: string;
}

export type TierPayload = Pick<Tier, "purchaseMin" | "purchaseMax" | "rewardMin" | "rewardMax">;

const noRetryOnDenied = (count: number, err: unknown) => !isAccessDenied(err) && count < 2;
const BASE = "/api/product-manager";

export interface ProductQuery {
  q: string;
  category: string;
  brand: string;
  status: string;
  page: number;
}

export function useManagerProducts(f: ProductQuery) {
  const qs = new URLSearchParams({
    q: f.q, category: f.category, brand: f.brand, status: f.status, page: String(f.page),
  }).toString();
  return useQuery({
    queryKey: ["manager-products", f],
    queryFn: ({ signal }) => apiGet<ProductPage>(`${BASE}/products?${qs}`, signal),
    placeholderData: keepPreviousData,
    retry: noRetryOnDenied,
  });
}

export function useProductFilters() {
  return useQuery({
    queryKey: ["manager-filters"],
    queryFn: ({ signal }) => apiGet<ProductFilters>(`${BASE}/products/filters`, signal),
    retry: noRetryOnDenied,
  });
}

export function useManagerProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["manager-product", id],
    queryFn: ({ signal }) => apiGet<ProductDetail>(`${BASE}/products/${id}`, signal),
    enabled: Boolean(id),
    retry: noRetryOnDenied,
  });
}

function useAfterProductChange(id: string | undefined) {
  const qc = useQueryClient();
  return (detail: ProductDetail) => {
    qc.setQueryData(["manager-product", String(detail.product.id)], detail);
    if (id) qc.setQueryData(["manager-product", id], detail);
    void qc.invalidateQueries({ queryKey: ["manager-products"] });
    void qc.invalidateQueries({ queryKey: ["manager-filters"] });
  };
}

export function useSaveProduct(id: string | undefined) {
  const after = useAfterProductChange(id);
  return useMutation({
    mutationFn: (body: ProductPayload) =>
      id ? apiPut<ProductDetail>(`${BASE}/products/${id}`, body) : apiPost<ProductDetail>(`${BASE}/products`, body),
    onSuccess: after,
  });
}

export function useSetProductActive(id: string | undefined) {
  const after = useAfterProductChange(id);
  return useMutation({
    mutationFn: (active: boolean) => apiPatch<ProductDetail>(`${BASE}/products/${id}/status`, { active }),
    onSuccess: after,
  });
}

export function useTiers() {
  return useQuery({
    queryKey: ["manager-tiers"],
    queryFn: ({ signal }) => apiGet<Tier[]>(`${BASE}/reward-tiers`, signal),
    retry: noRetryOnDenied,
  });
}

export function useSaveTier(id: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TierPayload) =>
      id ? apiPut<Tier>(`${BASE}/reward-tiers/${id}`, body) : apiPost<Tier>(`${BASE}/reward-tiers`, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["manager-tiers"] }),
  });
}

export function useSetTierActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; active: boolean }) =>
      apiPatch<Tier>(`${BASE}/reward-tiers/${v.id}/status`, { active: v.active }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["manager-tiers"] }),
  });
}
