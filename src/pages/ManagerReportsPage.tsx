import { isAccessDenied } from "../api/admin";
import { ApiRequestError } from "../api/client";
import { ReportRun, RunStatus, useReportRuns } from "../api/reports";
import { dateTime } from "../lib/format";

const STATUS_LABEL: Record<RunStatus, string> = {
  PENDING: "Waiting",
  RUNNING: "Sending…",
  SENT: "Sent",
  FAILED: "Failed",
};

function badgeClass(status: RunStatus): string {
  if (status === "SENT") return "badge badge-APPROVED";
  if (status === "FAILED") return "badge badge-REJECTED";
  return "badge badge-PENDING_REVIEW";
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function RunRow({ run }: { run: ReportRun }) {
  return (
    <li className="claimrow">
      <span className="claimrow-main">
        <strong>{monthLabel(run.month)}</strong>
        <span className={badgeClass(run.status)}>{STATUS_LABEL[run.status]}</span>
        {run.status === "SENT" && run.rowCount !== null && (
          <span>{run.rowCount} new customer{run.rowCount === 1 ? "" : "s"} in the PDF</span>
        )}
        {run.status === "FAILED" && run.lastError && <span className="muted">{run.lastError}</span>}
      </span>
      <span className="claimrow-side">
        <span className="muted">{run.completedAt ? dateTime(run.completedAt) : dateTime(run.startedAt)}</span>
        <span className="muted">{run.attempts} attempt{run.attempts === 1 ? "" : "s"}</span>
      </span>
    </li>
  );
}

export function ManagerReportsPage() {
  const runs = useReportRuns();

  if (runs.isError && isAccessDenied(runs.error)) {
    return (
      <section>
        <h1>No access</h1>
        <p className="lead">Your account is not set up to view reports. Ask the owner to add your email.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Monthly reports</h1>
      <p className="lead">
        On the 1st of each month a PDF of the customers who registered for the first time that month (name and phone
        only) is sent to the private Telegram channel. This screen only shows whether it went out; nothing here sends
        or changes a report.
      </p>

      {runs.isPending && <p className="statuscard" role="status">Loading…</p>}
      {runs.isError && (
        <p className="statuscard" role="alert">
          {runs.error instanceof ApiRequestError ? runs.error.message : "Could not load report runs."}{" "}
          <button className="linkbutton" onClick={() => runs.refetch()}>Try again</button>
        </p>
      )}
      {runs.data && runs.data.length === 0 && (
        <div className="notice" role="status">No report has been sent yet. The first one goes out after the first month ends.</div>
      )}
      <ul className="claimlist">
        {runs.data?.map((r) => <RunRow key={r.month} run={r} />)}
      </ul>
    </section>
  );
}
