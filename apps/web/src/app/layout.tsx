import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenOCR - Universal Zero-Selection Document Extraction",
  description: "Drop any document, get instant structured intelligence with zero category selection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
