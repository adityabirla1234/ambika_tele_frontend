import { ClaimForm } from "../features/customer-claims/ClaimForm";

export function ClaimPage() {
  return (
    <section>
      <h1>Register your purchase</h1>
      <p className="lead">
        Fill in the details from your bill. Our team checks them against your invoice before your reward is confirmed.
      </p>
      <ClaimForm />
    </section>
  );
}
