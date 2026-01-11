"use client";

import { OrganizationSwitcher, UserButton, useAuth, useOrganization } from "@clerk/nextjs";
import React, { useMemo, useState } from "react";

type Recommendation = {
  sku: string;
  current_stock: number;
  avg_daily_sales: number;
  forecast_30d: number;
  reorder_qty: number;
  reorder_by: string | null;
  lead_time_days: number;
  moq: number | null;
  unit_cost: number | null;
  status: "RED" | "AMBER" | "GREEN" | string;
  reason: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

function fmtNumber(n: number | null | undefined, dp = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: dp, minimumFractionDigits: dp }).format(n);
}

export default function AppDashboard() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();

  const [file, setFile] = useState<File | null>(null);
  const [horizonDays, setHorizonDays] = useState<number>(30);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [recs, setRecs] = useState<Recommendation[] | null>(null);

  const apiHealth = useMemo(() => {
    if (!API_BASE) return "NEXT_PUBLIC_API_BASE is missing";
    return API_BASE;
  }, []);

  async function onRun() {
    setErr(null);
    setRecs(null);

    if (!API_BASE) {
      setErr("Missing NEXT_PUBLIC_API_BASE. Add it in Vercel → Project → Settings → Environment Variables.");
      return;
    }

    if (!organization?.id) {
      setErr("Please create/select a Company (Organization) using the switcher (top right) before running.");
      return;
    }

    if (!file) {
      setErr("Please choose a CSV file first.");
      return;
    }

    if (!Number.isFinite(horizonDays) || horizonDays < 7 || horizonDays > 180) {
      setErr("Horizon days must be between 7 and 180.");
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Could not get login token. Please sign out and sign in again.");
      }

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_BASE}/api/recommendations?horizon_days=${encodeURIComponent(horizonDays)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Org-Id": organization.id,
        },
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        // FastAPI often returns JSON error; keep it simple for users
        throw new Error(text || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as Recommendation[];
      setRecs(data);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold">Inventory AI Dashboard</h1>
            <div className="mt-1 text-xs text-neutral-600">
              Backend: <span className="font-mono">{apiHealth}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <OrganizationSwitcher />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Controls */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Upload your inventory data</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Upload a CSV containing: <span className="font-mono">SKU, Date, UnitsSold, OnHand, LeadTimeDays</span>{" "}
            (MOQ and Cost optional).
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold">CSV File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-sm"
              />
              <div className="mt-1 text-xs text-neutral-500">
                Selected: <span className="font-mono">{file?.name ?? "None"}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Horizon (days)</label>
              <input
                type="number"
                min={7}
                max={180}
                value={horizonDays}
                onChange={(e) => setHorizonDays(parseInt(e.target.value || "30", 10))}
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              />
              <div className="mt-1 text-xs text-neutral-500">Typical: 30</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-neutral-600">
              Company:{" "}
              <span className="font-mono">{organization?.name ?? "None selected"}</span>
            </div>

            <button
              onClick={onRun}
              disabled={loading || !file}
              className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Running..." : "Generate AI Recommendations"}
            </button>
          </div>

          {err && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">
              {err}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recommendations</h3>
            <div className="text-xs text-neutral-600">
              {recs ? `${recs.length} SKUs` : "No results yet"}
            </div>
          </div>

          {!recs ? (
            <div className="mt-4 rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500">
              Upload a CSV and click <b>Generate</b> to see results.
            </div>
          ) : recs.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-700">No recommendations returned.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-600">
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">SKU</th>
                    <th className="py-2 pr-4">On Hand</th>
                    <th className="py-2 pr-4">Avg Daily</th>
                    <th className="py-2 pr-4">Forecast</th>
                    <th className="py-2 pr-4">Reorder Qty</th>
                    <th className="py-2 pr-4">Reorder By</th>
                    <th className="py-2 pr-4">Lead Time</th>
                    <th className="py-2 pr-4">MOQ</th>
                    <th className="py-2 pr-4">Unit Cost</th>
                    <th className="py-2 pr-4">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {recs.map((r) => (
                    <tr key={r.sku} className="border-b border-neutral-100 align-top">
                      <td className="py-3 pr-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                            r.status === "RED"
                              ? "bg-red-100 text-red-800"
                              : r.status === "AMBER"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800",
                          ].join(" ")}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">{r.sku}</td>
                      <td className="py-3 pr-4">{fmtNumber(r.current_stock, 0)}</td>
                      <td className="py-3 pr-4">{fmtNumber(r.avg_daily_sales, 1)}</td>
                      <td className="py-3 pr-4">{fmtNumber(r.forecast_30d, 0)}</td>
                      <td className="py-3 pr-4 font-semibold">{fmtNumber(r.reorder_qty, 0)}</td>
                      <td className="py-3 pr-4">{r.reorder_by ?? "-"}</td>
                      <td className="py-3 pr-4">{fmtNumber(r.lead_time_days, 0)}d</td>
                      <td className="py-3 pr-4">{r.moq ?? "-"}</td>
                      <td className="py-3 pr-4">{r.unit_cost ?? "-"}</td>
                      <td className="py-3 pr-4 max-w-[420px] text-neutral-700">
                        {r.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
