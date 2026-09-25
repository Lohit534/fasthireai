"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Sparkles, Loader2, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { useUpgradeModalStore } from "@/store/useUpgradeModalStore";

const TABLE_ROWS = [
  { feature: "Improvements / month", free: "2", pro: "20 / 90" },
  { feature: "ATS score & analysis", free: "✓", pro: "✓" },
  { feature: "Live preview", free: "✓", pro: "✓" },
  { feature: "PDF & DOCX download", free: "—", pro: "✓" },
  { feature: "Cover letters / month", free: "1 (lifetime)", pro: "5 / 15" },
  { feature: "Skill roadmaps / month", free: "1", pro: "5 / 15" },
  { feature: "Build resumes from scratch", free: "3", pro: "20 / 40" },
  { feature: "AI resume builder", free: "—", pro: "✓" },
  { feature: "Import resume via AI", free: "—", pro: "✓" },
  { feature: "History retention", free: "1 month", pro: "2 / 4 mo" },
  { feature: "24/7 AI Chatbot & Coach", free: "—", pro: "Pro Max" },
  { feature: "Job application tracker", free: "✓", pro: "✓" },
  { feature: "Referral bonus", free: "+1 per friend", pro: "+1 per friend" },
];

export default function UpgradePaywallModal() {
  const router = useRouter();
  const { isOpen, options, closeModal } = useUpgradeModalStore();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string>("free");

  // Load user plan on open
  useEffect(() => {
    if (isOpen) {
      const fetchPlan = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const cachedPlan = localStorage.getItem(`fastHire_plan_${user.id}`);
          if (cachedPlan) {
            setActivePlan(cachedPlan);
          } else {
            // Optional: fetch from API if not cached, but cached is usually reliable since navbar sets it
            fetch("/api/credits")
              .then(res => res.json())
              .then(data => {
                if (data.isOwner) setActivePlan("owner");
                else if (data.paidCredits >= 90) setActivePlan("promax");
                else if (data.paidCredits > 0) setActivePlan("premium");
                else setActivePlan("free");
              })
              .catch(() => setActivePlan("free"));
          }
        }
      };
      fetchPlan();
    }
  }, [isOpen]);

  // Load Razorpay checkout script if needed
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const rawBadge = options.badge || "PRO";
  const badgeText = rawBadge.replace(/ACCESS\s*FEATURE|ACCESS/gi, "").trim() || "PRO";
  const titleText = options.title || "Your 2 free optimizations are used up";
  const descriptionText =
    options.description ||
    "Your optimized resume is saved and stays in your history. Upgrade to continue optimizing, downloading, and unlocking powerful AI career features.";

  const handleUpgrade = async (planId: "premium" | "promax") => {
    try {
      setLoadingPlan(planId);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to upgrade your plan.");
        closeModal();
        router.push("/login");
        return;
      }

      // Check if user is owner
      const isOwner = (user.email || "").toLowerCase().trim() === (process.env.NEXT_PUBLIC_OWNER_EMAIL || "lohit534@gmail.com").toLowerCase().trim();
      if (isOwner) {
        try {
          await fetch("/api/credits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId, billingCycle }),
          });
          localStorage.setItem(`fastHire_plan_${user.id}`, planId);
          toast.success(`Owner Bypass: Switched to ${planId === "premium" ? "Premium Pro" : "Pro Max"}!`);
          closeModal();
          window.location.reload();
          return;
        } catch (e: any) {
          toast.error("Failed to switch plan for owner account.");
        }
      }

      // 1. Create Razorpay order
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to initialize payment gateway.");
      }

      const orderData = await orderRes.json();

      if (!(window as any).Razorpay) {
        toast.error("Razorpay SDK is loading. Please try again in a few seconds.");
        return;
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: "INR",
        name: "FastHire AI",
        description: planId === "premium" ? "FastHire Premium Pro (20 Optimizations)" : "FastHire Pro Max (90 Optimizations)",
        image: "/logo.png",
        order_id: orderData.orderId,
        prefill: {
          email: user.email || "",
          name: user.user_metadata?.full_name || "",
        },
        theme: {
          color: "#0d6e5a",
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId,
                billingCycle,
              }),
            });

            if (!verifyRes.ok) {
              throw new Error("Payment signature verification failed.");
            }

            localStorage.setItem(`fastHire_plan_${user.id}`, planId);
            toast.success("Payment verified! Plan successfully upgraded! 🎉");
            closeModal();
            window.location.reload();
          } catch (err: any) {
            toast.error(err.message || "Failed to verify payment with server.");
          }
        },
        modal: {
          ondismiss: () => {
            setLoadingPlan(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        toast.error(response.error?.description || "Payment failed or cancelled.");
        setLoadingPlan(null);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Could not start payment.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Section */}
        <div className="p-5 sm:p-7 pb-4 bg-white border-b border-slate-100 flex flex-col gap-3 relative">
          
          {/* Absolute Close Button for Mobile Accessibility */}
          <button
            type="button"
            onClick={closeModal}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 h-8 w-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer z-50 shadow-sm"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pr-10 sm:pr-14">
            <div>
              <span className="inline-block text-[11px] sm:text-xs font-black tracking-widest uppercase text-[#0d6e5a] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {badgeText}
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-2">
                {titleText}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {descriptionText}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto mt-2 sm:mt-0">
              <div className="bg-slate-100 p-1 rounded-full flex items-center gap-1 border border-slate-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                    billingCycle === "yearly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>Annual</span>
                  <span className="bg-emerald-100 text-[#0d6e5a] text-[10px] font-black px-1.5 py-0.5 rounded-full border border-emerald-200">
                    2 months free
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Center Body: Comparison Table & 3 Plans */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Comparison Table */}
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">FEATURE</th>
                  <th className="py-3 px-4 text-center">FREE</th>
                  <th className="py-3 px-4 text-center text-[#0d6e5a] font-black">PRO / POWER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px] font-medium text-slate-700">
                {TABLE_ROWS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 sm:px-6 text-slate-700 font-semibold">{row.feature}</td>
                    <td className="py-2.5 px-4 text-center text-slate-500">
                      {row.free === "✓" ? (
                        <Check className="h-4 w-4 text-slate-500 inline-block" />
                      ) : (
                        row.free
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-[#0d6e5a]">
                      {row.pro === "✓" ? (
                        <Check className="h-4 w-4 text-[#0d6e5a] inline-block stroke-[2.5]" />
                      ) : (
                        row.pro
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 3 Plan Cards Grid — Text matching Pricing Page */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Plan 1: Free Career Tier */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Free Career Tier</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Perfect for casual job seekers needing basic optimization.
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">₹0</span>
                  <span className="text-xs text-slate-500 font-semibold">/ forever</span>
                </div>
                <div className="border-t border-slate-100 my-3" />
                <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>2 AI resume optimizations per month</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>1 resume download (PDF + DOCX)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>1 cover letter download (PDF + DOCX)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Job application tracker</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                disabled={activePlan === "free" || activePlan === "owner"}
                className={`mt-4 w-full py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                  activePlan === "free" || activePlan === "owner" 
                    ? "bg-slate-100 text-slate-500 cursor-default" 
                    : "bg-slate-100 text-slate-500 opacity-50 cursor-not-allowed"
                }`}
              >
                {activePlan === "free" || activePlan === "owner" ? "Current Plan" : "Included"}
              </button>
            </div>

            {/* Plan 2: Premium Pro (MOST PICKED) */}
            <div className="border-2 border-[#0d6e5a] rounded-2xl p-4 bg-emerald-50/20 flex flex-col justify-between shadow-md relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0d6e5a] text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                MOST PICKED
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-[#0d6e5a]">Premium Pro</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  For active job hunters targeting multiple roles.
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">
                    {billingCycle === "yearly" ? "₹166" : "₹99"}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    / {billingCycle === "yearly" ? "year" : "month"}
                  </span>
                </div>
                <div className="border-t border-emerald-100 my-3" />
                <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-1.5 font-bold text-[#0d6e5a]">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>20 AI resume optimizations per month</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Unlimited PDF + DOCX downloads</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>5 cover letters / month</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Skills learning roadmap (5/month)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Build up to 20 resumes from scratch</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>AI resume builder (improve bullets, write summary)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Import resume via AI</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Optimization history logs (2 months retention)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Job application tracker</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleUpgrade("premium")}
                disabled={loadingPlan === "premium" || activePlan === "premium" || activePlan === "promax" || activePlan === "owner"}
                className={`mt-4 w-full py-2 px-3 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  activePlan === "premium" 
                    ? "bg-emerald-100 text-emerald-800 cursor-default" 
                    : activePlan === "promax" || activePlan === "owner"
                    ? "bg-slate-100 text-slate-500 opacity-50 cursor-not-allowed"
                    : "bg-[#0d6e5a] hover:bg-[#094d3f] text-white cursor-pointer disabled:opacity-70"
                }`}
              >
                {loadingPlan === "premium" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : activePlan === "premium" ? (
                  <span>Current Plan</span>
                ) : activePlan === "promax" || activePlan === "owner" ? (
                  <span>Included in Pro Max</span>
                ) : (
                  <>
                    <span>Upgrade to Pro</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Plan 3: Pro Max */}
            <div className="border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 bg-white flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900">Pro Max</h3>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-[#0d6e5a] border border-emerald-200">
                    POWER TIER
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  For active career changers needing maximum optimization power and 24/7 AI features.
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">
                    {billingCycle === "yearly" ? "₹332" : "₹199"}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    / {billingCycle === "yearly" ? "year" : "month"}
                  </span>
                </div>
                <div className="border-t border-slate-100 my-3" />
                <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-1.5 font-bold text-[#0d6e5a]">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>90 AI resume optimizations per month</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Unlimited PDF + DOCX downloads</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>15 cover letters / month</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Skills learning roadmap (15/month)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Build up to 40 resumes from scratch</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>24/7 AI Chatbot &amp; Assistant</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>AI resume builder (improve bullets, write summary)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Import resume via AI</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Optimization history logs (4 months retention)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Job application tracker</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleUpgrade("promax")}
                disabled={loadingPlan === "promax" || activePlan === "promax" || activePlan === "owner"}
                className={`mt-4 w-full py-2 px-3 rounded-xl font-extrabold text-xs shadow transition-all flex items-center justify-center gap-1.5 ${
                  activePlan === "promax" || activePlan === "owner"
                    ? "bg-emerald-100 text-emerald-800 cursor-default" 
                    : "bg-[#0d6e5a] hover:bg-[#0a5a49] text-white cursor-pointer disabled:opacity-70"
                }`}
              >
                {loadingPlan === "promax" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : activePlan === "promax" || activePlan === "owner" ? (
                  <span>Current Plan</span>
                ) : (
                  <>
                    <span>Upgrade to Pro Max</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-[#0d6e5a]" />
          <span>PCI-DSS Compliant 256-Bit SSL Razorpay Payment &bull; Instant Activation</span>
        </div>
      </div>
    </div>
  );
}
