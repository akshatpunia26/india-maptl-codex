import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "maptl - Codex Delhi",
  description: "A new interface for place, culture, and discovery. Understand any city through its surviving historical layers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}
