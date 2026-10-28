"use client";

import { authFetch } from "./auth";

export interface CatalogItem {
  code: string;
  name: string;
  type: "pack" | "subscription";
  price_minor: number;
  currency: string;
  credits: number;
  interval?: string;
  description: string;
}

export interface SubscriptionData {
  id: string;
  user_id: string;
  plan_code: string;
  status: "active" | "past_due" | "canceled" | "expired";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface OrderData {
  id: string;
  user_id: string;
  plan_code: string;
  amount_minor: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "canceled" | "refunded";
  provider: string;
  created_at: string;
  paid_at?: string;
}

export interface InvoiceData {
  id: string;
  invoice_number: string;
  order_id: string;
  amount_minor: number;
  tax_minor: number;
  currency: string;
  status: string;
  issued_at: string;
  line_items_json?: Array<{
    description: string;
    credits: number;
    amount_minor: number;
    currency: string;
  }>;
}

export interface BillingStatus {
  billing_enabled: boolean;
  provider: string;
  user_plan: string;
  credit_balance: number;
  subscription: SubscriptionData | null;
}

export interface CheckoutResult {
  order_id: string;
  checkout_url: string;
  plan_code: string;
  amount_minor: number;
  currency: string;
}

export const billingApi = {
  async getStatus(): Promise<BillingStatus> {
    return authFetch("/v1/billing/status", { method: "GET" });
  },

  async getCatalog(): Promise<{ items: CatalogItem[] }> {
    return authFetch("/v1/billing/catalog", { method: "GET" });
  },

  async checkout(planCode: string): Promise<CheckoutResult> {
    // Generate secure client-side idempotency key
    const idempotencyKey = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return authFetch("/v1/billing/checkout", {
      method: "POST",
      body: JSON.stringify({
        plan_code: planCode,
        idempotency_key: idempotencyKey,
      }),
    });
  },

  async getOrderStatus(orderId: string): Promise<OrderData> {
    return authFetch(`/v1/billing/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
    });
  },

  async getSubscription(): Promise<SubscriptionData | null> {
    return authFetch("/v1/billing/subscription", { method: "GET" });
  },

  async cancelSubscription(): Promise<SubscriptionData> {
    return authFetch("/v1/billing/subscription/cancel", {
      method: "POST",
    });
  },

  async resumeSubscription(): Promise<SubscriptionData> {
    return authFetch("/v1/billing/subscription/resume", {
      method: "POST",
    });
  },

  async getInvoices(): Promise<InvoiceData[]> {
    return authFetch("/v1/billing/invoices", { method: "GET" });
  },
};
