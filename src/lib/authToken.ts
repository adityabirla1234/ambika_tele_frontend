// The staff session token lives in sessionStorage: it survives a page reload but is gone when the tab closes.
// (Memory only would sign staff out on every reload. localStorage would keep the token on the device after the tab closes.)
// The server also ends a session after 30 idle minutes and 12 hours in total.
const KEY = "ambika.staff.token";

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    /* storage blocked: the person stays signed in until reload */
  }
}

export function clearAuthToken(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
