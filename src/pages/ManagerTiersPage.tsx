import { FormEvent, useState } from "react";
import { isAccessDenied } from "../api/admin";
import { ApiRequestError } from "../api/client";
import { Tier, useSaveTier, useSetTierActive, useTiers } from "../api/manager";
import { inr } from "../lib/format";

export function ManagerTiersPage() {
  const tiers = useTiers();
  const toggle = useSetTierActive();
  const [editing, setEditing] = useState<Tier | "new" | null>(null);

  if (tiers.isError && isAccessDenied(tiers.error)) {
    return (
      <section>
        <h1>No access</h1>
        <p className="lead">Your account is not set up to manage reward tiers. Ask the owner to add your email.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Reward tiers</h1>
      <p className="lead">
        Each tier links a purchase price band to the reward range customers see. Active tiers cannot overlap. Changes
        apply to new claims only; claims already submitted keep the range they were submitted under.
      </p>

      {tiers.isPending && <p className="statuscard" role="status">Loading tiers…</p>}
      {tiers.isError && (
        <p className="statuscard" role="alert">
          {tiers.error instanceof ApiRequestError ? tiers.error.message : "Could not load tiers."}{" "}
          <button className="linkbutton" onClick={() => tiers.refetch()}>Try again</button>
        </p>
      )}
      {tiers.data && tiers.data.length === 0 && (
        <div className="notice" role="status">
          No tiers yet. Until you add one, every customer will see the “not eligible” message.
        </div>
      )}
      {toggle.isError && (
        <div className="notice" role="alert">
          {toggle.error instanceof ApiRequestError ? toggle.error.message : "Could not change the tier."}
        </div>
      )}

      <ul className="claimlist">
        {tiers.data?.map((t) => (
          <li key={t.id} className={t.active ? "claimrow tierrow" : "claimrow tierrow dimmed"}>
            <span className="claimrow-main">
              <strong>Purchases {inr(t.purchaseMin)} to {inr(t.purchaseMax)}</strong>
              <span>Reward {inr(t.rewardMin)} to {inr(t.rewardMax)}</span>
              <span className={t.active ? "badge badge-APPROVED" : "badge badge-REJECTED"}>{t.active ? "Active" : "Inactive"}</span>
            </span>
            <span className="claimrow-side">
              <button className="linkbutton" onClick={() => setEditing(t)}>Edit</button>
              <button
                className="linkbutton"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ id: t.id, active: !t.active })}
              >
                {t.active ? "Deactivate" : "Activate"}
              </button>
            </span>
          </li>
        ))}
      </ul>

      {editing === null ? (
        <p><button className="primary" onClick={() => setEditing("new")}>Add tier</button></p>
      ) : (
        <TierForm
          key={editing === "new" ? "new" : editing.id}
          tier={editing === "new" ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function TierForm({ tier, onDone }: { tier: Tier | undefined; onDone: () => void }) {
  const save = useSaveTier(tier?.id);
  const [v, setV] = useState({
    purchaseMin: tier ? String(tier.purchaseMin) : "",
    purchaseMax: tier ? String(tier.purchaseMax) : "",
    rewardMin: tier ? String(tier.rewardMin) : "",
    rewardMax: tier ? String(tier.rewardMax) : "",
  });
  const [problem, setProblem] = useState<string | null>(null);

  const num = (s: string) => (/^\d{1,8}$/.test(s.trim()) ? Number(s.trim()) : null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const pMin = num(v.purchaseMin), pMax = num(v.purchaseMax), rMin = num(v.rewardMin), rMax = num(v.rewardMax);
    if (pMin === null || pMax === null || rMin === null || rMax === null || !pMin || !pMax || !rMin || !rMax) {
      setProblem("Enter all four amounts in whole rupees, more than zero.");
      return;
    }
    if (pMin > pMax) return setProblem("The lowest purchase price cannot be higher than the highest.");
    if (rMin > rMax) return setProblem("The lowest reward cannot be higher than the highest.");
    setProblem(null);
    save.mutate(
      { purchaseMin: pMin, purchaseMax: pMax, rewardMin: rMin, rewardMax: rMax },
      { onSuccess: onDone },
    );
  }

  const serverMessage = save.error instanceof ApiRequestError ? save.error.message
    : save.error ? "Something went wrong. Please try again." : null;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form onSubmit={onSubmit} noValidate className="claimform actionbox">
      <h2>{tier ? "Edit tier" : "Add tier"}</h2>
      <label className="field"><span className="fieldlabel">Lowest purchase price (₹)</span>
        <input inputMode="numeric" value={v.purchaseMin} onChange={set("purchaseMin")} autoComplete="off" /></label>
      <label className="field"><span className="fieldlabel">Highest purchase price (₹)</span>
        <input inputMode="numeric" value={v.purchaseMax} onChange={set("purchaseMax")} autoComplete="off" /></label>
      <label className="field"><span className="fieldlabel">Lowest reward (₹)</span>
        <input inputMode="numeric" value={v.rewardMin} onChange={set("rewardMin")} autoComplete="off" /></label>
      <label className="field"><span className="fieldlabel">Highest reward (₹)</span>
        <input inputMode="numeric" value={v.rewardMax} onChange={set("rewardMax")} autoComplete="off" /></label>
      {(problem ?? serverMessage) && <div className="notice" role="alert">{problem ?? serverMessage}</div>}
      <div className="actions">
        <button type="submit" className="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save tier"}</button>
        <button type="button" className="secondary" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
