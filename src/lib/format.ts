const inrFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function inr(value: number): string {
  return `₹${inrFormat.format(value)}`;
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function dateOnly(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export function statusLabel(status: string): string {
  switch (status) {
    case "PENDING_REVIEW": return "Pending";
    case "APPROVED": return "Approved";
    case "REJECTED": return "Rejected";
    default: return status;
  }
}

const ACTION_LABELS: Record<string, string> = {
  PRODUCT_CREATED: "Product added",
  PRODUCT_UPDATED: "Product details changed",
  PRODUCT_ACTIVATED: "Activated",
  PRODUCT_DEACTIVATED: "Deactivated",
  PRICE_RULE_ADDED: "Price rule set",
  PRICE_RULE_CHANGED: "Price rule changed",
  TIER_CREATED: "Tier added",
  TIER_UPDATED: "Tier changed",
  TIER_ACTIVATED: "Tier activated",
  TIER_DEACTIVATED: "Tier deactivated",
};

export function auditLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Turns the stored JSON of an audit entry into short readable lines. Never throws. */
export function describeChanges(json: string | null): string[] {
  if (!json) return [];
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    return Object.entries(data).map(([key, value]) => {
      if (value && typeof value === "object" && "from" in value && "to" in value) {
        const v = value as { from: unknown; to: unknown };
        return `${key}: ${String(v.from)} → ${String(v.to)}`;
      }
      return `${key}: ${String(value)}`;
    });
  } catch {
    return [];
  }
}
