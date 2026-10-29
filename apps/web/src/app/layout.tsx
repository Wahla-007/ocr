import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/lib/theme";
import { StructuredData } from "@/components/StructuredData";
import { ChatWidget } from "@/components/ChatWidget";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openocr.io";

export const viewport: Viewport = {
  themeColor: "#C85A32",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OpenOCR — Research-Grade Document Extraction Platform",
    template: "%s | OpenOCR",
  },
  description:
    "High-precision pure CPU document intelligence for commercial invoices, retail receipts, identity credentials, and financial reports with zero template selection.",
  keywords: [
    "OCR API",
    "document extraction",
    "PDF to JSON",
    "invoice OCR",
    "receipt parser",
    "IBM Docling",
    "self-hosted OCR",
    "air-gapped document intelligence",
  ],
  authors: [{ name: "OpenOCR Engineering", url: siteUrl }],
  creator: "OpenOCR",
  publisher: "OpenOCR",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "OpenOCR — Research-Grade Document Extraction Platform",
    description:
      "Deterministic layout parsing and LLM structuring for financial and enterprise documents. Zero template selection, air-gap ready.",
    siteName: "OpenOCR",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenOCR — Research-Grade Document Extraction Platform",
    description:
      "Deterministic layout parsing and LLM structuring for financial and enterprise documents.",
    creator: "@openocr",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <StructuredData />
      </head>
      <body className="antialiased font-sans transition-colors duration-200">
        <ThemeProvider>
          {children}
          <ChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
