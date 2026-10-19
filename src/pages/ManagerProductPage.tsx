import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { isAccessDenied } from "../api/admin";
import { ApiRequestError } from "../api/client";
import {
  ProductDetail, ProductPayload, useManagerProduct, useProductFilters, useSaveProduct, useSetProductActive,
} from "../api/manager";
import { auditLabel, dateOnly, dateTime, describeChanges, inr } from "../lib/format";
import { managerCategorySuggestions } from "../lib/categories";

const rupees = z.string().trim().regex(/^\d{1,8}$/, "Enter whole rupees, numbers only.");
const todayIso = () => new Date().toLocaleDateString("en-CA");

const schema = z
  .object({
    category: z.string().trim().min(1, "Enter the category.").max(60, "Keep this under 60 characters."),
    brand: z.string().trim().min(1, "Enter the brand.").max(80, "Keep this under 80 characters."),
    model: z.string().trim().min(1, "Enter the model.").max(120, "Keep this under 120 characters."),
    sku: z.string().trim().min(1, "Enter the SKU.").max(80, "Keep this under 80 characters."),
    minPrice: rupees,
    maxPrice: rupees,
    effectiveFrom: z.string().optional(),
  })
  .refine((v) => Number(v.minPrice) <= Number(v.maxPrice), {
    path: ["minPrice"], message: "The lowest price cannot be higher than the highest price.",
  })
  .refine((v) => !v.effectiveFrom || v.effectiveFrom >= todayIso(), {
    path: ["effectiveFrom"], message: "The start date cannot be in the past.",
  });
type FormValues = z.infer<typeof schema>;

const FIELDS = ["category", "brand", "model", "sku", "minPrice", "maxPrice", "effectiveFrom"] as const;

export function ManagerProductPage() {
  const { id } = useParams();
  const detail = useManagerProduct(id);

  if (!id) return <ProductForm id={undefined} detail={undefined} />;
  if (detail.isPending) return <p className="statuscard" role="status">Loading product…</p>;
  if (detail.isError) {
    return (
      <section>
        <p><Link to="/manager">Back to products</Link></p>
        <p className="statuscard" role="alert">
          {isAccessDenied(detail.error)
            ? "Your account is not set up to manage products."
            : detail.error instanceof ApiRequestError ? detail.error.message : "Could not load this product."}
        </p>
      </section>
    );
  }
  return <ProductForm id={id} detail={detail.data} />;
}

