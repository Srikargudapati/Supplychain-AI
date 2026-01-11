
"use client";

import React, { useMemo, useState } from "react";

export type Recommendation = {
  sku: string;
  current_stock: number;
  avg_daily_sales: number;
  forecast_30d: number;
  reorder_qty: number;
  reorder_by: string | null;
  lead_time_days: number;
  moq: number | null;
  unit_cost: number | null;
  status: "RED" | "AMBER" | "GREEN";
  reason: string;
};

function StatusPill({ status }: { status: Recommendation["status"] }) {
  const cls =
    status === "RED"
      ? "bg-red-100 text-red-800"
      : status === "AMBER"
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export function Dashboard({ recs, onSelect }: { recs: Recommendation[]; onSelect: (r: Recommendation) => void }) {
  const counts = useMemo(() => {
    const red = recs.filter(r => r.status === "RED").length;
    const amber = recs.filter(r => r.status === "AMBER").length;
    const green = recs.filter(r => r.status === "GREEN").length;
    const excessValue = recs
      .filter(r => r.avg_daily_sales > 0 && r.current_stock > r.avg_daily_sales * 90)
      .reduce((sum, r) => sum + (r.unit_cost ?? 0) * (r.current_stock - r.avg_daily_sales * 90), 0);
    const cashTie = recs.reduce((sum, r) => sum + (r.unit_cost ?? 0) * r.current_stock, 0);
    return { red, amber, green, excessValue, cashTie };
  }, [recs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="At Risk" value={`${counts.red} SKUs`} subtitle="Next 30 days" icon="🔴" />
        <Card title="Excess" value={money(counts.excessValue)} subtitle="Overstock (approx)" icon="🟡" />
        <Card title="Healthy" value={`${counts.green} SKUs`} subtitle="On track" icon="🟢" />
        <Card title="Cash Tie" value={money(counts.cashTie)} subtitle="Inventory value (if cost provided)" icon="💰" />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Recommended Actions (Next 30 Days)</h2>
            <p className="text-sm text-neutral-600">Click a SKU to see the “why” and reorder-by date.</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr className="border-b">
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Avg/day</th>
                <th className="py-2 pr-4">Forecast 30d</th>
                <th className="py-2 pr-4">Reorder Qty</th>
                <th className="py-2 pr-4">Reorder By</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((r) => (
                <tr
                  key={r.sku}
                  className="cursor-pointer border-b last:border-0 hover:bg-neutral-50"
                  onClick={() => onSelect(r)}
                >
                  <td className="py-3 pr-4 font-medium">{r.sku}</td>
                  <td className="py-3 pr-4">{num(r.current_stock)}</td>
                  <td className="py-3 pr-4">{num(r.avg_daily_sales)}</td>
                  <td className="py-3 pr-4">{num(r.forecast_30d)}</td>
                  <td className="py-3 pr-4 font-semibold">{num(r.reorder_qty)}</td>
                  <td className="py-3 pr-4">{r.reorder_by ?? "—"}</td>
                  <td className="py-3 pr-4"><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-neutral-600">{title}</div>
          <div className="mt-1 text-2xl font-bold">{value}</div>
          <div className="mt-1 text-xs text-neutral-500">{subtitle}</div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

export function Drawer({ selected, onClose }: { selected: Recommendation | null; onClose: () => void }) {
  if (!selected) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{selected.sku}</h3>
            <p className="text-sm text-neutral-600">SKU detail & recommendation</p>
          </div>
          <button
            className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-neutral-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <Row label="Current Stock" value={`${num(selected.current_stock)} units`} />
          <Row label="Avg Daily Sales" value={`${num(selected.avg_daily_sales)} units`} />
          <Row label="Lead Time" value={`${selected.lead_time_days} days`} />
          <Row label="Forecast (30d)" value={`${num(selected.forecast_30d)} units`} />
          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">Recommended Action</div>
            <div className="mt-1 text-lg font-bold">Reorder {num(selected.reorder_qty)} units</div>
            <div className="text-sm text-neutral-700">Order by: {selected.reorder_by ?? "—"}</div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">Why</div>
            <p className="mt-2 text-neutral-800">{selected.reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-neutral-600">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function num(n: number) {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
}
function money(n: number) {
  if (!isFinite(n) || n === 0) return "$0";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
