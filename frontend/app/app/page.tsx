"use client";

import {
  OrganizationSwitcher,
  UserButton,
  useAuth,
  useOrganization,
} from "@clerk/nextjs";
import React, { useState } from "react";

type Recommendation = {
  sku: string;
  current_stock: number;
  avg_daily_sales: number;
  forecast_30d: number;
  reorder_qty: number;
  reorder_by: string | null;
  status: "RED" | "AMBER" | "GREEN" | string;
  reason: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

/* ---------- Simple SVG Line Chart ---------- */
function ForecastChart({ value }: { value: number }) {
  const points = [10, 14, 18, 22, 26, value / 2, value].map(
    (v, i) => `${i * 40},${120 - Math.min(v, 120)}`
  );

  return (
    <svg viewBox="0 0 260 130" className="w-full h-32">
      <polyline
        fill="none"
        stroke="#6366f1"
        strokeWidth="3"
        points={points.join(" ")}
      />
      <circle cx="240" cy={120 - Math.min(value, 120)} r="4" fill="#6366f1" />
    </svg>
  );
}

export default function Dashboard() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();

  const [file, setFile] = useState<File | null>(null);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(e.message || "Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  }

  const totalForecast =
    recs?.reduce((sum, r) => sum + r.forecast_30d, 0) || 0;
  const totalReorder =
    recs?.reduce((sum, r) => sum + r.reorder_qty, 0) || 0;
  const redCount = recs?.filter((r) => r.status === "RED").length || 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-extrabold text-indigo-700">
            Supply Chain AI Dashboard
          </h1>
          <div className="flex gap-3">
            <OrganizationSwitcher />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Controls */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="text-lg font-bold">Upload Inventory Data</h2>
          <p className="text-sm text-neutral-600">
            CSV with SKU, Date, UnitsSold, OnHand, LeadTimeDays
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <button
              onClick={runAI}
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Running AI..." : "Run AI Forecast"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* KPI Cards */}
      {recs && (
        <section className="mx-auto max-w-6xl px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-indigo-600 p-5 text-white shadow-lg">
              <div className="text-sm">30-Day Demand Forecast</div>
              <div className="text-3xl font-extrabold">
                {Math.round(totalForecast)}
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-600 p-5 text-white shadow-lg">
              <div className="text-sm">Recommended Reorder Qty</div>
              <div className="text-3xl font-extrabold">
                {Math.round(totalReorder)}
              </div>
            </div>

            <div className="rounded-2xl bg-rose-600 p-5 text-white shadow-lg">
              <div className="text-sm">High Risk SKUs</div>
              <div className="text-3xl font-extrabold">{redCount}</div>
            </div>
          </div>
        </section>
      )}

      {/* Forecast Chart */}
      {recs && (
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold text-indigo-700">
              Auto Demand Forecast (30 Days)
            </h3>
            <p className="text-sm text-neutral-600">
              AI-projected demand trend based on recent sales velocity
            </p>

            <div className="mt-4">
              <ForecastChart value={totalForecast} />
            </div>
          </div>
        </section>
      )}

      {/* Table */}
      {recs && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="rounded-3xl bg-white p-6 shadow-lg overflow-x-auto">
            <h3 className="mb-4 text-lg font-bold">
              SKU-Level AI Recommendations
            </h3>

            <table className="w-full text-sm">
              <thead className="border-b text-neutral-600">
                <tr>
                  <th className="py-2 text-left">Status</th>
                  <th className="text-left">SKU</th>
                  <th>On Hand</th>
                  <th>Avg / Day</th>
                  <th>Forecast</th>
                  <th>Reorder</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((r) => (
                  <tr
                    key={r.sku}
                    className="border-b last:border-none align-top"
                  >
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
                        {r.status}
                      </span>
                    </td>
                    <td className="font-mono">{r.sku}</td>
                    <td className="text-center">{r.current_stock}</td>
                    <td className="text-center">
                      {r.avg_daily_sales.toFixed(1)}
                    </td>
                    <td className="text-center">
                      {Math.round(r.forecast_30d)}
                    </td>
                    <td className="text-center font-semibold">
                      {Math.round(r.reorder_qty)}
                    </td>
                    <td className="max-w-md text-neutral-600">{r.reason}</td>
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
