"use client";

import {
  OrganizationSwitcher,
  UserButton,
  useAuth,
  useOrganization,
} from "@clerk/nextjs";
import React, { useMemo, useState } from "react";

/* ===================== TYPES ===================== */
type Recommendation = {
  sku: string;
  forecast_30d: number;
  reorder_qty: number;
  status: "RED" | "AMBER" | "GREEN" | string;
  reason: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

/* ===================== DASHBOARD ===================== */
export default function Dashboard() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();

  const [file, setFile] = useState<File | null>(null);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* FILTER STATES */
  const [riskFilter, setRiskFilter] = useState<
    "ALL" | "RED" | "AMBER" | "GREEN"
  >("ALL");
  const [actionFilter, setActionFilter] = useState<
    "ALL" | "REORDER" | "NO_REORDER"
  >("ALL");
  const [search, setSearch] = useState("");

  async function runAI() {
    setError(null);
    setRecs(null);

    if (!file) return setError("Please upload a CSV file");
    if (!organization?.id)
      return setError("Please select a company (Organization)");

    setLoading(true);

    try {
      const token = await getToken();
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
      setRecs(await res.json());
    } catch (e: any) {
      setError(e.message || "AI processing failed");
    } finally {
      setLoading(false);
    }
  }

  /* ===================== FILTER LOGIC ===================== */
  const filteredRecs = useMemo(() => {
    if (!recs) return [];

    return recs.filter((r) => {
      if (riskFilter !== "ALL" && r.status !== riskFilter) return false;
      if (actionFilter === "REORDER" && r.reorder_qty <= 0) return false;
      if (actionFilter === "NO_REORDER" && r.reorder_qty > 0) return false;
      if (search && !r.sku.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [recs, riskFilter, actionFilter, search]);

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-indigo-700">
            AI Inventory Dashboard
          </h1>
          <div className="flex gap-3">
            <OrganizationSwitcher />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Upload */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={runAI}
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
            >
              {loading ? "Running AI..." : "Run AI"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* FILTER BAR */}
      {recs && (
        <section className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl bg-white p-5 shadow mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Risk filter */}
              <div className="flex gap-2 flex-wrap">
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
                        : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Action filter */}
              <div className="flex gap-2 flex-wrap">
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
                        : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border px-4 py-2 text-sm"
              />
            </div>

            <div className="mt-3 text-xs text-neutral-600">
              Showing <b>{filteredRecs.length}</b> of <b>{recs.length}</b> SKUs
            </div>
          </div>
        </section>
      )}

      {/* TABLE */}
      {recs && (
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <div className="rounded-3xl bg-white p-6 shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-neutral-600">
                <tr>
                  <th>Status</th>
                  <th>SKU</th>
                  <th>Forecast</th>
                  <th>Reorder</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecs.map((r) => (
                  <tr key={r.sku} className="border-b">
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          r.status === "RED"
                            ? "bg-red-100 text-red-700"
                            : r.status === "AMBER"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="font-mono">{r.sku}</td>
                    <td>{Math.round(r.forecast_30d)}</td>
                    <td className="font-semibold">
                      {Math.round(r.reorder_qty)}
                    </td>
                    <td className="max-w-md text-neutral-600">
                      {r.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
