import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "Supply Chain AI",
  description: "SMB Inventory Planner",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-neutral-50 text-neutral-900">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

