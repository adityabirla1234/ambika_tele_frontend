import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { ClaimDetail, isAccessDenied, useAdminClaim, useClaimAction } from "../api/admin";
import { dateOnly, dateTime, inr, statusLabel } from "../lib/format";

type Panel = null | "approve" | "reject" | "reopen" | "reapprove" | "paid" | "device" | "erase";

export function AdminClaimPage() {
  const { id } = useParams();
  const claim = useAdminClaim(id);

  if (claim.isPending) return <p className="statuscard" role="status">Loading claim…</p>;
  if (claim.isError) {
    return (
      <section>
        <p><Link to="/admin">Back to claims</Link></p>
        <p className="statuscard" role="alert">
          {isAccessDenied(claim.error)
            ? "Your account is not set up to review claims."
            : claim.error instanceof ApiRequestError ? claim.error.message : "Could not load this claim."}
        </p>
      </section>
    );
  }
  return <ClaimView claim={claim.data} id={id} />;
}

function ClaimView({ claim, id }: { claim: ClaimDetail; id: string | undefined }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [deviceId, setDeviceId] = useState("");

  const approve = useClaimAction(id, "approve");
  const reject = useClaimAction(id, "reject");
  const reopen = useClaimAction(id, "reopen");
  const pay = useClaimAction(id, "mark-paid");
  const correct = useClaimAction(id, "correct-device");
  const erase = useClaimAction(id, "erase-personal-data");
  const active = { approve, reject, reopen, reapprove: approve, paid: pay, device: correct, erase }[panel ?? "approve"];

  function close() {
    setPanel(null);
    setText("");
    setAmount("");
    setDeviceId("");
    approve.reset(); reject.reset(); reopen.reset(); pay.reset(); correct.reset(); erase.reset();
  }

  function open(next: Panel) {
    close();
    setPanel(next);
  }

  // A rejected claim cannot be approved directly: the server only allows REJECTED -> PENDING_REVIEW (reopen) and
  // then PENDING_REVIEW -> APPROVED. This does both steps in order, so the history shows the reopen with its reason
  // followed by the approval. If the approval fails, the claim is left pending and the error is shown here.
  async function approveRejected() {
    try {
      await reopen.mutateAsync({ reason: text.trim() });
      await approve.mutateAsync({});
      close();
    } catch {
      /* the error is shown under the buttons */
    }
  }

  const paidNumber = Number(amount);
  const outsideRange = amount !== "" && (paidNumber < claim.rewardMin || paidNumber > claim.rewardMax);
  const isImei = claim.deviceLabel === "IMEI 1";
  const deviceDigits = deviceId.replace(/[\s-]/g, "");
  const deviceLooksValid = isImei ? /^\d{15}$/.test(deviceDigits) : deviceDigits.length >= 4;
  const reward = claim.reward;
  const canPay = claim.status === "APPROVED" && reward !== null && reward.state !== "REDEEMED";
  const canErase = !claim.personalDataErased && (claim.status !== "APPROVED" || reward?.state === "REDEEMED");

  return (
    <section>
      <p><Link to="/admin">Back to claims</Link></p>
      <h1>{claim.customerName}</h1>
      <p className="lead">
        {claim.claimReference} · <span className={`badge badge-${claim.status}`}>{statusLabel(claim.status)}</span>
      </p>

      {claim.otherClaimsWithSameInvoice > 0 && (
        <div className="notice" role="alert">
          This invoice number appears on {claim.otherClaimsWithSameInvoice} other claim
          {claim.otherClaimsWithSameInvoice > 1 ? "s" : ""}. Check the bill carefully before approving.
        </div>
      )}

      <dl className="details">
        <dt>Product</dt><dd>{claim.productName}</dd>
        <dt>{claim.deviceLabel}</dt><dd className="mono">{claim.deviceIdentifier}</dd>
        <dt>Purchase price</dt><dd>{inr(claim.purchasePrice)}</dd>
        <dt>Purchase date</dt><dd>{dateOnly(claim.purchaseDate)}</dd>
        <dt>Invoice number</dt><dd>{claim.invoiceNumber ?? "Not given"}</dd>
        <dt>Mobile number</dt><dd>{claim.customerPhone}</dd>
        <dt>Reward range</dt><dd>{inr(claim.rewardMin)} to {inr(claim.rewardMax)}</dd>
        <dt>Submitted</dt><dd>{dateTime(claim.submittedAt)}</dd>
      </dl>

      {reward?.state === "REDEEMED" && (
        <div className="statuscard rangecard">
          <p className="fieldlabel">Reward paid</p>
          <p className="range">{reward.paidAmount !== null ? inr(reward.paidAmount) : ""}</p>
          <p className="fieldhint">
            {reward.paidBy} · {reward.paidAt ? dateTime(reward.paidAt) : ""}
          </p>
        </div>
      )}

      {panel === null && (
        <div className="actions">
          {claim.status === "PENDING_REVIEW" && (
            <>
              <button className="primary" onClick={() => open("approve")}>Approve</button>
              <button className="secondary" onClick={() => open("reject")}>Reject</button>
            </>
          )}
          {claim.status === "REJECTED" && (
            <>
              <button className="primary" onClick={() => open("reapprove")}>Approve this claim</button>
              <button className="secondary" onClick={() => open("reopen")}>Reopen for review</button>
            </>
          )}
          {canPay && <button className="primary" onClick={() => open("paid")}>Mark as paid</button>}
          {claim.status !== "APPROVED" && !claim.personalDataErased && (
            <button className="secondary" onClick={() => open("device")}>Correct {claim.deviceLabel}</button>
          )}
          {canErase && (
            <button className="secondary" onClick={() => open("erase")}>Erase personal data</button>
          )}
        </div>
      )}

      {claim.personalDataErased && (
        <div className="notice">Personal data for this claim has been erased. The claim, price and reward record remain.</div>
      )}

      {panel === "erase" && (
        <ActionBox
          title="Erase this customer's personal data?"
          hint="Removes the IMEI or serial number, the invoice number, the written reasons and, if this is the customer's only claim, their name and mobile number. This cannot be undone. The claim, price and reward record stay."
        >
          <Buttons
            confirm="Erase personal data"
            busy={erase.isPending}
            onConfirm={() => erase.mutate({}, { onSuccess: close })}
            onCancel={close}
          />
          <ErrorLine error={erase.error} />
        </ActionBox>
      )}

      {panel === "approve" && (
        <ActionBox title="Approve this claim?" hint="Only approve after checking the bill and the device.">
          <Buttons
            confirm="Confirm approval"
            busy={approve.isPending}
            onConfirm={() => approve.mutate({}, { onSuccess: close })}
            onCancel={close}
          />
          <ErrorLine error={active.error} />
        </ActionBox>
      )}

      {panel === "reapprove" && (
        <ActionBox
          title="Approve this rejected claim?"
          hint="The claim goes back to pending and is approved straight away. Say why you changed your decision. The history will show it."
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={3}
            aria-label="Reason for changing the decision"
          />
          <Buttons
            confirm="Confirm approval"
            busy={reopen.isPending || approve.isPending}
            disabled={text.trim() === ""}
            onConfirm={() => void approveRejected()}
            onCancel={close}
          />
          <ErrorLine error={reopen.error ?? approve.error} />
        </ActionBox>
      )}

      {(panel === "reject" || panel === "reopen") && (
        <ActionBox
          title={panel === "reject" ? "Reject this claim" : "Reopen this claim"}
          hint={panel === "reject"
            ? "The customer will see this reason."
            : "Say why this claim is being reopened. It goes back to pending."}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={3}
            aria-label="Reason"
          />
          <Buttons
            confirm={panel === "reject" ? "Confirm rejection" : "Confirm reopen"}
            busy={active.isPending}
            disabled={text.trim() === ""}
            onConfirm={() => active.mutate({ reason: text.trim() }, { onSuccess: close })}
            onCancel={close}
          />
          <ErrorLine error={active.error} />
        </ActionBox>
      )}

      {panel === "paid" && (
        <ActionBox
          title="Mark reward as paid"
          hint={`Enter the amount you handed over. Range for this claim: ${inr(claim.rewardMin)} to ${inr(claim.rewardMax)}.`}
        >
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Amount paid (₹)"
            aria-label="Amount paid"
          />
          {outsideRange && (
            <div className="notice" role="alert">This amount is outside the reward range. You can still save it.</div>
          )}
          <Buttons
            confirm="Confirm payment"
            busy={pay.isPending}
            disabled={!(paidNumber > 0)}
            onConfirm={() => pay.mutate({ amount: paidNumber }, { onSuccess: close })}
            onCancel={close}
          />
          <ErrorLine error={pay.error} />
        </ActionBox>
      )}

      {panel === "device" && (
        <ActionBox
          title={`Correct the ${claim.deviceLabel}`}
          hint="Type the number exactly as printed on the bill. The old number is replaced and can be used on another claim. Do not type either number in the reason."
        >
          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            inputMode={isImei ? "numeric" : "text"}
            autoComplete="off"
            placeholder={`Correct ${claim.deviceLabel}`}
            aria-label={`Correct ${claim.deviceLabel}`}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Reason, for example: customer mistyped, bill checked"
            aria-label="Reason"
          />
          <Buttons
            confirm="Confirm correction"
            busy={correct.isPending}
            disabled={!deviceLooksValid || text.trim() === ""}
            onConfirm={() => correct.mutate({ deviceIdentifier: deviceId.trim(), reason: text.trim() }, { onSuccess: close })}
            onCancel={close}
          />
          <ErrorLine error={correct.error} />
        </ActionBox>
      )}

      <h2>History</h2>
      {claim.history.length === 0 ? (
        <p className="muted">No decisions yet.</p>
      ) : (
        <ul className="history">
          {claim.history.map((h, i) => (
            <li key={i}>
              <strong>{h.decision === "REOPENED" ? "Reopened" : h.decision === "DEVICE_CORRECTED" ? "Device number corrected" : statusLabel(h.decision)}</strong> by {h.reviewer} ·{" "}
              {dateTime(h.at)}
              {h.reason && <p>{h.reason}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActionBox(props: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="actionbox">
      <h2>{props.title}</h2>
      <p className="fieldhint">{props.hint}</p>
      {props.children}
    </div>
  );
}

function Buttons(props: {
  confirm: string; busy: boolean; disabled?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="actions">
      <button className="primary" disabled={props.busy || props.disabled} onClick={props.onConfirm}>
        {props.busy ? "Saving…" : props.confirm}
      </button>
      <button className="secondary" disabled={props.busy} onClick={props.onCancel}>Cancel</button>
    </div>
  );
}

function ErrorLine({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof ApiRequestError
    ? (error.fields[0]?.message ?? error.message)
    : "Something went wrong. Please try again.";
  return <p className="fielderror" role="alert">{message}</p>;
}
