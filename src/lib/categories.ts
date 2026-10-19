/** The product types customers see first. Anything else a manager adds is listed after these. */
export const STANDARD_CATEGORIES = ["Mobile", "Tablet", "TV", "Refrigerator", "Washing machine", "Cooler"];

export function categoryKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Customer dropdown: only types that really have products, standard ones first, in the usual order. */
export function customerCategories(found: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const name of found) {
    if (name.trim() !== "" && !byKey.has(categoryKey(name))) byKey.set(categoryKey(name), name.trim());
  }
  const standard = STANDARD_CATEGORIES.filter((c) => byKey.has(categoryKey(c)));
  const others = [...byKey.entries()]
    .filter(([key]) => !STANDARD_CATEGORIES.some((c) => categoryKey(c) === key))
    .map(([, name]) => name)
    .sort((a, b) => a.localeCompare(b));
  return [...standard, ...others];
}

/** Manager suggestions: always the standard six, plus any other category already in use. */
export function managerCategorySuggestions(existing: string[] = []): string[] {
  const extras = existing.filter((c) => c.trim() !== "" && !STANDARD_CATEGORIES.some((s) => categoryKey(s) === categoryKey(c)));
  return [...STANDARD_CATEGORIES, ...Array.from(new Set(extras))];
}
