import { Link } from "react-router-dom";
import type { ClaimStatusData } from "../../api/claims";

/** What the customer sees for a claim, depending on its status. Used on the "claim received" page and the status page. */
export function ClaimOutcome({ data, reference, trouble }: { data: ClaimStatusData; reference: string; trouble?: boolean }) {
  if (data.status === "PENDING_REVIEW") {
    return (
      <div className="statuscard" role="status" aria-live="polite">
        <p><span className="badge badge-PENDING_REVIEW">Waiting for review</span></p>
        <p>
          Thank you for your patience. Our team is checking your bill. This page updates by itself, so you can keep
          it open or come back later.
        </p>
        {trouble && <p className="fieldhint">Having trouble reaching the server. Still trying…</p>}
      </div>
    );
  }

  if (data.status === "REJECTED") {
    return (
      <div className="statuscard" role="status" aria-live="polite">
        <p><span className="badge badge-REJECTED">Not approved</span></p>
        <p className="fieldlabel">Reason from our team</p>
        <p>{data.rejectionReason ?? "Please speak to our team at Ambika Telecom."}</p>
        <p className="fieldhint">If you think this is a mistake, please visit or speak to our team at Ambika Telecom.</p>
      </div>
    );
  }

  return (
    <div className="statuscard rangecard" role="status" aria-live="polite">
      <p><span className="badge badge-APPROVED">Approved</span></p>
      {data.rewardState === "REDEEMED" ? (
        <p><strong>Reward collected.</strong> Thank you for shopping with Ambika Telecom.</p>
      ) : (
        <>
          <p>Good news, your claim is approved.</p>
          <p>
            <Link to={`/status/${encodeURIComponent(reference)}/scratch`} className="primary linkcta">
              {data.rewardState === "REVEALED" ? "View my reward" : "Claim reward"}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
