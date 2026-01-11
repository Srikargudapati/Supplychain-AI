import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* Top bar */}
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-neutral-900" />
            <span className="text-sm font-semibold">Supply Chain AI</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Stop Guessing Inventory.
              <span className="text-neutral-500"> Start Planning with AI.</span>
            </h1>

            <p className="mt-4 text-lg text-neutral-700">
              AI-powered inventory planning for small manufacturers. Reduce excess
              stock, avoid stockouts, and protect your cash flow — without ERP
              complexity.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="rounded-2xl bg-neutral-900 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Upload Your Excel &amp; Get AI Recommendations
              </Link>
              <Link
                href="/app"
                className="rounded-2xl border border-neutral-300 bg-white px-6 py-3 text-center text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
              >
                Go to Dashboard
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 text-xs text-neutral-600">
              <div className="rounded-xl border border-neutral-200 p-3">
                <div className="font-semibold text-neutral-900">Minutes</div>
                <div>Setup time</div>
              </div>
              <div className="rounded-xl border border-neutral-200 p-3">
                <div className="font-semibold text-neutral-900">Cash</div>
                <div>Focused planning</div>
              </div>
              <div className="rounded-xl border border-neutral-200 p-3">
                <div className="font-semibold text-neutral-900">SME</div>
                <div>Built for you</div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
            <div className="text-sm font-semibold">What you get</div>
            <ul className="mt-4 space-y-3 text-sm text-neutral-700">
              <li className="rounded-xl border border-neutral-200 bg-white p-3">
                ✅ What to reorder + how much + when
              </li>
              <li className="rounded-xl border border-neutral-200 bg-white p-3">
                ✅ Cash impact before you buy
              </li>
              <li className="rounded-xl border border-neutral-200 bg-white p-3">
                ✅ AI explanations in plain English
              </li>
              <li className="rounded-xl border border-neutral-200 bg-white p-3">
                ✅ Demand spike + stockout risk alerts
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-bold">Built for small manufacturers</h2>
          <p className="mt-2 max-w-3xl text-neutral-700">
            Traditional ERPs are expensive and complex. We focus on the decisions
            that save cash and prevent stockouts.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["AI Reorder Recommendations", "Know exactly what to buy and when — SKU by SKU."],
              ["Cash Impact View", "See how much money will be locked before you order."],
              ["AI Explanations", "Every recommendation explained clearly."],
              ["Seasonality Detection", "Plan ahead for peak demand periods."],
              ["Supplier Lead Time Support", "Use real lead time to reduce surprises."],
              ["Multi-Company", "Manage multiple brands/factories with one login."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-3xl border border-neutral-200 p-6 shadow-sm">
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-2 text-sm text-neutral-700">{desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 rounded-3xl border border-neutral-200 bg-neutral-50 p-8 md:flex-row">
            <div>
              <div className="text-xl font-bold">Ready to try with your data?</div>
              <div className="mt-1 text-sm text-neutral-700">
                No credit card required. Cancel anytime.
              </div>
            </div>
            <Link
              href="/sign-up"
              className="rounded-2xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Start Free Trial
            </Link>
          </div>

          <footer className="mt-10 border-t border-neutral-200 pt-6 text-sm text-neutral-600 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div>© {new Date().getFullYear()} Supply Chain AI</div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-neutral-900">Privacy</a>
              <a href="#" className="hover:text-neutral-900">Terms</a>
              <a href="mailto:hello@example.com" className="hover:text-neutral-900">Contact</a>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
