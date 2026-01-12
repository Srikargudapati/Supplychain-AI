function AISummaryCard({ recs }: { recs: Recommendation[] }) {
  const totalForecast = recs.reduce((s, r) => s + (r.forecast_30d || 0), 0);
  const totalReorder = recs.reduce((s, r) => s + (r.reorder_qty || 0), 0);

  const red = recs.filter((r) => r.status === "RED");
  const amber = recs.filter((r) => r.status === "AMBER");
  const green = recs.filter((r) => r.status === "GREEN");

  const topReorder = [...recs]
    .sort((a, b) => (b.reorder_qty || 0) - (a.reorder_qty || 0))
    .slice(0, 3)
    .filter((r) => (r.reorder_qty || 0) > 0);

  const topRisk = [...red, ...amber].slice(0, 3);

  return (
    <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-600 via-indigo-600 to-sky-600 p-6 text-white shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            🧠 AI Summary
          </div>
          <h3 className="mt-3 text-xl font-extrabold">
            What to do next (based on your upload)
          </h3>
          <p className="mt-2 text-sm text-white/90 leading-relaxed">
            You have{" "}
            <span className="font-extrabold">{red.length}</span> high-risk SKU(s){" "}
            and <span className="font-extrabold">{amber.length}</span> medium-risk
            SKU(s). Total 30-day demand forecast is{" "}
            <span className="font-extrabold">{Math.round(totalForecast)}</span>{" "}
            units and recommended reorder is{" "}
            <span className="font-extrabold">{Math.round(totalReorder)}</span>{" "}
            units.
          </p>
        </div>

        <div className="hidden sm:grid gap-2 text-right">
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <div className="text-xs text-white/80">High risk</div>
            <div className="text-2xl font-extrabold">{red.length}</div>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <div className="text-xs text-white/80">Medium risk</div>
            <div className="text-2xl font-extrabold">{amber.length}</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-white/10 p-5">
          <div className="text-sm font-bold">✅ Top Actions</div>
          <ul className="mt-3 space-y-2 text-sm text-white/95">
            {topRisk.length === 0 && topReorder.length === 0 ? (
              <li className="text-white/85">
                No urgent actions found. Inventory looks stable.
              </li>
            ) : (
              <>
                {topRisk.map((r) => (
                  <li key={`risk-${r.sku}`} className="flex gap-2">
                    <span className="mt-[2px]">⚠️</span>
                    <span>
                      <span className="font-mono font-semibold">{r.sku}</span>:{" "}
                      {r.status === "RED"
                        ? "Order now to avoid stockout."
                        : "Order soon to stay safe."}{" "}
                      {r.reorder_by ? (
                        <span className="text-white/85">
                          (By {r.reorder_by})
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
                {topReorder.map((r) => (
                  <li key={`reorder-${r.sku}`} className="flex gap-2">
                    <span className="mt-[2px]">🛒</span>
                    <span>
                      <span className="font-mono font-semibold">{r.sku}</span>:
                      reorder{" "}
                      <span className="font-extrabold">
                        {Math.round(r.reorder_qty || 0)}
                      </span>{" "}
                      units.
                    </span>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>

        <div className="rounded-3xl bg-white/10 p-5">
          <div className="text-sm font-bold">📊 Health Snapshot</div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-xs text-white/80">RED</div>
              <div className="text-xl font-extrabold">{red.length}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-xs text-white/80">AMBER</div>
              <div className="text-xl font-extrabold">{amber.length}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-xs text-white/80">GREEN</div>
              <div className="text-xl font-extrabold">{green.length}</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-white/85">
            Tip: Focus first on RED SKUs (stockout risk within lead time), then AMBER.
          </div>
        </div>
      </div>
    </div>
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
