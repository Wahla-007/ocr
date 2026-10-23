import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, getApiKeyDetails, DEFAULT_COST_PER_PAGE_USD } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const apiKeyHeader =
    req.headers.get("x-api-key") ||
    req.headers.get("X-API-Key") ||
    req.headers.get("authorization") ||
    req.headers.get("Authorization") ||
    req.nextUrl.searchParams.get("api_key");

  const auth = validateApiKey(apiKeyHeader);
  if (!auth.valid && auth.statusCode !== 402) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: auth.error || "Valid API Key required to view usage",
        },
      },
      { status: 401 }
    );
  }

  const record = auth.record || getApiKeyDetails(apiKeyHeader || "");
  if (!record) {
    return NextResponse.json({ error: "Key record not found" }, { status: 404 });
  }

  const currentBalanceUsd = (record.creditsRemaining * record.costPerCreditUsd).toFixed(3);
  const totalSpentUsd = (record.creditsUsed * record.costPerCreditUsd).toFixed(3);

  return NextResponse.json({
    account: {
      key: `${record.key.substring(0, 12)}...${record.key.substring(record.key.length - 4)}`,
      name: record.name,
      plan: record.plan,
      rate_limit: `${record.rateLimitPerMinute} requests / min`,
    },
    metering: {
      cost_per_page_usd: record.costPerCreditUsd,
      credits_remaining: record.creditsRemaining,
      credits_used: record.creditsUsed,
      balance_usd: `$${currentBalanceUsd}`,
      total_spent_usd: `$${totalSpentUsd}`,
    },
    pricing_tier: {
      name: "Developer Pay-As-You-Go",
      rate: "$0.001 per page",
      unit: "USD",
      aws_textract_comparison: "93% cheaper than AWS Textract ($0.015/page)",
      google_docai_comparison: "98% cheaper than Google Cloud Document AI ($0.05/page)",
    },
  });
}
