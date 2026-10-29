import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openocr.io";
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction && process.env.VERCEL_ENV !== "production") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs", "/pricing", "/self-hosted", "/support", "/llms.txt"],
        disallow: [
          "/api/",
          "/v1/",
          "/billing",
          "/verify-email",
          "/reset-password",
          "/forgot-password",
          "/login",
          "/signup",
          "/dev/",
          "/registry/",
        ],
      },
      // Search and Retrieval AI Crawlers explicitly welcomed for AEO/GEO indexing
      {
        userAgent: ["GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended"],
        allow: ["/", "/docs", "/pricing", "/self-hosted", "/support", "/llms.txt"],
        disallow: [
          "/api/",
          "/v1/",
          "/billing",
          "/verify-email",
          "/reset-password",
          "/forgot-password",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
