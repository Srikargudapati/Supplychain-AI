"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { useState } from "react";

export default function AppDashboard() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold">Inventory AI Dashboard</h1>

          <div className="flex items-center gap-3">
            <OrganizationSwitcher />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Upload your inventory data
          </h2>

          <p className="mt-2 text-sm text-neutral-600">
            Upload a CSV file containing sales, stock, and lead time data.
          </p>

          {/* Upload box */}
          <div className="mt-6">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </div>

          {/* Action button */}
          <button
            disabled={!file}
            className="mt-6 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Generate AI Recommendations
          </button>

          {/* Placeholder result */}
          <div className="mt-8 rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500">
            AI recommendations will appear here after processing.
          </div>
        </div>
      </section>
    </main>
  );
}

