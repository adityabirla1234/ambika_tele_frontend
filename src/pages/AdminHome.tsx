import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { isAccessDenied, useAdminClaims } from "../api/admin";
import { dateTime, inr, statusLabel } from "../lib/format";

const TABS = [
  { value: "PENDING_REVIEW", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

export function AdminHome() {
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const claims = useAdminClaims(status, q, page);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setQ(draft.trim());
  }

  if (claims.isError && isAccessDenied(claims.error)) {
    return (
      <section>
        <h1>No access</h1>
        <p className="lead">Your account is not set up to review claims. Ask the owner to add your email.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Claims</h1>

      <div className="tabs" role="tablist" aria-label="Claim status">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={status === t.value}
            className={status === t.value ? "tab active" : "tab"}
            onClick={() => { setStatus(t.value); setPage(0); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSearch} className="searchrow" role="search">
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search reference, name, phone or invoice"
          aria-label="Search claims"
        />
        <button type="submit" className="primary">Search</button>
      </form>

      {claims.isPending && <p className="statuscard" role="status">Loading claims…</p>}
      {claims.isError && !isAccessDenied(claims.error) && (
        <p className="statuscard" role="alert">
          {claims.error instanceof ApiRequestError ? claims.error.message : "Could not load claims."}{" "}
          <button className="linkbutton" onClick={() => claims.refetch()}>Try again</button>
        </p>
      )}

      {claims.data && claims.data.items.length === 0 && (
        <p className="statuscard">No claims here yet.</p>
      )}

      <ul className="claimlist">
        {claims.data?.items.map((c) => (
          <li key={c.id}>
            <Link to={`/admin/claims/${c.id}`} className="claimrow">
              <span className="claimrow-main">
                <strong>{c.customerName}</strong>
                <span>{c.productName}</span>
                <span className="muted">{c.claimReference} · {dateTime(c.submittedAt)}</span>
              </span>
              <span className="claimrow-side">
                <span>{inr(c.purchasePrice)}</span>
                <span className={`badge badge-${c.status}`}>{statusLabel(c.status)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {claims.data && claims.data.totalPages > 1 && (
        <div className="pager">
          <button className="linkbutton" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {claims.data.page + 1} of {claims.data.totalPages}</span>
          <button
            className="linkbutton"
            disabled={page + 1 >= claims.data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
