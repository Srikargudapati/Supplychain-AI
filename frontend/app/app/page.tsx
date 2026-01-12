"use client";

import {
  OrganizationSwitcher,
  UserButton,
  useAuth,
  useOrganization,
} from "@clerk/nextjs";
import React, { useMemo, useState } from "react";

type Recommendation = {
  sku: string;
  current_stock?: number;
  avg_daily_sales?: number;
  forecast_30d: number;
  reorder_qty: number;
  reorder_by?: string | null;
  status: "RED" | "AMBER" | "GREEN" | string;
  reason: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

/* ---------- Friendly reasons (SME language) ---------- */
function simpleReason(r: Recommendation) {
  if (r.status === "RED")
    return "Stock may run out before the next delivery. Reorder now.";
  if (r.status === "AMBER")
    return "Stock is getting low. Plan to reorder soon.";
  return "Stock looks healthy. No urgent action needed.";
}

/* ---------- Mini SVG chart (no libraries) ---------- */
function DemandForecastChart({ value }: { value: number }) {
  // Create a simple trend line based on value
  const series = [12, 18, 26, 34, Math.max(40, value * 0.25), Math.max(50, value * 0.5), value];
  const maxV = Math.max(...series, 1);
  const points = series.map((v, i) => {
    const x = 20 + i * 40;
    const y = 120 - (v / maxV) * 90;
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 320 140" className="w-full h-36">
      <path d="M20 120 H300" stroke="#e5e7eb" strokeWidth="2" />
      <path d="M20 80 H300" stroke="#f1f5f9" strokeWidth="2" />
      <path d="M20 40 H300" stroke="#f1f5f9" strokeWidth="2" />

      <polyline
        fill="none"
        stroke="#6366f1"
        strokeWidth="4"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
      <circle cx="300" cy={points[points.length - 1].split(",")[1]} r="5" fill="#6366f1" />
    </svg>
  );
}

/* ---------- AI Summary card ---------- */
function AISummaryCard({ recs }: { recs: Recommendation[] }) {
  const totalForecast = recs.reduce((s, r) => s + (r.forecast_30d || 0), 0);
  const totalReorder = recs.reduce((s, r) => s + (r.reorder_qty || 0), 0);
  const red = recs.filter((r) => r.status === "RED");
  const amber = recs.filter((r) => r.status === "AMBER");
  const green = recs.filter((r) => r.status === "GREEN");

  const topUrgent = [...recs]
    .filter((r) => r.status === "RED" && r.reorder_qty > 0)
    .sort((a, b) => b.reorder_qty - a.reorder_qty)
    .slice(0, 3);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-600 p-6 text-white shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            🧠 AI Summary
          </div>

          <h2 className="mt-3 text-xl font-extrabold">What to do next</h2>

          <p className="mt-2 text-sm text-white/90 leading-relaxed">
            You have <span className="font-extrabold">{red.length}</span> urgent SKU(s) and{" "}
            <span className="font-extrabold">{amber.length}</span> watch-list SKU(s).{" "}
            Total 30-day demand forecast is{" "}
            <span className="font-extrabold">{Math.round(totalForecast)}</span> units, and recommended reorder is{" "}
            <span className="font-extrabold">{Math.round(totalReorder)}</span> units.
          </p>

          {topUrgent.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white/10 p-4">
              <div className="text-sm font-bold">✅ Top urgent actions</div>
              <ul className="mt-2 space-y-1 text-sm text-white/95">
                {topUrgent.map((r) => (
                  <li key={r.sku}>
                    • <span className="font-mono font-semibold">{r.sku}</span>: reorder{" "}
                    <span className="font-extrabold">{Math.round(r.reorder_qty)}</span> units
                    {r.reorder_by ? <span className="text-white/80"> (by {r.reorder_by})</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-white/15 p-4">
            <div className="text-xs text-white/80">Urgent</div>
            <div className="text-2xl font-extrabold">{red.length}</div>
          </div>
          <div className="rounded-2xl bg-white/15 p-4">
            <div className="text-xs text-white/80">Watch</div>
            <div className="text-2xl font-extrabold">{amber.length}</div>
          </div>
          <div className="rounded-2xl bg-white/15 p-4">
            <div className="text-xs text-white/80">Safe</div>
            <div className="text-2xl font-extrabold">{green.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Side panel (click SKU) ---------- */
function SidePanel({
  rec,
  onClose,
}: {
  rec: Recommendation | null;
  onClose: () => void;
}) {
  if (!rec) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white p-6 shadow-2xl overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-500 hover:text-black"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="text-xs text-neutral-500">SKU Insight</div>
        <div className="mt-1 text-xl font-extrabold text-indigo-700">{rec.sku}</div>

        <div className="mt-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              rec.status === "RED"
                ? "bg-red-100 text-red-700"
                : rec.status === "AMBER"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-700"
            }`}
          >
            {rec.status === "RED" ? "Urgent" : rec.status === "AMBER" ? "Watch" : "Safe"}
          </span>
        </div>

        <div className="mt-5">
          <div className="text-sm font-bold">AI explanation</div>
          <p className="mt-2 text-sm text-neutral-700">{simpleReason(rec)}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-neutral-50 p-4 border">
            <div className="text-xs text-neutral-500">30-day demand</div>
            <div className="text-lg font-extrabold">{Math.round(rec.forecast_30d)}</div>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-4 border">
            <div className="text-xs text-neutral-500">Reorder qty</div>
            <div className="text-lg font-extrabold">{Math.round(rec.reorder_qty)}</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-indigo-50 p-4 border border-indigo-100">
          <div className="text-sm font-bold text-indigo-700">Recommended action</div>
          <div className="mt-1 text-sm text-indigo-800">
            {rec.reorder_qty > 0
              ? `Place a reorder of ${Math.round(rec.reorder_qty)} units.`
              : "No reorder needed right now."}
          </div>
          {rec.reorder_by ? (
            <div className="mt-1 text-xs text-indigo-700/80">Suggested by: {rec.reorder_by}</div>
          ) : null}
        </div>

        <details className="mt-5">
          <summary className="cursor-pointer text-xs text-neutral-500">
            Show technical details
          </summary>
          <p className="mt-2 text-xs text-neutral-600 whitespace-pre-wrap">{rec.reason}</p>
        </details>
      </div>
    </div>
  );
}

/* ---------- PO preview drawer ---------- */
function PurchaseOrderDrawer({
  items,
  onClose,
}: {
  items: Recommendation[];
  onClose: () => void;
}) {
  if (items.length === 0) return null;
  const totalUnits = items.reduce((s, r) => s + r.reorder_qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white p-6 shadow-2xl overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-500 hover:text-black"
        >
          ✕
        </button>

        <div className="text-xs text-neutral-500">Purchase Order</div>
        <div className="mt-1 text-xl font-extrabold text-emerald-700">PO Preview</div>
        <div className="mt-2 text-sm text-neutral-600">
          Selected items ready to order (you can export later).
        </div>

        <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
          <div className="text-xs text-emerald-700/80">Total units</div>
          <div className="text-2xl font-extrabold text-emerald-800">
            {Math.round(totalUnits)}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-neutral-50 text-neutral-600">
              <tr>
                <th className="py-2 px-3 text-left">SKU</th>
                <th className="py-2 px-3 text-right">Qty</th>
                <th className="py-2 px-3 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.sku} className="border-b last:border-none">
                  <td className="py-2 px-3 font-mono">{r.sku}</td>
                  <td className="py-2 px-3 text-right font-semibold">
                    {Math.round(r.reorder_qty)}
                  </td>
                  <td className="py-2 px-3 text-neutral-600">{simpleReason(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 text-xs text-neutral-500">
          Next step (later): export CSV/PDF + email/WhatsApp supplier.
        </div>
      </div>
    </div>
  );
}

/* ===================== PAGE ===================== */
export default function AppPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();

  const [file, setFile] = useState<File | null>(null);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Filters
  const [riskFilter, setRiskFilter] = useState<"ALL" | "RED" | "AMBER" | "GREEN">("ALL");
  const [actionFilter, setActionFilter] = useState<"ALL" | "REORDER" | "NO_REORDER">("ALL");
  const [search, setSearch] = useState("");

  // Side panel + bulk select + PO
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [bulk, setBulk] = useState<Record<string, boolean>>({});
  const [showPO, setShowPO] = useState(false);

  const selectedRec = useMemo(() => {
    if (!recs || !selectedSku) return null;
    return recs.find((r) => r.sku === selectedSku) || null;
  }, [recs, selectedSku]);

  async function runAI() {
    setErr(null);
    setRecs(null);
    setBulk({});
    setSelectedSku(null);
    setShowPO(false);

    if (!API_BASE) {
      setErr("Missing NEXT_PUBLIC_API_BASE (set it in Vercel env vars).");
      return;
    }
    if (!file) {
      setErr("Please choose a CSV file.");
      return;
    }
    if (!organization?.id) {
      setErr("Please create/select a Company (Organization) using the top-right switcher.");
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Login token missing. Please sign out and sign in again.");

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_BASE}/api/recommendations?horizon_days=30`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Org-Id": organization.id,
        },
        body: fd,
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRecs(data);
    } catch (e: any) {
      setErr(e?.message || "AI request failed.");
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const list = recs || [];
    const totalForecast = list.reduce((s, r) => s + (r.forecast_30d || 0), 0);
    const totalReorder = list.reduce((s, r) => s + (r.reorder_qty || 0), 0);
    const red = list.filter((r) => r.status === "RED").length;
    return { totalForecast, totalReorder, red };
  }, [recs]);

  const filtered = useMemo(() => {
    if (!recs) return [];
    return recs.filter((r) => {
      if (riskFilter !== "ALL" && r.status !== riskFilter) return false;
      if (actionFilter === "REORDER" && r.reorder_qty <= 0) return false;
      if (actionFilter === "NO_REORDER" && r.reorder_qty > 0) return false;
      if (search && !r.sku.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [recs, riskFilter, actionFilter, search]);

  const selectedItems = useMemo(() => {
    if (!recs) return [];
    return recs.filter((r) => bulk[r.sku] && r.reorder_qty > 0);
  }, [recs, bulk]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs text-neutral-500">Supply Chain AI</div>
            <h1 className="text-xl font-extrabold text-indigo-700">Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <OrganizationSwitcher />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Upload */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold">Upload inventory data</div>
              <div className="text-xs text-neutral-600">
                CSV with SKU, Date, UnitsSold, OnHand, LeadTimeDays (MOQ/Cost optional)
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={runAI}
                disabled={loading}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Running AI…" : "Run AI"}
              </button>
            </div>
          </div>

          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {recs && recs.length > 0 && (
        <>
          {/* AI Summary */}
          <section className="mx-auto max-w-6xl px-6">
            <AISummaryCard recs={recs} />
          </section>

          {/* KPI + Forecast */}
          <section className="mx-auto max-w-6xl px-6 py-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-5 shadow">
              <div className="text-xs text-neutral-500">30-day demand forecast</div>
              <div className="mt-1 text-3xl font-extrabold text-indigo-700">
                {Math.round(totals.totalForecast)}
              </div>
              <div className="mt-2 text-xs text-neutral-500">Auto-calculated from your upload</div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow">
              <div className="text-xs text-neutral-500">Recommended reorder (units)</div>
              <div className="mt-1 text-3xl font-extrabold text-emerald-700">
                {Math.round(totals.totalReorder)}
              </div>
              <div className="mt-2 text-xs text-neutral-500">Select SKUs below to create a PO</div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow">
              <div className="text-xs text-neutral-500">Urgent SKUs</div>
              <div className="mt-1 text-3xl font-extrabold text-rose-700">
                {totals.red}
              </div>
              <div className="mt-2 text-xs text-neutral-500">High stockout risk</div>
            </div>

            <div className="md:col-span-3 rounded-3xl bg-white p-6 shadow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold">Auto demand forecast</div>
                  <div className="text-xs text-neutral-600">Simple trend view (no extra setup)</div>
                </div>
                <div className="text-xs text-neutral-500">
                  Company: <span className="font-mono">{organization?.name || "—"}</span>
                </div>
              </div>
              <div className="mt-3">
                <DemandForecastChart value={Math.max(1, totals.totalForecast)} />
              </div>
            </div>
          </section>

          {/* Filters + PO button */}
          <section className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl bg-white p-5 shadow">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Risk filter */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "ALL", label: "All" },
                    { key: "RED", label: "🔴 Urgent" },
                    { key: "AMBER", label: "🟡 Watch" },
                    { key: "GREEN", label: "🟢 Safe" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setRiskFilter(f.key as any)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        riskFilter === f.key
                          ? "bg-indigo-600 text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Action filter */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "ALL", label: "All actions" },
                    { key: "REORDER", label: "🛒 Needs reorder" },
                    { key: "NO_REORDER", label: "⏸ No reorder" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setActionFilter(f.key as any)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        actionFilter === f.key
                          ? "bg-emerald-600 text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Search + PO */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search SKU…"
                    className="rounded-xl border border-neutral-300 px-4 py-2 text-sm"
                  />
                  <button
                    onClick={() => setShowPO(true)}
                    disabled={selectedItems.length === 0}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Generate PO ({selectedItems.length})
                  </button>
                </div>
              </div>

              <div className="mt-3 text-xs text-neutral-600">
                Showing <b>{filtered.length}</b> of <b>{recs.length}</b> SKUs
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="mx-auto max-w-6xl px-6 py-6 pb-14">
            <div className="rounded-3xl bg-white p-6 shadow overflow-x-auto">
              <div className="text-sm font-bold mb-3">SKU recommendations</div>

              <table className="w-full text-sm">
                <thead className="border-b text-neutral-600">
                  <tr>
                    <th className="py-2 text-left">Select</th>
                    <th className="py-2 text-left">Risk</th>
                    <th className="py-2 text-left">SKU</th>
                    <th className="py-2 text-right">Forecast</th>
                    <th className="py-2 text-right">Reorder</th>
                    <th className="py-2 text-left">AI reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.sku}
                      className="border-b hover:bg-indigo-50 cursor-pointer"
                      onClick={() => setSelectedSku(r.sku)}
                    >
                      <td
                        className="py-2"
                        onClick={(e) => {
                          // prevent opening side panel when clicking checkbox
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!bulk[r.sku]}
                          disabled={r.reorder_qty <= 0}
                          onChange={() =>
                            setBulk((p) => ({ ...p, [r.sku]: !p[r.sku] }))
                          }
                        />
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            r.status === "RED"
                              ? "bg-red-100 text-red-700"
                              : r.status === "AMBER"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {r.status === "RED"
                            ? "Urgent"
                            : r.status === "AMBER"
                            ? "Watch"
                            : "Safe"}
                        </span>
                      </td>
                      <td className="py-2 font-mono">{r.sku}</td>
                      <td className="py-2 text-right">{Math.round(r.forecast_30d)}</td>
                      <td className="py-2 text-right font-semibold">
                        {Math.round(r.reorder_qty)}
                      </td>
                      <td className="py-2 text-neutral-600">{simpleReason(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <SidePanel rec={selectedRec} onClose={() => setSelectedSku(null)} />
          {showPO && (
            <PurchaseOrderDrawer
              items={selectedItems}
              onClose={() => setShowPO(false)}
            />
          )}
        </>
      )}

      {recs && recs.length === 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-10">
          <div className="rounded-3xl bg-white p-6 shadow text-sm text-neutral-700">
            No recommendations returned. Check your CSV format and try again.
          </div>
        </section>
      )}
    </main>
  );
}
