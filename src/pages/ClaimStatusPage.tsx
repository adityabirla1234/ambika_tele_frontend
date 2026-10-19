import { Link, Navigate, useParams } from "react-router-dom";
import { ClaimOutcome } from "../features/customer-status/ClaimOutcome";
import { useClaimStatus } from "../features/customer-status/useClaimStatus";

export function ClaimStatusPage() {
  const { reference = "" } = useParams();
  const { data, error, slow, needsLookup, refresh } = useClaimStatus(reference, true);

  if (needsLookup) return <Navigate to="/status" replace state={{ expired: true }} />;

  return (
    <section>
      <h1>Your claim</h1>
      <p className="fieldlabel">Claim reference</p>
      <p className="reference">{reference}</p>

      {!data && !error && (
        <div className="statuscard" role="status" aria-live="polite">
          <p>{slow ? "Checking status… the server is waking up, this can take up to a minute." : "Checking status…"}</p>
        </div>
      )}

      {!data && error && (
        <div className="statuscard" role="alert">
          <p>
            {error.kind === "timeout"
              ? "The server is still waking up. We are trying again automatically."
              : error.message}{" "}
            <button type="button" className="linkbutton" onClick={refresh}>Try now</button>
          </p>
        </div>
      )}

      {data && <ClaimOutcome data={data} reference={reference} trouble={!!error} />}

      <p><Link to="/">Back to home</Link></p>
    </section>
  );
}
