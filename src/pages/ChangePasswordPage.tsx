import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiRequestError } from "../api/client";
import { homeFor, useAuth } from "../auth/AuthContext";

// Convenience checks only. The server applies the full rules (including a list of too-easy passwords).
const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(6, "Use at least 12 characters."),
  confirm: z.string(),
}).refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The two new passwords do not match." });
type Values = z.infer<typeof schema>;
type Field = keyof Values;

export function ChangePasswordPage() {
  const { state, changePassword } = useAuth();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const { register, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: (v: Values) => changePassword(v.currentPassword, v.newPassword),
    onSuccess: () => setDone(true),
    onError: (err) => {
      if (err instanceof ApiRequestError) {
        const mapped = err.fields.filter((f) => f.field === "currentPassword" || f.field === "newPassword");
        mapped.forEach((f) => setError(f.field as Field, { message: f.message }));
      }
    },
  });

  if (state.status !== "authenticated") return null; // RequireStaff handles the other states
  const forced = state.profile.mustChangePassword;
  const generic = mutation.error instanceof ApiRequestError && mutation.error.fields.length === 0
    ? mutation.error.message
    : mutation.error && !(mutation.error instanceof ApiRequestError) ? "Something went wrong. Please try again." : null;

  if (done) {
    return (
      <section>
        <h1>Password changed</h1>
        <p className="lead">Any other devices you were signed in on have been signed out.</p>
        <button className="primary" onClick={() => navigate(homeFor({ ...state.profile, mustChangePassword: false }), { replace: true })}>
          Continue
        </button>
      </section>
    );
  }

  return (
    <section>
      <h1>{forced ? "Choose a new password" : "Change password"}</h1>
      <p className="lead">
        {forced
          ? "The password you were given is temporary. Choose your own before you continue."
          : "Use a password you do not use anywhere else. A few random words make a good one."}
      </p>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="claimform">
        <label className="field">
          <span className="fieldlabel">Current password</span>
          <input type="password" autoComplete="current-password" {...register("currentPassword")} />
          {errors.currentPassword && <span className="fielderror" role="alert">{errors.currentPassword.message}</span>}
        </label>
        <label className="field">
          <span className="fieldlabel">New password</span>
          <input type="password" autoComplete="new-password" {...register("newPassword")} />
          <span className="fieldhint">At least 12 characters.</span>
          {errors.newPassword && <span className="fielderror" role="alert">{errors.newPassword.message}</span>}
        </label>
        <label className="field">
          <span className="fieldlabel">Repeat the new password</span>
          <input type="password" autoComplete="new-password" {...register("confirm")} />
          {errors.confirm && <span className="fielderror" role="alert">{errors.confirm.message}</span>}
        </label>

        {generic && <div className="notice" role="alert">{generic}</div>}

        <button type="submit" className="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </section>
  );
}
