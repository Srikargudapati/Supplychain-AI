"use client";

import React, { useState } from "react";
import { Dashboard, Drawer, Recommendation } from "./components/Dashboard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Recommendation | null>(null);

  async function onRun() {
    if (!file) return;
    setLoading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/api/recommendations?horizon_days=30`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "API error");
      }
      const data = await res.json();
      setRecs(data);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">SMB Inventory Planner (CSV MVP)</h1>
          <p className="text-sm text-neutral-600">
            Upload your CSV (SKU, Date, UnitsSold, OnHand, LeadTimeDays, MOQ, Cost) and get reorder recommendations.
          </p>
        </div>
        <div className="text-xs text-neutral-500">
          Backend: <span className="font-mono">{API_BASE}</span>
        </div>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-semibold">1) Upload CSV</div>
            <div className="text-xs text-neutral-500">
              Date formats supported: <span className="font-mono">1/12/2025</span> (day-first) or <span className="font-mono">2025-12-01</span>.
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <button
              onClick={onRun}
              disabled={!file || loading}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Running..." : "Generate Recommendations"}
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        )}
      </section>

      {recs ? (
        <>
          <Dashboard recs={recs} onSelect={(r) => setSelected(r)} />
          <Drawer selected={selected} onClose={() => setSelected(null)} />
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600">
          Upload a CSV to see your dashboard here.
        </section>
      )}
    </main>
  );
}
