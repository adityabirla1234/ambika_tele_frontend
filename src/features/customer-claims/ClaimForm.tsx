import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { submitClaim } from "../../api/claims";
import { ApiRequestError } from "../../api/client";
import { useProducts } from "../../api/products";
import { categoryKey, customerCategories } from "../../lib/categories";
import { ProductPicker } from "./ProductPicker";
import { ClaimFormValues, makeClaimSchema, todayIso } from "./claimSchema";

const FIELD_NAMES = [
  "productId", "purchasePrice", "purchaseDate", "invoiceNumber",
  "deviceIdentifier", "customerName", "phone", "consent",
] as const;

export function ClaimForm() {
  const navigate = useNavigate();
  const products = useProducts();
  const keyRef = useRef(crypto.randomUUID());
  const isMobileRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  const resolver: Resolver<ClaimFormValues> = (values, context, options) =>
    zodResolver(makeClaimSchema(isMobileRef.current))(values, context, options);

  const {
    register, handleSubmit, watch, setError, clearErrors, setValue,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver,
    mode: "onTouched",
    defaultValues: {
      productId: "", purchasePrice: "", purchaseDate: "", invoiceNumber: "",
      deviceIdentifier: "", customerName: "", phone: "", consent: false,
    },
  });

  // Step 1 is the type of product (Mobile, TV, ...). Step 2 lists only the products of that type.
  const [category, setCategory] = useState("");
  const categories = useMemo(() => customerCategories((products.data ?? []).map((p) => p.category)), [products.data]);
  const activeCategory = category || (categories.length === 1 ? categories[0] : ""); // one type only: no need to ask
  const choices = useMemo(
    () => (products.data ?? []).filter((p) => activeCategory === "" || categoryKey(p.category) === categoryKey(activeCategory)),
    [products.data, activeCategory],
  );

  const selected = products.data?.find((p) => String(p.id) === watch("productId"));
  const isMobile = selected?.category.toLowerCase() === "mobile";
  isMobileRef.current = isMobile;

  const mutation = useMutation({
    mutationFn: (v: ClaimFormValues) =>
      submitClaim(
        {
          productId: Number(v.productId),
          purchasePrice: Number(v.purchasePrice),
          purchaseDate: v.purchaseDate,
          invoiceNumber: v.invoiceNumber?.trim() || undefined,
          deviceIdentifier: v.deviceIdentifier.trim(),
          customerName: v.customerName.trim(),
          phone: v.phone.trim(),
          consent: true,
        },
        keyRef.current,
      ),
    onSuccess: (result) => navigate("/claim/done", { state: result }),
    onError: (err) => {
      if (err instanceof ApiRequestError && err.kind === "http") {
        keyRef.current = crypto.randomUUID(); // the request was rejected, so edits get a fresh key
        const mapped = err.fields.filter((f) => (FIELD_NAMES as readonly string[]).includes(f.field));
        if (mapped.length > 0) {
          mapped.forEach((f) => setError(f.field as keyof ClaimFormValues, { message: f.message }));
          setNotice(null);
        } else {
          setNotice(err.message);
        }
      } else if (err instanceof ApiRequestError) {
        // Unknown outcome: keep the same key so pressing the button again can never create two claims.
        setNotice(`${err.message} Press Submit again. It is safe to retry.`);
      } else {
        setNotice("Something went wrong. Please try again.");
      }
    },
  });

  const onSubmit = handleSubmit((values) => {
    setNotice(null);
    mutation.mutate(values);
  });

  if (products.isPending) {
    return <p className="statuscard" role="status">Loading products. The first visit can take up to a minute.</p>;
  }
  if (products.isError) {
    return (
      <p className="statuscard" role="alert">
        {products.error instanceof ApiRequestError ? products.error.message : "Could not load products."}{" "}
        <button type="button" className="linkbutton" onClick={() => products.refetch()}>Try again</button>
      </p>
    );
  }
  if (products.data.length === 0) {
    return <p className="statuscard">No products are open for rewards right now. Please ask our team at Ambika Telecom.</p>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="claimform">
      <Field label="Type of product">
        <select
          value={activeCategory}
          onChange={(e) => { setCategory(e.target.value); setValue("productId", ""); clearErrors(); }}
        >
          <option value="">Choose the type</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      <div className="field">
        <span className="fieldlabel" id="product-label">Product</span>
        <input type="hidden" {...register("productId")} />
        <ProductPicker
          products={choices}
          value={watch("productId")}
          showCategory={activeCategory === ""}
          invalid={!!errors.productId}
          labelledBy="product-label"
          onChange={(id) => {
            setValue("productId", id, { shouldDirty: true });
            clearErrors();
            const picked = products.data?.find((p) => String(p.id) === id);
            if (picked) setCategory(categories.find((c) => categoryKey(c) === categoryKey(picked.category)) ?? picked.category);
          }}
        />
        {errors.productId?.message && <span className="fielderror" role="alert">{errors.productId.message}</span>}
      </div>

      <Field label="Purchase price (₹)" error={errors.purchasePrice?.message}>
        <input inputMode="numeric" autoComplete="off" placeholder="e.g. 24999" {...register("purchasePrice")} />
      </Field>

      <Field label="Purchase date" error={errors.purchaseDate?.message}>
        <input type="date" max={todayIso()} {...register("purchaseDate")} />
      </Field>

      <Field
        label={isMobile ? "Invoice number" : "Invoice number (optional)"}
        error={errors.invoiceNumber?.message}
      >
        <input autoComplete="off" {...register("invoiceNumber")} />
      </Field>

      <Field
        label={isMobile ? "IMEI 1" : "Serial number"}
        hint={isMobile
          ? "Dial *#06# on your phone and enter the first IMEI number only."
          : "Find it on the label on the product or on your bill."}
        error={errors.deviceIdentifier?.message}
      >
        <input inputMode={isMobile ? "numeric" : "text"} autoComplete="off" {...register("deviceIdentifier")} />
      </Field>

      <Field label="Your name" error={errors.customerName?.message}>
        <input autoComplete="name" {...register("customerName")} />
      </Field>

      <Field label="Mobile number" error={errors.phone?.message}>
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit number" {...register("phone")} />
      </Field>

      <div className="field">
        <label className="checkrow">
          <input type="checkbox" {...register("consent")} />
          <span>
            I confirm these details are correct and agree that Ambika Telecom may use them to check my purchase and
            contact me about this reward.
          </span>
        </label>
        {errors.consent?.message && <p className="fielderror" role="alert">{errors.consent.message}</p>}
      </div>

      {notice && <div className="notice" role="alert">{notice}</div>}

      <button type="submit" className="primary" disabled={mutation.isPending}>
        {mutation.isPending ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
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
