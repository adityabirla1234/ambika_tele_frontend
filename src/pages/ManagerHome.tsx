import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { isAccessDenied } from "../api/admin";
import { ApiRequestError } from "../api/client";
import { useManagerProducts, useProductFilters } from "../api/manager";
import { inr } from "../lib/format";

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export function ManagerHome() {
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const products = useManagerProducts({ q, category, brand, status, page });
  const filters = useProductFilters();

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setQ(draft.trim());
  }

  if (products.isError && isAccessDenied(products.error)) {
    return (
      <section>
        <h1>No access</h1>
        <p className="lead">Your account is not set up to manage products. Ask the owner to add your email.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Products</h1>
      <p><Link to="/manager/products/new" className="primary linkcta">Add product</Link></p>

      <div className="tabs" role="tablist" aria-label="Product status">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={status === t.value}
            className={status === t.value ? "tab active" : "tab"}
            onClick={() => { setStatus(t.value); setPage(0); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSearch} className="searchrow" role="search">
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search brand, model or SKU"
          aria-label="Search products"
        />
        <button type="submit" className="primary">Search</button>
      </form>

      <div className="filterrow">
        <select aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
          <option value="">All categories</option>
          {filters.data?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Brand" value={brand} onChange={(e) => { setBrand(e.target.value); setPage(0); }}>
          <option value="">All brands</option>
          {filters.data?.brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {products.isPending && <p className="statuscard" role="status">Loading products…</p>}
      {products.isError && (
        <p className="statuscard" role="alert">
          {products.error instanceof ApiRequestError ? products.error.message : "Could not load products."}{" "}
          <button className="linkbutton" onClick={() => products.refetch()}>Try again</button>
        </p>
      )}
      {products.data && products.data.items.length === 0 && (
        <p className="statuscard">
          No products found. {status === "ALL" && !q && !category && !brand && "Add your first product to open rewards for it."}
        </p>
      )}

      <ul className="claimlist">
        {products.data?.items.map((p) => (
          <li key={p.id} style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <Link to={`/manager/products/${p.id}`} className={p.active ? "claimrow" : "claimrow dimmed"} style={{ flex: 1 }}>
              <span className="claimrow-main">
                <strong>{p.brand} {p.model}</strong>
                <span className="muted">{p.category} · {p.sku}</span>
                <span className="muted">
                  {p.minPrice !== null && p.maxPrice !== null
                    ? `Eligible ${inr(p.minPrice)} to ${inr(p.maxPrice)}`
                    : "No price rule in force"}
                </span>
              </span>
              <span className="claimrow-side">
                <span className={p.active ? "badge badge-APPROVED" : "badge badge-REJECTED"}>
                  {p.active ? "Active" : "Inactive"}
                </span>
              </span>
            </Link>
            <Link
              to={`/manager/products/${p.id}`}
              className="secondary linkcta"
              style={{ justifyContent: "center" }}
              aria-label={`Edit ${p.brand} ${p.model}`}
            >
              Edit
            </Link>
          </li>
        ))}
      </ul>

      {products.data && products.data.totalPages > 1 && (
        <div className="pager">
          <button className="linkbutton" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {products.data.page + 1} of {products.data.totalPages}</span>
          <button
            className="linkbutton"
            disabled={page + 1 >= products.data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
