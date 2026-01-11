import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "Supply Chain AI",
  description: "AI-powered inventory planning for small manufacturers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-white text-neutral-900">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
