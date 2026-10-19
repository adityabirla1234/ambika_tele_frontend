import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import type { PublicProduct } from "../../api/products";
import "../../styles/picker.css";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Props {
  products: PublicProduct[];
  value: string; // the chosen product id, or ""
  onChange: (id: string) => void;
  showCategory: boolean; // add "(Refrigerator)" to each row when the list mixes several types
  invalid?: boolean;
  labelledBy: string;
}

/** One dropdown: click it and a search box opens at the top of the list. Spaces and dashes are ignored while searching. */
export function ProductPicker({ products, value, onChange, showCategory, invalid, labelledBy }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = products.find((p) => String(p.id) === value);

  const matches = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).map(norm).filter(Boolean);
    return products
      .filter((p) => {
        const hay = norm(`${p.brand} ${p.model} ${p.category}`);
        return tokens.every((t) => hay.includes(t));
      })
      .sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
  }, [products, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openPanel() {
    setQuery("");
    const sorted = [...products].sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
    setActive(Math.max(0, sorted.findIndex((p) => String(p.id) === value)));
    setOpen(true);
  }

  function choose(p: PublicProduct) {
    onChange(String(p.id));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (matches[active]) choose(matches[active]); } // never submit the form
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    else if (e.key === "Tab") setOpen(false);
  }

  return (
    <div className="picker" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={invalid ? "picker-trigger picker-invalid" : "picker-trigger"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelledBy}
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        <span className={selected ? "" : "picker-placeholder"}>
          {selected ? `${selected.brand} ${selected.model}` : "Choose your product"}
        </span>
        <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="picker-panel">
          <input
            ref={searchRef}
            type="search"
            className="picker-search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onSearchKey}
            placeholder="Search brand or model number"
            aria-label="Search products"
            autoComplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={matches[active] ? `${listId}-${matches[active].id}` : undefined}
          />
          <ul id={listId} role="listbox" ref={listRef} className="picker-list">
            {matches.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={String(p.id) === value}
                className={i === active ? "picker-option picker-active" : "picker-option"}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(p)}
              >
                {p.brand} {p.model}{showCategory ? <span className="muted"> ({p.category})</span> : null}
              </li>
            ))}
            {matches.length === 0 && <li className="picker-empty">No product matches your search.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
