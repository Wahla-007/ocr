import { NextResponse } from "next/server";
import { DEFAULT_COST_PER_PAGE_USD } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    currency: "USD",
    base_rate_per_page: DEFAULT_COST_PER_PAGE_USD,
    description: "Ultra-low cost, high-speed pure CPU document extraction (<20MB RAM, zero heavy GPU markups)",
    plans: [
      {
        id: "developer_payg",
        name: "Developer Pay-As-You-Go",
        monthly_fee: "$0",
        rate_per_page: "$0.001",
        included_pages: 1000,
        rate_limit: "120 req/min",
        features: [
          "Zero monthly commitment",
          "All document types (Invoices, Receipts, ID Cards, Passports)",
          "Structured JSON + Markdown + Plain Text",
          "Bounding box coordinates",
          "Multi-lingual OCR support",
        ],
      },
      {
        id: "starter",
        name: "Starter Growth",
        monthly_fee: "$9 / mo",
        rate_per_page: "$0.0009",
        included_pages: 10000,
        rate_limit: "240 req/min",
        features: [
          "10,000 pages included per month",
          "Overages at $0.0009 / page",
          "Up to 5 team API keys",
          "Priority inference queue",
          "Email support within 24h",
        ],
      },
      {
        id: "pro_scale",
        name: "Pro Scale",
        monthly_fee: "$49 / mo",
        rate_per_page: "$0.0008",
        included_pages: 60000,
        rate_limit: "600 req/min",
        features: [
          "60,000 pages included per month",
          "Overages at $0.0008 / page",
          "Unlimited team API keys",
          "99.9% uptime SLA",
          "Webhook notifications & batch processing",
        ],
      },
      {
        id: "enterprise_self_hosted",
        name: "Enterprise Air-Gapped",
        monthly_fee: "Custom flat license",
        rate_per_page: "$0.0000 (Unlimited)",
        included_pages: "Unlimited",
        rate_limit: "Unlimited (Hardware bound)",
        features: [
          "Air-gapped self-hosted Docker container",
          "Zero cloud data transmission (100% on-premises)",
          "DPDP & HIPAA compliant",
          "Dedicated technical account manager",
        ],
      },
    ],
    cost_comparison: {
      volume_5000_pages: {
        openocr: "$5.00",
        aws_textract: "$75.00",
        google_document_ai: "$250.00",
        azure_form_recognizer: "$50.00",
        savings_percentage: "90% - 98%",
      },
      volume_50000_pages: {
        openocr: "$40.00",
        aws_textract: "$750.00",
        google_document_ai: "$2,500.00",
        azure_form_recognizer: "$500.00",
        savings_percentage: "92% - 98.4%",
      },
    },
  });
}
