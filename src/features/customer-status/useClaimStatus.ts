import { useCallback, useEffect, useState } from "react";
import { ClaimStatusData, fetchClaimStatus } from "../../api/claims";
import { ApiRequestError } from "../../api/client";
import { clearClaimToken, loadClaimToken } from "../../lib/claimToken";

const POLL_MS = 5_000;
const MAX_BACKOFF_MS = 60_000;
const SLOW_AFTER_MS = 4_000;

export interface ClaimStatusState {
  data: ClaimStatusData | null;
  /** Last request failed. While data is null this is the cold-start / retrying state. */
  error: ApiRequestError | null;
  /** First request is taking long: the free server is probably waking up. */
  slow: boolean;
  /** No valid token for this claim: send the customer to the lookup form. */
  needsLookup: boolean;
  refresh: () => void;
}

/**
 * Loads a claim's status. With poll=true it repeats about every 5 seconds while the claim is pending.
 * - one request at a time: the next one is scheduled only after the previous one finishes
 * - stops on any non-pending status, and pauses while the tab is hidden (resumes when it is shown again)
 * - after an error the delay doubles, up to a minute, and resets on success
 * - read-only: the endpoint it calls never creates or changes a reward
 */
export function useClaimStatus(reference: string, poll: boolean): ClaimStatusState {
  const [data, setData] = useState<ClaimStatusData | null>(null);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [slow, setSlow] = useState(false);
  const [needsLookup, setNeedsLookup] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const token = loadClaimToken(reference);
    if (!token) {
      setNeedsLookup(true);
      return;
    }
    setNeedsLookup(false);

    let cancelled = false;
    let inFlight = false;
    let finished = false;
    let failures = 0;
    let timer: number | undefined;
    const controller = new AbortController();

    const schedule = (ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, ms);
    };

    async function run() {
      timer = undefined;
      if (cancelled || finished || inFlight) return;
      if (document.hidden) return; // the visibilitychange handler restarts us
      inFlight = true;
      const slowTimer = window.setTimeout(() => !cancelled && setSlow(true), SLOW_AFTER_MS);
      try {
        const next = await fetchClaimStatus(reference, token as string, controller.signal);
        if (cancelled) return;
        failures = 0;
        setError(null);
        setData(next);
        if (!poll || next.status !== "PENDING_REVIEW") {
          finished = true;
          return;
        }
        schedule(POLL_MS);
      } catch (e) {
        if (cancelled) return;
        const err = e instanceof ApiRequestError ? e : new ApiRequestError("network", "Something went wrong.");
        if (err.status === 401) {
          clearClaimToken(reference);
          setNeedsLookup(true);
          finished = true;
          return;
        }
        failures += 1;
        setError(err);
        schedule(Math.min(POLL_MS * 2 ** failures, MAX_BACKOFF_MS));
      } finally {
        window.clearTimeout(slowTimer);
        inFlight = false;
        if (!cancelled) setSlow(false);
      }
    }

    const onVisible = () => {
      if (!document.hidden && !finished && !inFlight && timer === undefined) void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    void run();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reference, poll, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, slow, needsLookup, refresh };
}
