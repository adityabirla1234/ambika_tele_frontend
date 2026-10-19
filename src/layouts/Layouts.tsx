import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function CustomerLayout() {
  const isHome = useLocation().pathname === "/"; // the home page uses the full width for its hero
  return (
    <div className="shell">
      <header className={isHome ? "brandbar brandbar-home" : "brandbar"}>
        <img className="brandlogo" src="/ambika-logo.png" alt="Ambika Telecom" width={192} height={36} />
      </header>
      <main className={isHome ? "content content-home" : "content"}>
        <Outlet />
      </main>
      <footer className="footer">Ambika Telecom purchase rewards</footer>
    </div>
  );
}

export function StaffLayout({ area }: { area: string }) {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const profile = state.status === "authenticated" ? state.profile : null;
  const isAdmin = profile?.roles.includes("CLAIM_ADMIN");
  const isManager = profile?.roles.includes("PRODUCT_MANAGER");

  async function signOut() {
    await logout();
    navigate("/staff/login", { replace: true });
  }

  return (
    <div className="shell">
      <header className="brandbar">
        <img className="brandlogo" src="/ambika-logo.png" alt="Ambika Telecom" width={192} height={36} />
        <nav className="stafftabs" aria-label="Staff areas">
          {isAdmin && <NavLink to="/admin">Claims</NavLink>}
          {isManager && <NavLink to="/manager" end>Products</NavLink>}
          {isManager && <NavLink to="/manager/tiers">Tiers</NavLink>}
          {isManager && <NavLink to="/manager/reports">Reports</NavLink>}
          <NavLink to="/staff/devices">Second-hand</NavLink>
        </nav>
      </header>
      <main className="content">
        <div className="staffbar">
          <p className="areaname">{area}</p>
          {profile && (
            <p className="whoami">
              <span className="muted">{profile.email}</span>{" "}
              <NavLink to="/staff/change-password">Change password</NavLink>{" "}
              <button type="button" className="linkbutton" onClick={signOut}>Sign out</button>
            </p>
          )}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
