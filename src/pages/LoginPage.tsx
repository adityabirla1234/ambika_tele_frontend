import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiRequestError } from "../api/client";
import { homeFor, useAuth } from "../auth/AuthContext";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email."),
  password: z.string().min(1, "Enter your password."),
});
type Values = z.infer<typeof schema>;

export function LoginPage() {
  const { state, login, sessionEnded } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: (v: Values) => login(v.email.trim(), v.password),
    onSuccess: (profile) => navigate(profile.mustChangePassword ? homeFor(profile) : (from ?? homeFor(profile)), { replace: true }),
  });

  if (state.status === "authenticated") return <Navigate to={homeFor(state.profile)} replace />;

  const error = mutation.error;
  const message = error instanceof ApiRequestError ? error.message : error ? "Something went wrong. Please try again." : null;

  return (
    <section>
      <h1>Staff sign in</h1>
      <p className="lead">For Ambika Telecom staff only.</p>

      {sessionEnded && !mutation.isPending && (
        <div className="notice" role="status">Your session ended. Please sign in again.</div>
      )}

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="claimform">
        <label className="field">
          <span className="fieldlabel">Email</span>
          <input type="email" autoComplete="username" inputMode="email" autoCapitalize="none" {...register("email")} />
          {errors.email && <span className="fielderror" role="alert">{errors.email.message}</span>}
        </label>

        <label className="field">
          <span className="fieldlabel">Password</span>
          <span className="pwrow">
            <input type={showPassword ? "text" : "password"} autoComplete="current-password" {...register("password")} />
            <button type="button" className="linkbutton" onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
          {errors.password && <span className="fielderror" role="alert">{errors.password.message}</span>}
        </label>

        {message && <div className="notice" role="alert">{message}</div>}

        <button type="submit" className="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
