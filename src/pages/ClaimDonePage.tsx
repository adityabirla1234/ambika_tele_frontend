import { useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import type { ClaimResult } from "../api/claims";
import { ClaimOutcome } from "../features/customer-status/ClaimOutcome";
import { useClaimStatus } from "../features/customer-status/useClaimStatus";
import { saveClaimToken } from "../lib/claimToken";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function ClaimDonePage() {
  const result = useLocation().state as ClaimResult | null;
  useEffect(() => {
    if (result?.statusToken) saveClaimToken(result.claimReference, result.statusToken);
  }, [result]);
  // Declared after the effect above, so the token is saved before the first status request reads it.
  const live = useClaimStatus(result?.claimReference ?? "", true);
  if (!result) return <Navigate to="/" replace />;
  const data = live.data;

  return (
    <section>
      <h1>Claim received</h1>
      <p className="lead">
        Thank you. Our team will check your bill and update your claim. The result appears below as soon as it is ready.
      </p>

      <div className="statuscard">
        <p className="fieldlabel">Your claim reference</p>
        <p className="reference">{result.claimReference}</p>
      </div>

      {data ? (
        <ClaimOutcome data={data} reference={result.claimReference} trouble={!!live.error} />
      ) : (
        <div className="statuscard" role="status" aria-live="polite">
          <p><span className="badge badge-PENDING_REVIEW">Waiting for review</span></p>
          <p className="fieldhint">
            {live.slow ? "Checking status… the server is waking up, this can take a minute." : "We will show the result here as soon as it is ready."}
          </p>
        </div>
      )}

      {data?.status !== "REJECTED" && (
      <div className="statuscard rangecard">
        <p className="fieldlabel">Your reward range</p>
        <p className="range">₹{inr.format(result.rewardMin)} to ₹{inr.format(result.rewardMax)}</p>
        <p className="fieldhint">
          Once your claim is approved, visit Ambika Telecom to collect your reward. The shop owner confirms the exact amount.
        </p>
      </div>
      )}

      <p>
        <Link to={`/status/${encodeURIComponent(result.claimReference)}`} className="primary linkcta">Check my claim status</Link>
      </p>
      <p><Link to="/">Back to home</Link></p>
    </section>
  );
}
