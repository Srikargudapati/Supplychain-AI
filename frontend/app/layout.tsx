import "./globals.css";

export const metadata = {
  title: "SMB Inventory Planner",
  description: "CSV → reorder recommendations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  );
}