function ProductForm({ id, detail }: { id: string | undefined; detail: ProductDetail | undefined }) {
  const navigate = useNavigate();
  const filters = useProductFilters();
  const save = useSaveProduct(id);
  const toggle = useSetProductActive(id);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const p = detail?.product;

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: initial(p),
  });

  useEffect(() => { reset(initial(p)); }, [p?.id, p?.updatedAt, detail?.rules.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = handleSubmit((v) => {
    setNotice(null);
    setSaved(false);
    const body: ProductPayload = {
      category: v.category.trim(), brand: v.brand.trim(), model: v.model.trim(), sku: v.sku.trim(),
      minPrice: Number(v.minPrice), maxPrice: Number(v.maxPrice),
    };
    const unchanged = p && p.minPrice === body.minPrice && p.maxPrice === body.maxPrice;
    if (unchanged) {
      delete body.minPrice; // keep the current rule, do not add a duplicate row
      delete body.maxPrice;
    } else if (v.effectiveFrom) {
      body.effectiveFrom = v.effectiveFrom;
    }
    save.mutate(body, {
      onSuccess: (d) => {
        if (!id) navigate(`/manager/products/${d.product.id}`, { replace: true });
        else setSaved(true);
      },
      onError: (err) => {
        if (err instanceof ApiRequestError && err.kind === "http") {
          const mapped = err.fields.filter((f) => (FIELDS as readonly string[]).includes(f.field));
          if (mapped.length > 0) mapped.forEach((f) => setError(f.field as keyof FormValues, { message: f.message }));
          else setNotice(err.message);
        } else {
          setNotice(err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again.");
        }
      },
    });
  });

  return (
    <section>
      <p><Link to="/manager">Back to products</Link></p>
      <h1>{p ? `${p.brand} ${p.model}` : "Add product"}</h1>
      {p && (
        <p className="lead">
          <span className={p.active ? "badge badge-APPROVED" : "badge badge-REJECTED"}>{p.active ? "Active" : "Inactive"}</span>
          {" "}{p.active ? "Customers can choose this product." : "Hidden from new claims. Old claims still load."}
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="claimform">
        <Field label="Category" hint="Use “Mobile” for phones: customers then enter an IMEI 1 and an invoice number." error={errors.category?.message}>
          <input list="category-list" autoComplete="off" {...register("category")} />
          <datalist id="category-list">{managerCategorySuggestions(filters.data?.categories).map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Brand" error={errors.brand?.message}>
          <input list="brand-list" autoComplete="off" {...register("brand")} />
          <datalist id="brand-list">{filters.data?.brands.map((b) => <option key={b} value={b} />)}</datalist>
        </Field>
        <Field label="Model" error={errors.model?.message}>
          <input autoComplete="off" {...register("model")} />
        </Field>
        <Field label="SKU" hint="Must be unique. Saved in capital letters." error={errors.sku?.message}>
          <input autoComplete="off" {...register("sku")} />
        </Field>
        <Field label="Lowest eligible price (₹)" error={errors.minPrice?.message}>
          <input inputMode="numeric" autoComplete="off" {...register("minPrice")} />
        </Field>
        <Field label="Highest eligible price (₹)" error={errors.maxPrice?.message}>
          <input inputMode="numeric" autoComplete="off" {...register("maxPrice")} />
        </Field>
        <Field
          label="Price change starts on (optional)"
          hint="Leave empty to start today. Only used when you change the prices. Earlier rules are kept in the history."
          error={errors.effectiveFrom?.message}
        >
          <input type="date" min={todayIso()} {...register("effectiveFrom")} />
        </Field>

        {notice && <div className="notice" role="alert">{notice}</div>}
        {saved && <div className="notice" role="status">Saved.</div>}
        <button type="submit" className="primary" disabled={save.isPending}>
          {save.isPending ? "Saving…" : p ? "Save changes" : "Add product"}
        </button>
      </form>

      {p && detail && (
        <>
          <div className="actionbox">
            <h2>{p.active ? "Deactivate" : "Activate"}</h2>
            <p className="muted">
              {p.active
                ? "Customers will no longer see this product. Claims already submitted are not affected."
                : "Customers will see this product again on the claim form."}
            </p>
            {toggle.isError && (
              <p className="fielderror" role="alert">
                {toggle.error instanceof ApiRequestError ? toggle.error.message : "Could not change the status."}
              </p>
            )}
            {!confirmToggle ? (
              <button className="secondary" onClick={() => setConfirmToggle(true)}>{p.active ? "Deactivate…" : "Activate…"}</button>
            ) : (
              <div className="actions">
                <button
                  className="primary"
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate(!p.active, { onSettled: () => setConfirmToggle(false) })}
                >
                  {toggle.isPending ? "Saving…" : `Yes, ${p.active ? "deactivate" : "activate"}`}
                </button>
                <button className="secondary" onClick={() => setConfirmToggle(false)}>Cancel</button>
              </div>
            )}
          </div>

          <h2>Price rule history</h2>
          <ul className="history">
            {detail.rules.map((r) => (
              <li key={r.id}>
                <strong>{inr(r.minPrice)} to {inr(r.maxPrice)}</strong>{" "}
                <span className="badge badge-PENDING_REVIEW">{ruleStateLabel(r.state)}</span>
                <p>
                  From {dateOnly(r.effectiveFrom)}
                  {r.effectiveTo && r.state !== "REPLACED" ? ` to ${dateOnly(r.effectiveTo)}` : ""}
                </p>
              </li>
            ))}
          </ul>

          <h2>Change history</h2>
          {detail.history.length === 0 && <p className="muted">No changes recorded yet.</p>}
          <ul className="history">
            {detail.history.map((h, i) => (
              <li key={i}>
                <strong>{auditLabel(h.action)}</strong>
                <p>{h.actor} · {dateTime(h.at)}</p>
                {describeChanges(h.changes).map((line) => <p key={line} className="mono">{line}</p>)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function initial(p: ProductDetail["product"] | undefined): FormValues {
  return {
    category: p?.category ?? "", brand: p?.brand ?? "", model: p?.model ?? "", sku: p?.sku ?? "",
    minPrice: p?.minPrice != null ? String(p.minPrice) : "", maxPrice: p?.maxPrice != null ? String(p.maxPrice) : "",
    effectiveFrom: "",
  };
}

function ruleStateLabel(state: string): string {
  switch (state) {
    case "CURRENT": return "In force";
    case "SCHEDULED": return "Scheduled";
    case "REPLACED": return "Replaced before it started";
    default: return "Past";
  }
}

function Field(props: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="fieldlabel">{props.label}</span>
      {props.children}
      {props.hint && <span className="fieldhint">{props.hint}</span>}
      {props.error && <span className="fielderror" role="alert">{props.error}</span>}
    </label>
  );
}
