import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client";

export interface PingResponse {
  status: string;
  service: string;
  time: string;
  rewardTiersConfigured: number;
}

export function usePing() {
  return useQuery({
    queryKey: ["ping"],
    queryFn: ({ signal }) => apiGet<PingResponse>("/api/public/ping", signal),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
