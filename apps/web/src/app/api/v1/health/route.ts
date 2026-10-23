import { NextResponse } from "next/server";
import { DEFAULT_COST_PER_PAGE_USD } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "openocr-api",
    version: "1.0.0",
    engine: "rapidocr-cpu-lightweight",
    cost_per_page: `$${DEFAULT_COST_PER_PAGE_USD} USD`,
    timestamp: new Date().toISOString(),
    supported_formats: ["json", "markdown", "text"],
    endpoints: {
      extract: "/api/v1/extract",
      usage: "/api/v1/usage",
      keys: "/api/v1/keys",
      pricing: "/api/v1/pricing",
    },
  });
}
