import { NextRequest, NextResponse } from "next/server";
import { generateApiKey, topUpKeyCredits, getApiKeyDetails } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const plan = body.plan || "pro";

    if (plan === "free") {
      return NextResponse.json(
        {
          error: "API keys are not permitted on the Free Plan. Programmatic API access requires a Developer or Enterprise paid plan. Visit /pricing to upgrade.",
          code: "API_KEY_NOT_ALLOWED_ON_FREE_PLAN",
          upgrade_url: "/pricing",
        },
        { status: 403 }
      );
    }

    const name = body.name || "Developer Production Key";
    const credits = body.credits || 25000;

    const newKey = generateApiKey(name, "pro", credits);

    return NextResponse.json({
      message: "API key created successfully",
      key: newKey.key,
      name: newKey.name,
      plan: newKey.plan,
      credits_remaining: newKey.creditsRemaining,
      cost_per_page: `$${newKey.costPerCreditUsd} USD`,
      created_at: newKey.createdAt,
      documentation_url: "/api-platform",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = body.key || req.headers.get("x-api-key");
    const amount = body.amount_credits || 5000;

    if (!key) {
      return NextResponse.json({ error: "Missing 'key' parameter" }, { status: 400 });
    }

    const updated = topUpKeyCredits(key, amount);
    if (!updated) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Credits added successfully",
      key: updated.key,
      credits_remaining: updated.creditsRemaining,
      balance_usd: `$${(updated.creditsRemaining * updated.costPerCreditUsd).toFixed(2)} USD`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || req.headers.get("x-api-key");
  if (!key) {
    return NextResponse.json({ error: "Pass 'key' query or 'x-api-key' header" }, { status: 400 });
  }
  const details = getApiKeyDetails(key);
  if (!details) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }
  return NextResponse.json({ key: details });
}
