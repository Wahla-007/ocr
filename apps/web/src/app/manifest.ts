import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenOCR — Document Extraction Platform",
    short_name: "OpenOCR",
    description: "High-precision pure CPU document intelligence for invoices, receipts, and identity documents.",
    start_url: "/",
    display: "standalone",
    background_color: "#161618",
    theme_color: "#C85A32",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
