import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { StaffRole } from "../api/auth";
import { useAuth } from "./AuthContext";

/**
 * Keeps people out of the staff screens. This is for usability only: the server checks the session and the role
 * on every API call, and that is what actually protects the data.
 * - role: the role the area needs. Leave out for pages any signed-in staff member may see.
 * - allowMustChange: true only on the change-password page itself.
 */
export function RequireStaff(props: { role?: StaffRole; allowMustChange?: boolean; children: ReactNode }) {
  const { state, retry } = useAuth();
  const location = useLocation();

  if (state.status === "loading") return <p className="statuscard" role="status">Checking your sign-in…</p>;
  if (state.status === "unavailable") {
    return (
      <p className="statuscard" role="alert">
        Could not reach the server to check your sign-in.{" "}
        <button type="button" className="linkbutton" onClick={retry}>Try again</button>
      </p>
    );
  }
  if (state.status === "anonymous") {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />;
  }
  if (state.profile.mustChangePassword && !props.allowMustChange) {
    return <Navigate to="/staff/change-password" replace />;
  }
  if (props.role && !state.profile.roles.includes(props.role)) {
    return (
      <section>
        <h1>No access</h1>
        <p className="lead">Your account is not set up for this area. Ask the shop owner.</p>
      </section>
    );
  }
  return <>{props.children}</>;
}
