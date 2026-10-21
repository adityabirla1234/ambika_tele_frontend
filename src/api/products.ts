import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "./client";

export interface PublicProduct {
  id: number;
  category: string;
  brand: string;
  model: string;
}

export function useProducts() {
  return useQuery({
    queryKey: ["public-products"],
    queryFn: ({ signal }) => apiGet<PublicProduct[]>("/api/public/products", signal),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

/** The customer types the IMEI or serial number and gets the product it belongs to. */
export function lookupProductByDevice(deviceIdentifier: string) {
  return apiPost<PublicProduct>("/api/public/products/lookup", { deviceIdentifier });
}
