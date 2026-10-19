import { useMutation } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lookupClaimStatus } from "../../api/claims";
import { ApiRequestError } from "../../api/client";
import { saveClaimToken } from "../../lib/claimToken";

export function StatusLookupForm() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (identifier: string) => lookupClaimStatus(identifier),
    onSuccess: (result) => {
      if (result.statusToken) saveClaimToken(result.claimReference, result.statusToken);
      navigate(`/status/${encodeURIComponent(result.claimReference)}`);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.replace(/[\s-]/g, "").length < 4) {
      setFieldError("Enter your IMEI 1 or serial number.");
      return;
    }
    setFieldError(null);
    mutation.mutate(trimmed);
  };

  const err = mutation.error;
  const message = err instanceof ApiRequestError
    ? err.message
    : err ? "Something went wrong. Please try again." : null;

  return (
    <form onSubmit={onSubmit} noValidate className="claimform">
      <label className="field">
        <span className="fieldlabel">IMEI 1 or serial number</span>
        <input
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <span className="fieldhint">
          For a phone, dial *#06# and enter the first IMEI number only. For other items, use the serial number on the
          product or your bill.
        </span>
        {fieldError && <span className="fielderror" role="alert">{fieldError}</span>}
      </label>

      {message && <div className="notice" role="alert">{message}</div>}

      <button type="submit" className="primary" disabled={mutation.isPending}>
        {mutation.isPending ? "Checking status…" : "Check my claim"}
      </button>
      {mutation.isPending && (
        <p className="fieldhint" role="status">The first visit can take up to a minute while the server wakes up.</p>
      )}
    </form>
  );
}
