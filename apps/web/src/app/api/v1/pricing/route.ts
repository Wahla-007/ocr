import { NextResponse } from "next/server";
import { DEFAULT_COST_PER_PAGE_USD, FREE_TIER_MAX_ITEMS, FREE_TIER_MAX_PAGES_PER_ITEM } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    currency: "USD",
    base_rate_per_page: DEFAULT_COST_PER_PAGE_USD,
    description: "Ultra-low cost, high-speed pure CPU document extraction (<20MB RAM, zero heavy GPU markups)",
    plans: [
      {
        id: "free_trial",
        name: "Free Trial",
        monthly_fee: "$0",
        rate_per_page: "$0.000",
        max_items_allowed: FREE_TIER_MAX_ITEMS,
        max_pages_per_item: FREE_TIER_MAX_PAGES_PER_ITEM,
        rate_limit: "10 req/min",
        features: [
          `Up to ${FREE_TIER_MAX_ITEMS} lifetime documents`,
          `Max ${FREE_TIER_MAX_PAGES_PER_ITEM} pages per document`,
          "All document types (Invoices, Receipts, ID Cards, Passports)",
          "Standard community rate limit (10 req/min)",
          "Structured JSON & Plain Text extraction",
        ],
      },
      {
        id: "pro",
        name: "Pro Paid Plan",
        monthly_fee: "$9 / mo",
        rate_per_page: "$0.001",
        max_items_allowed: "Unlimited",
        max_pages_per_item: 500,
        rate_limit: "300 req/min",
        features: [
          "Unlimited lifetime documents",
          "Up to 500 pages per document",
          "High-throughput rate limit (300 req/min)",
          "Priority CPU inference queue",
          "Full Bounding Box spatial coordinates",
          "Structured Markdown + Table extraction",
          "Email support within 24h",
        ],
      },
      {
        id: "enterprise_self_hosted",
        name: "Self-Hosted Air-Gapped",
        monthly_fee: "Turnkey Open Source / Custom License",
        rate_per_page: "$0.0000 (Unlimited)",
        max_items_allowed: "Unlimited",
        max_pages_per_item: "Unlimited",
        rate_limit: "Hardware Bound",
        features: [
          "100% on-premises self-hosted Docker container",
          "Pure CPU runtime (<250MB image, <20MB idle RAM)",
          "Zero telemetry and zero external cloud network calls",
          "Full privacy compliance (HIPAA, GDPR, DPDP)",
          "REST API + CLI + Web UI included",
        ],
      },
    ],
    cost_comparison: {
      volume_5000_pages: {
        openocr_pro: "$5.00",
        aws_textract: "$75.00",
        google_document_ai: "$250.00",
        azure_form_recognizer: "$50.00",
        savings_percentage: "90% - 98%",
      },
      volume_50000_pages: {
        openocr_pro: "$40.00",
        aws_textract: "$750.00",
        google_document_ai: "$2,500.00",
        azure_form_recognizer: "$500.00",
        savings_percentage: "92% - 98.4%",
      },
    },
  });
}
