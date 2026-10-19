import { useLocation } from "react-router-dom";
import { StatusLookupForm } from "../features/customer-status/StatusLookupForm";

export function StatusLookupPage() {
  const expired = (useLocation().state as { expired?: boolean } | null)?.expired;
  return (
    <section>
      <h1>Check your claim</h1>
      <p className="lead">
        Enter the IMEI 1 or serial number you used when you registered your purchase. We will show where your claim stands.
      </p>
      {expired && (
        <div className="notice" role="status">For your privacy, please enter the number again to see your claim.</div>
      )}
      <StatusLookupForm />
    </section>
  );
}
