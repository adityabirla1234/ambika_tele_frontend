import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { RequireStaff } from "../auth/RequireStaff";
import { CustomerLayout, StaffLayout } from "../layouts/Layouts";
import { AdminClaimPage } from "../pages/AdminClaimPage";
import { AdminHome } from "../pages/AdminHome";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { ClaimDonePage } from "../pages/ClaimDonePage";
import { ClaimPage } from "../pages/ClaimPage";
import { ClaimStatusPage } from "../pages/ClaimStatusPage";
import { CustomerHome } from "../pages/CustomerHome";
import { LoginPage } from "../pages/LoginPage";
import { ManagerHome } from "../pages/ManagerHome";
import { ManagerProductPage } from "../pages/ManagerProductPage";
import { ManagerReportsPage } from "../pages/ManagerReportsPage";
import { ManagerTiersPage } from "../pages/ManagerTiersPage";
import { ReleaseDevicePage } from "../pages/ReleaseDevicePage";
import { ScratchPage } from "../pages/ScratchPage";
import { StatusLookupPage } from "../pages/StatusLookupPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<CustomerHome />} />
              <Route path="/claim" element={<ClaimPage />} />
              <Route path="/claim/done" element={<ClaimDonePage />} />
              <Route path="/status" element={<StatusLookupPage />} />
              <Route path="/status/:reference" element={<ClaimStatusPage />} />
              <Route path="/status/:reference/scratch" element={<ScratchPage />} />
              <Route path="/staff" element={<Navigate to="/staff/login" replace />} />
              <Route path="/staff/login" element={<LoginPage />} />
              <Route
                path="/staff/change-password"
                element={<RequireStaff allowMustChange><ChangePasswordPage /></RequireStaff>}
              />
            </Route>
            <Route element={<RequireStaff><StaffLayout area="Second-hand sale" /></RequireStaff>}>
              <Route path="/staff/devices" element={<ReleaseDevicePage />} />
            </Route>
            <Route element={<RequireStaff role="CLAIM_ADMIN"><StaffLayout area="Claim review" /></RequireStaff>}>
              <Route path="/admin" element={<AdminHome />} />
              <Route path="/admin/claims/:id" element={<AdminClaimPage />} />
            </Route>
            <Route element={<RequireStaff role="PRODUCT_MANAGER"><StaffLayout area="Product manager" /></RequireStaff>}>
              <Route path="/manager" element={<ManagerHome />} />
              <Route path="/manager/products/new" element={<ManagerProductPage />} />
              <Route path="/manager/products/:id" element={<ManagerProductPage />} />
              <Route path="/manager/tiers" element={<ManagerTiersPage />} />
              <Route path="/manager/reports" element={<ManagerReportsPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
