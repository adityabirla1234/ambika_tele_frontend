import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ClaimStatusData, scratchClaim } from "../api/claims";
import { ApiRequestError } from "../api/client";
import { ScratchCard } from "../features/customer-status/ScratchCard";
import { useClaimStatus } from "../features/customer-status/useClaimStatus";
import { loadClaimToken } from "../lib/claimToken";
import { inr } from "../lib/format";

function RangeReveal({ data }: { data: ClaimStatusData }) {
  return (
    <div className="revealed">
      <p className="range">{inr(data.rewardMin)} to {inr(data.rewardMax)}</p>
      <p className="fieldhint">Visit Ambika Telecom to collect your reward</p>
    </div>
  );
}

export function ScratchPage() {
  const { reference = "" } = useParams();
  const { data, error, slow, needsLookup, refresh } = useClaimStatus(reference, false);
  const [revealed, setRevealed] = useState<ClaimStatusData | null>(null);

  const mutation = useMutation({
    mutationFn: () => scratchClaim(reference, loadClaimToken(reference) ?? ""),
    onSuccess: (result) => setRevealed(result),
  });
  const { mutate } = mutation;
  const onScratched = useCallback(() => mutate(), [mutate]);

  if (needsLookup) return <Navigate to="/status" replace state={{ expired: true }} />;

  const back = <p><Link to={`/status/${encodeURIComponent(reference)}`}>Back to my claim</Link></p>;

  if (!data) {
    return (
      <section>
        <h1>Your reward</h1>
        <div className="statuscard" role="status" aria-live="polite">
          <p>
            {error
              ? <>{error.kind === "timeout" ? "The server is still waking up. Trying again." : error.message}{" "}
                  <button type="button" className="linkbutton" onClick={refresh}>Try now</button></>
              : slow ? "Checking status… the server is waking up, this can take up to a minute." : "Checking status…"}
          </p>
        </div>
      </section>
    );
  }

  if (data.status !== "APPROVED") {
    return (
      <section>
        <h1>Your reward</h1>
        <div className="statuscard"><p>Your reward is not ready yet. It appears here once your claim is approved.</p></div>
        {back}
      </section>
    );
  }

  if (data.rewardState === "REDEEMED") {
    return (
      <section>
        <h1>Your reward</h1>
        <div className="statuscard rangecard"><p><strong>Reward collected.</strong> Thank you for shopping with Ambika Telecom.</p></div>
        {back}
      </section>
    );
  }

  const alreadyRevealed = data.rewardState === "REVEALED";
  const scratchError = mutation.error instanceof ApiRequestError ? mutation.error.message
    : mutation.error ? "Something went wrong. Please try again." : null;

  return (
    <section>
      <h1>Your reward</h1>
      {alreadyRevealed ? (
        <div className="statuscard rangecard"><RangeReveal data={data} /></div>
      ) : (
        <>
          <p className="lead">Scratch the card with your finger to see your reward range.</p>
          <ScratchCard
            reveal={revealed ? <RangeReveal data={revealed} /> : null}
            cleared={revealed !== null}
            onScratched={onScratched}
          />
          {scratchError && (
            <div className="notice" role="alert">
              {scratchError}{" "}
              <button type="button" className="linkbutton" onClick={() => mutate()}>Try again</button>
            </div>
          )}
        </>
      )}
      {back}
    </section>
  );
}
