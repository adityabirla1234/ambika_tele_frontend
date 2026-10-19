import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client";

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
