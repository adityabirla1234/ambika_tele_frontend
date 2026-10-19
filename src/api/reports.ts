import { useQuery } from "@tanstack/react-query";
import { isAccessDenied } from "./admin";
import { apiGet } from "./client";

export type RunStatus = "PENDING" | "RUNNING" | "SENT" | "FAILED";

/** One monthly report run. Contains no customer data. */
export interface ReportRun {
  month: string; // YYYY-MM
  status: RunStatus;
  rowCount: number | null;
  attempts: number;
  lastError: string | null;
  startedAt: string;
  completedAt: string | null;
}

export function useReportRuns() {
  return useQuery({
    queryKey: ["manager-report-runs"],
    queryFn: ({ signal }) => apiGet<ReportRun[]>("/api/product-manager/reports/runs", signal),
    retry: (count, err) => !isAccessDenied(err) && count < 2,
    // Re-check now and then so a run that is still sending turns into Sent or Failed on its own.
    refetchInterval: (query) => (query.state.data?.some((r) => r.status === "RUNNING") ? 15_000 : false),
  });
}
