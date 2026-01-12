"use client";

import {
  OrganizationSwitcher,
  UserButton,
  useAuth,
  useOrganization,
} from "@clerk/nextjs";
import React, { useState } from "react";

/* ===================== TYPES ===================== */
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

/* ===================== AI SUMMARY CARD ===================== */
function AISummaryCard({ recs }: { recs: Recommendation[] }) {
  const totalForecast = recs.reduce((s, r) => s + r.forecast_30d, 0);
  const totalReorder = recs.reduce((s, r) => s + r.reorder_qty, 0);

  const red = recs.filter((r) => r.status === "RED");
  const amber = recs.filter((r) => r.status === "AMBER");
  const green = recs.filter((r) => r.status === "GREEN");

  return (
    <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-600 p-6 text-white shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between">
        <div>
          <div className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            🧠 AI Summary
          </div>
          <h2 className="mt-3 text-xl font-extrabold">
            What needs your attention
          </h2>
          <p className="mt-2 text-sm text-white/90">
            You have{" "}
            <span className="font-extrabold">{red.length}</span> high-risk SKUs
            and{" "}
            <span className="font-extrabold">{amber.length}</span> medium-risk
            SKUs. Total 30-day demand forecast is{" "}
            <span className="font-extrabold">
              {Math.round(totalForecast)}
            </span>{" "}
            units with a recommended reorder of{" "}
            <span className="font-extrabold">
              {Math.round(totalReorder)}
            </span>{" "}
            units.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-white/15 p-4">
            <div className="text-xs">RED</div>
            <div className="text-2xl font-extrabold">{red.length}</div>
          </div>
          <div className="rounded-2xl bg-white/15 p-4">
            <div className="text-xs">AMBER</div>
            <div className="text-2xl font-extrabold">{amber.length}</div>
          </div>
          <div className="rounded-2xl bg-white/15 p-4">
            <div className="text-xs">GREEN</div>
            <div className="text-2xl font-extrabold">{green.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== SIMPLE FORECAST CHART ===================== */
function ForecastChart({ value }: { value: number }) {
  const points = [10, 20, 30, value / 2, value].map(
    (v, i) => `${i * 60},${140 - Math.min(v, 140)}`
  );

  return (
    <svg viewBox="0 0 260 150" className="w-full h-36">
      <polyline
        fill="none"
        stroke="#6366f1"
        strokeWidth="4"
        points={points.join(" ")}
      />
    </svg>
  );
}

/* ===================== DASHBOARD ===================== */
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
      setError(e.message || "AI processing failed");
    } finally {
      setLoading(false);
    }
  }

  const totalForecast =
    recs?.reduce((s, r) => s + r.forecast_30d, 0) || 0;
  const totalReorder =
    recs?.reduce((s, r) => s + r.reorder_qty, 0) || 0;

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

      {/* Upload */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="font-bold">Upload inventory data</h2>
          <div className="mt-4 flex gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={runAI}
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white"
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

      {/* RESULTS */}
      {recs && (
        <>
          {/* 🟦 STEP 2 — AI SUMMARY CARD */}
          <section className="mx-auto max-w-6xl px-6">
            <AISummaryCard recs={recs} />
          </section>

          {/* KPI CARDS */}
          <section className="mx-auto max-w-6xl px-6 py-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-600 p-5 text-white shadow-lg">
              <div className="text-sm">30-Day Forecast</div>
              <div className="text-3xl font-extrabold">
                {Math.round(totalForecast)}
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-600 p-5 text-white shadow-lg">
              <div className="text-sm">Recommended Reorder</div>
              <div className="text-3xl font-extrabold">
                {Math.round(totalReorder)}
              </div>
            </div>
          </section>

          {/* FORECAST CHART */}
          <section className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl bg-white p-6 shadow-lg">
              <h3 className="font-bold mb-3">Auto Demand Forecast</h3>
              <ForecastChart value={totalForecast} />
            </div>
          </section>

          {/* TABLE */}
          <section className="mx-auto max-w-6xl px-6 py-8">
            <div className="rounded-3xl bg-white p-6 shadow-lg overflow-x-auto">
              <h3 className="font-bold mb-4">SKU Recommendations</h3>
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
                  {recs.map((r) => (
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
                      <td className="text-neutral-600 max-w-md">
                        {r.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
