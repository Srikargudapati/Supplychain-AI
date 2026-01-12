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
  forecast_30d: number;
  reorder_qty: number;
  status: "RED" | "AMBER" | "GREEN" | string;
  reason: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

/* ===================== SIMPLE AI REASON ===================== */
function simpleReason(r: Recommendation) {
  if (r.status === "RED")
    return "Urgent reorder needed to avoid stockout.";
  if (r.status === "AMBER")
    return "Reorder soon to stay within safe stock levels.";
  return "Stock level is healthy.";
}

/* ===================== PURCHASE ORDER PANEL ===================== */
function PurchaseOrderPanel({
  items,
  onClose,
}: {
  items: Recommendation[];
  onClose: () => void;
}) {
  if (items.length === 0) return null;

  const totalQty = items.reduce((s, i) => s + i.reorder_qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-500"
        >
          ✕
        </button>

        <h2 className="text-xl font-extrabold text-indigo-700">
          Purchase Order Preview
        </h2>

        <p className="mt-1 text-sm text-neutral-600">
          Review items before sending to supplier
        </p>

        <div className="mt-6 overflow-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-neutral-600">
              <tr>
                <th className="text-left">SKU</th>
                <th>Qty</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.sku} className="border-b">
                  <td className="py-2 font-mono">{i.sku}</td>
                  <td className="text-center font-semibold">
                    {Math.round(i.reorder_qty)}
                  </td>
                  <td className="text-neutral-600">
                    {simpleReason(i)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl bg-indigo-50 p-4">
          <div className="text-sm font-semibold text-indigo-700">
            Total Units to Order
          </div>
          <div className="text-2xl font-extrabold text-indigo-800">
            {Math.round(totalQty)}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white">
            Download PO (CSV)
          </button>
          <button className="flex-1 rounded-xl border px-4 py-3 text-sm font-semibold">
            Send to Supplier
          </button>
        </div>
      </div>
    </div>
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

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [showPO, setShowPO] = useState(false);

  async function runAI() {
    setError(null);
    setRecs(null);
    setSelected({});

    if (!file) return setError("Please upload a CSV file");
    if (!organization?.id)
      return setError("Please select a company");

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

  const selectedItems =
    recs?.filter((r) => selected[r.sku] && r.reorder_qty > 0) || [];

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
          <div className="flex gap-3 items-center">
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

      {/* TABLE */}
      {recs && (
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <div className="rounded-3xl bg-white p-6 shadow overflow-x-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">SKU Recommendations</h3>
              <button
                onClick={() => setShowPO(true)}
                disabled={selectedItems.length === 0}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Generate Purchase Order ({selectedItems.length})
              </button>
            </div>

            <table className="w-full text-sm">
              <thead className="border-b text-neutral-600">
                <tr>
                  <th></th>
                  <th>Status</th>
                  <th>SKU</th>
                  <th>Forecast</th>
                  <th>Reorder</th>
                  <th>AI Reason</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((r) => (
                  <tr key={r.sku} className="border-b">
                    <td>
                      <input
                        type="checkbox"
                        checked={!!selected[r.sku]}
                        disabled={r.reorder_qty <= 0}
                        onChange={() =>
                          setSelected((prev) => ({
                            ...prev,
                            [r.sku]: !prev[r.sku],
                          }))
                        }
                      />
                    </td>
                    <td>
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
                    <td className="text-neutral-600">
                      {simpleReason(r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* PO PANEL */}
      {showPO && (
        <PurchaseOrderPanel
          items={selectedItems}
          onClose={() => setShowPO(false)}
        />
      )}
    </main>
  );
}
