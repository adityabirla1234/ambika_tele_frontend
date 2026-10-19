import { FormEvent, useState } from "react";
import { ApiRequestError } from "../api/client";
import { DeviceStatus, useCheckDevice, useReleaseDevice } from "../api/devices";
import { dateOnly, statusLabel } from "../lib/format";

const REWARD_LABEL: Record<string, string> = {
  ASSIGNED: "Approved, customer has not scratched the card yet",
  REVEALED: "Customer has scratched the card, not paid yet",
  REDEEMED: "Reward paid",
};

function message(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : "Something went wrong. Please try again.";
}

/** For a device the shop bought back and is selling again: lets the next buyer claim a reward for it. */
export function ReleaseDevicePage() {
  const check = useCheckDevice();
  const release = useReleaseDevice();
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState<DeviceStatus | null>(null);
  const [released, setReleased] = useState(false);
  const [secondHand, setSecondHand] = useState(false);
  const [reason, setReason] = useState("");

  function onIdentifierChange(value: string) {
    setIdentifier(value);
    setResult(null);
    setReleased(false);
    check.reset();
    release.reset();
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setReleased(false);
    setSecondHand(false);
    setReason("");
    release.reset();
    check.mutate(identifier.trim(), { onSuccess: (d) => setResult(d) });
  }

  function onRelease() {
    release.mutate(
      { deviceIdentifier: identifier.trim(), secondHand, reason: reason.trim() },
      { onSuccess: () => { setReleased(true); setResult(null); } },
    );
  }

  return (
    <section>
      <h1>Second-hand sale</h1>
      <p className="lead">
        If the shop bought a sold phone or appliance back and is selling it again, release it here so the next buyer can
        claim a reward. Search by the IMEI 1 (dial *#06# on the phone) or the serial number, not by SKU: many devices
        share one SKU, but each device number is unique.
      </p>

      <form onSubmit={onSearch} className="searchrow" role="search">
        <input
          value={identifier}
          onChange={(e) => onIdentifierChange(e.target.value)}
          placeholder="IMEI 1 or serial number"
          aria-label="IMEI 1 or serial number"
          autoComplete="off"
          inputMode="text"
        />
        <button type="submit" className="primary" disabled={check.isPending || identifier.trim() === ""}>
          {check.isPending ? "Searching…" : "Find"}
        </button>
      </form>

      {check.isError && <p className="fielderror" role="alert">{message(check.error)}</p>}

      {released && (
        <div className="notice" role="status">
          Released. The next buyer can now register this device and claim a reward. The first claim stays on record.
        </div>
      )}

      {result && !result.registered && (
        <div className="statuscard" role="status">
          No claim uses this device number, so a new claim is already allowed. Nothing to release.
        </div>
      )}

      {result?.registered && (
        <div className="statuscard">
          <p><strong>{result.productName}</strong> <span className="muted">· {result.sku}</span></p>
          <p className="muted">
            First claim {result.claimReference} · {statusLabel(result.claimStatus ?? "")}
            {result.purchaseDate ? ` · bought ${dateOnly(result.purchaseDate)}` : ""}
          </p>
          {result.rewardState && <p className="muted">{REWARD_LABEL[result.rewardState] ?? result.rewardState}</p>}
        </div>
      )}

      {result?.registered && !result.canRelease && (
        <div className="notice" role="alert">{result.blockedReason}</div>
      )}

      {result?.registered && result.canRelease && (
        <div className="claimform actionbox">
          <h2>Release this device</h2>
          <p className="muted">
            The old claim and its reward stay on record. Only the block on a new claim for this device is removed.
          </p>
          <label className="checkrow">
            <input type="checkbox" checked={secondHand} onChange={(e) => setSecondHand(e.target.checked)} />
            <span>This is a second-hand sale. The shop bought this device back from the earlier customer.</span>
          </label>
          <label className="field">
            <span className="fieldlabel">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="For example: bought back on 12 Oct, selling as second-hand"
            />
          </label>
          {release.isError && <p className="fielderror" role="alert">{message(release.error)}</p>}
          <button
            type="button"
            className="primary"
            disabled={release.isPending || !secondHand || reason.trim() === ""}
            onClick={onRelease}
          >
            {release.isPending ? "Releasing…" : "Release for second-hand sale"}
          </button>
        </div>
      )}
    </section>
  );
}
