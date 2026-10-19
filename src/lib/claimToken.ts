// The status token is a signed, expiring pass for one claim. It holds no personal data. Kept in
// sessionStorage so a refresh keeps working; storage can be blocked, so every access is guarded.
const key = (reference: string) => `claimToken:${reference}`;

export function saveClaimToken(reference: string, token: string): void {
  try {
    sessionStorage.setItem(key(reference), token);
  } catch {
    /* private mode or blocked storage: the customer can look the claim up again */
  }
}

export function loadClaimToken(reference: string): string | null {
  try {
    return sessionStorage.getItem(key(reference));
  } catch {
    return null;
  }
}

export function clearClaimToken(reference: string): void {
  try {
    sessionStorage.removeItem(key(reference));
  } catch {
    /* ignore */
  }
}
