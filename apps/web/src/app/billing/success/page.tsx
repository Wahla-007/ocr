"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { billingApi, OrderData } from "@/lib/billing";
import {
  CheckCircle2,
  RotateCw,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided. Please navigate from your billing dashboard.");
      setLoading(false);
      return;
    }

    let isSubscribed = true;
    let pollCount = 0;
    const maxPolls = 15; // 30 seconds max

    const checkStatus = async () => {
      try {
        const orderData = await billingApi.getOrderStatus(orderId);
        if (!isSubscribed) return;

        setOrder(orderData);
        setAttempts(pollCount);

        if (orderData.status === "paid" || orderData.status === "failed") {
          setLoading(false);
          return;
        }

        pollCount += 1;
        if (pollCount >= maxPolls) {
          // Timeout reached while still pending
          setLoading(false);
          return;
        }

        // Retry in 2 seconds
        setTimeout(checkStatus, 2000);
      } catch (err: any) {
        if (!isSubscribed) return;
        setError(err?.message || "Failed to fetch order confirmation.");
        setLoading(false);
      }
    };

    checkStatus();

    return () => {
      isSubscribed = false;
    };
  }, [orderId]);

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      {/* Loading / Polling State */}
      {loading && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
            <RotateCw className="w-7 h-7 animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Confirming Payment</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Verifying transaction with Safepay gateway and granting ledger credits...
            </p>
          </div>
          <div className="text-xs font-mono text-zinc-500">
            Checking status (attempt {attempts + 1})...
          </div>
        </div>
      )}

      {/* Confirmed Paid State */}
      {!loading && order && order.status === "paid" && (
        <div className="rounded-2xl border border-emerald-500/40 bg-zinc-900/70 p-8 space-y-6 shadow-2xl shadow-emerald-500/10">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-white">Payment Confirmed!</h1>
            <p className="text-sm text-zinc-300">
              Your credits and subscription entitlements have been deposited into your append-only usage ledger.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs font-mono text-left space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span>Order ID:</span>
              <span className="text-zinc-200">{order.id}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Plan / Item:</span>
              <span className="text-emerald-400 font-semibold">{order.plan_code}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Amount Paid:</span>
              <span className="text-zinc-200">
                {(order.amount_minor / 100).toFixed(2)} {order.currency}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/docs"
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Open Developer Documentation</span>
            </Link>
            <Link
              href="/billing"
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors"
            >
              View Billing Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Timeout / Still Pending State */}
      {!loading && order && order.status === "pending" && (
        <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/60 p-8 space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Payment Still Processing</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Safepay is taking slightly longer than usual to confirm the transaction. Don't worry—as soon as the webhook event arrives, your credits will be granted automatically.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/billing"
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-white text-zinc-950 font-bold text-xs"
            >
              <span>Check Billing Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Error or Failed State */}
      {!loading && (error || (order && order.status === "failed")) && (
        <div className="rounded-2xl border border-rose-500/30 bg-zinc-900/60 p-8 space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Payment Verification Issue</h1>
            <p className="text-sm text-rose-300 leading-relaxed">
              {error || "The payment transaction was declined or failed to complete."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors"
            >
              <span>Return to Pricing & Try Again</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white">
      <Header />
      <Suspense
        fallback={
          <div className="max-w-xl mx-auto px-4 py-20 text-center text-zinc-400 font-mono text-xs">
            Loading order verification...
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  );
}
