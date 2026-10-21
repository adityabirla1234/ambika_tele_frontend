import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { submitClaim } from "../../api/claims";
import { ApiRequestError } from "../../api/client";
import { PublicProduct, lookupProductByDevice } from "../../api/products";
import "../../styles/claim.css";
import { ClaimFormValues, makeClaimSchema, todayIso } from "./claimSchema";

const FIELD_NAMES = [
  "productId", "purchasePrice", "purchaseDate", "invoiceNumber",
  "deviceIdentifier", "customerName", "phone", "consent",
] as const;

export function ClaimForm() {
  const navigate = useNavigate();
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

  // The customer types the IMEI or serial number first. A product's SKU is that number, so the server finds the product.
  const [found, setFound] = useState<PublicProduct | null>(null);
  const isMobile = found?.category.toLowerCase() === "mobile";
  isMobileRef.current = isMobile;

  const finder = useMutation({
    mutationFn: (identifier: string) => lookupProductByDevice(identifier),
    onSuccess: (product) => {
      setFound(product);
      setValue("productId", String(product.id), { shouldDirty: true });
      clearErrors();
    },
    onError: (err) => {
      setFound(null);
      setValue("productId", "");
      setError("deviceIdentifier", {
        message: err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again.",
      });
    },
  });

  function findProduct() {
    const typed = watch("deviceIdentifier").trim();
    if (typed.length < 4) {
      setError("deviceIdentifier", { message: "Enter the IMEI 1 or the serial number." });
      return;
    }
    clearErrors("deviceIdentifier");
    finder.mutate(typed);
  }

  function changeNumber() {
    setFound(null);
    setValue("productId", "");
    setValue("deviceIdentifier", "");
    clearErrors();
    finder.reset();
  }

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

  return (
    <form onSubmit={onSubmit} noValidate className="claimform">
      <div className="field">
        <label className="fieldlabel" htmlFor="device-identifier">IMEI 1 or serial number</label>
        <input type="hidden" {...register("productId")} />
        <div className="findrow">
          <input
            id="device-identifier"
            inputMode="text"
            autoComplete="off"
            placeholder="Type the number printed on your product"
            readOnly={found !== null}
            {...register("deviceIdentifier")}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); if (!found) findProduct(); } // Enter finds the product, it does not submit
            }}
          />
          {found === null && (
            <button type="button" className="primary" disabled={finder.isPending} onClick={findProduct}>
              {finder.isPending ? "Finding…" : "Find my product"}
            </button>
          )}
        </div>
        <span className="fieldhint">
          Phone: dial *#06# and enter the first IMEI number. Other products: the serial number is on the label on the
          product or on your bill.
        </span>
        {finder.isPending && <span className="fieldhint" role="status">The first visit can take up to a minute.</span>}
        {errors.deviceIdentifier?.message && <span className="fielderror" role="alert">{errors.deviceIdentifier.message}</span>}
      </div>

      {found && (
        <>
          <div className="statuscard foundcard" role="status">
            <span className="muted">Your product</span>
            <strong>{found.brand} {found.model}</strong>
            <span className="muted">{found.category}</span>
            <button type="button" className="linkbutton" onClick={changeNumber}>Not your product? Use a different number</button>
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
        </>
      )}
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
