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
    rules: {
      userAgent: "*",
      allow: ["/", "/docs", "/pricing", "/self-hosted", "/support"],
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
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
