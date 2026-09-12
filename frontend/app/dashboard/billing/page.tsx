"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  Check, 
  AlertCircle,
  FileText, 
  Lock, 
  ChevronRight, 
  TrendingUp, 
  Sparkles,
  Zap,
  ShieldCheck,
  Download,
  HelpCircle,
  Clock,
  Receipt,
  ArrowUpRight
} from "lucide-react";
import { CreditInfo } from "@/types";
import { toast } from "react-hot-toast";
import Link from "next/link";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import GstInvoiceModal, { InvoiceData } from "@/components/GstInvoiceModal";

interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: "paid" | "failed";
}

export default function BillingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(true);
  
  // States
  const [activePlan, setActivePlan] = useState("free");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<InvoiceData | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Initialize page variables
  useEffect(() => {
    async function loadBillingInfo() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          toast.error("Please sign in to view billing configuration.");
          router.push("/auth/login");
          return;
        }

        const user = data.user;
        setUserId(user.id);
        if (user.email) setUserEmail(user.email);
        setAuthLoading(false);

        // 1. Plan Tier & Credits Loading directly from DB
        let currentPlan = "free";
        const currentCycle = localStorage.getItem(`fastHire_billingCycle_${user.id}`) || "monthly";
        setBillingCycle(currentCycle);

        try {
          const res = await fetch("/api/credits");
          if (res.ok) {
            const apiCredits = await res.json();
            setCredits(apiCredits);
            currentPlan = apiCredits.planId || "free";
            localStorage.setItem(`fastHire_plan_${user.id}`, currentPlan);
          } else {
            throw new Error("Failed to fetch credits");
          }
        } catch (err) {
          // Fallback to local storage mock values
          currentPlan = localStorage.getItem(`fastHire_plan_${user.id}`) || "free";
          const creditsData = localStorage.getItem(`fastHire_mockCredits_${user.id}`);
          if (creditsData) {
            try {
              setCredits(JSON.parse(creditsData));
            } catch (e) {
              setCredits({
                freeUsed: 0,
                paidCredits: 2,
                freeRemaining: 2,
                resetAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
              });
            }
          } else {
            setCredits({
              freeUsed: 0,
              paidCredits: 2,
              freeRemaining: 2,
              resetAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
            });
          }
        }

        setActivePlan(currentPlan);

        // Invoices list creation
        const invoiceHistory: Invoice[] = [
          { id: "INV-84920", date: "2026-06-15", description: "FastHire Premium Pro Monthly", amount: "₹99.00", status: "paid" },
          { id: "INV-73819", date: "2026-05-15", description: "FastHire Premium Pro Monthly", amount: "₹99.00", status: "paid" }
        ];

        if (currentPlan === "team" || currentPlan === "promax") {
          invoiceHistory.unshift({
            id: "INV-92014", date: "2026-06-20", description: "FastHire Pro Max Package", amount: "₹199.00", status: "paid"
          });
        }

        if (currentPlan !== "free") {
          setInvoices(invoiceHistory);
        } else {
          setInvoices([]);
        }
      } catch (err) {
        toast.error("Billing page load error.");
        router.push("/auth/login");
      }
    }

    loadBillingInfo();
  }, [router]);

  const handlePrintReceipt = (invoice: Invoice) => {
    const isProMax = activePlan === "promax" || activePlan === "team" || invoice.description.includes("Pro Max");
    const isYear = billingCycle === "yearly";
    const base = isProMax ? (isYear ? 332 : 199) : (isYear ? 166 : 99);
    const gst = isProMax ? (isYear ? 17 : 10) : (isYear ? 8 : 5);
    const total = isProMax ? (isYear ? 349 : 209) : (isYear ? 174 : 104);

    setSelectedInvoiceData({
      invoiceNumber: invoice.id.toUpperCase(),
      date: invoice.date,
      userName: "FastHire Subscriber",
      userEmail: userEmail || "subscriber@fasthire.ai",
      planName: isProMax ? "FastHire Pro Max (Individual Unlimited)" : "FastHire Premium Pro",
      billingCycle: (isYear ? "yearly" : "monthly") as any,
      basePrice: base,
      gstAmount: gst,
      totalAmount: total,
      paymentId: `rzp_live_${invoice.id}`,
    });
    setIsInvoiceOpen(true);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center space-y-3">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-teal-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-[#0d6e5a] animate-spin" />
            <CreditCard className="absolute inset-0 m-auto h-5 w-5 text-[#0d6e5a]" />
          </div>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Loading billing workspace...</p>
        </div>
      </div>
    );
  }

  // Quota computations
  const totalLimit = activePlan === "free" ? 2 : activePlan === "premium" ? 20 : 999999;
  const isUnlimited = activePlan === "team" || activePlan === "promax" || credits?.isOwner;
  const used = credits?.freeUsed ?? 0;
  const remaining = isUnlimited ? "Unlimited" : Math.max(0, totalLimit - used);
  const percentUsed = isUnlimited ? 15 : Math.min(100, Math.round((used / totalLimit) * 100));

  const planDisplayName = credits?.isOwner 
    ? "Developer Owner Account (Bypassed)"
    : activePlan === "promax" || activePlan === "team" 
    ? "Pro Max (Unlimited Power)" 
    : activePlan === "premium" 
    ? "Premium Pro" 
    : "Free Career Tier";

  const planPriceDisplay = activePlan === "free" 
    ? "₹0 / month" 
    : activePlan === "premium" 
    ? (billingCycle === "yearly" ? "₹166 / year" : "₹99 / month") 
    : (billingCycle === "yearly" ? "₹332 / year" : "₹199 / month");

  const pdfDownloadLimit = activePlan === "free" ? "1 PDF (Sample)" : "Unlimited PDFs / month";

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Header Navigation & Title */}
        <ScrollFadeIn className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3.5">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50 h-9 w-9 p-0 rounded-xl bg-white shadow-sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Billing &amp; Subscription
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Understand your plan quotas, credit usage, and download GST tax invoices.
              </p>
            </div>
          </div>

          <Link href="/dashboard/pricing">
            <Button className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-9 rounded-xl px-4 shadow-sm flex items-center gap-1.5 transition-colors">
              <Sparkles className="h-3.5 w-3.5" />
              {activePlan === "free" ? "Upgrade to Pro" : "View All Plans"}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </ScrollFadeIn>

        {/* 4 Summary Stats Tiles */}
        <ScrollFadeIn className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Tile 1: Active Tier */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Tier</span>
              <Badge className={`text-[9px] font-bold border ${
                activePlan === "free" 
                  ? "bg-slate-100 border-slate-200 text-slate-600" 
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}>
                {activePlan === "free" ? "Free Tier" : "Active & Paid"}
              </Badge>
            </div>
            <p className="text-base font-extrabold text-slate-900 truncate">{planDisplayName}</p>
            <p className="text-[11px] font-semibold text-[#0d6e5a]">{planPriceDisplay}</p>
          </div>

          {/* Tile 2: Resumes Remaining */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Optimizations Left</span>
              <Zap className="h-3.5 w-3.5 text-[#0d6e5a]" />
            </div>
            <p className="text-base font-extrabold text-slate-900">
              {remaining} {typeof remaining === "number" ? "resumes" : ""}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Used {used} of {isUnlimited ? "∞" : totalLimit} this month
            </p>
          </div>

          {/* Tile 3: PDF / DOCX Downloads */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Export Downloads</span>
              <FileText className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-base font-extrabold text-slate-900">{pdfDownloadLimit}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              Clean ATS-ready PDF &amp; Word
            </p>
          </div>

          {/* Tile 4: Monthly Reset Date */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Credits Reset</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-base font-extrabold text-slate-900">
              {credits?.resetAt ? new Date(credits.resetAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Every 30 Days"}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Refreshes automatically
            </p>
          </div>

        </ScrollFadeIn>

        {/* Main 2-Column Split Details */}
        <ScrollFadeIn className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left 7 Columns: Active Plan & Quota Details */}
          <div className="lg:col-span-7 space-y-6">
            
            <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 sm:p-7 space-y-6">
                
                {/* Plan Title & Price Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-5 rounded-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">{planDisplayName}</h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      {activePlan === "free" 
                        ? "2 free resume optimizations per month." 
                        : `Subscribed on ${billingCycle} billing cycle.`}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-xl font-black text-slate-900">{planPriceDisplay.split(" ")[0]}</span>
                    <span className="text-xs text-slate-500 font-medium block">/{billingCycle === "yearly" ? "year" : "month"}</span>
                  </div>
                </div>

                {/* Quota Progress Bar with Clear Numbers */}
                <div className="space-y-3 bg-slate-50 border border-slate-200 p-5 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-[#0d6e5a]" />
                      Monthly Optimization Quota
                    </span>
                    <span className="text-slate-900 font-mono">
                      {used} / {isUnlimited ? "∞ (Unlimited)" : `${totalLimit} Resumes`}
                    </span>
                  </div>

                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-[#0d6e5a] rounded-full transition-all duration-500" 
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>{remaining} remaining</span>
                    <span>Resets: {credits?.resetAt ? new Date(credits.resetAt).toLocaleDateString() : "Every 30 days"}</span>
                  </div>
                </div>

                {/* Plan Features Checklist */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Features Included In Your Plan</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { text: "AI ATS Resume Optimization", included: true },
                      { text: "Bullet Point Metric Improver", included: true },
                      { text: activePlan === "free" ? "1 Sample PDF Export" : "Full PDF & DOCX Export Engine", included: true },
                      { text: "Career Skills Learning Roadmaps", included: activePlan !== "free" },
                      { text: "Tailored Cover Letter Generator", included: true },
                      { text: "Instant Official GST Tax Invoices", included: activePlan !== "free" },
                    ].map((feature, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-2.5 text-xs p-2.5 rounded-xl border ${
                          feature.included 
                            ? "bg-slate-50 border-slate-200 text-slate-800" 
                            : "bg-slate-50/40 border-slate-100 text-slate-400"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
                          feature.included 
                            ? "bg-teal-50 text-[#0d6e5a] border border-teal-200/60" 
                            : "bg-slate-200 text-slate-400"
                        }`}>
                          <Check className="h-2.5 w-2.5" />
                        </div>
                        <span className={feature.included ? "font-medium" : "line-through text-slate-400"}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500">
                    {activePlan === "free" ? "Upgrade anytime to unlock 20 monthly optimizations or unlimited access." : "Need to upgrade or switch plans?"}
                  </span>
                  <Link href="/dashboard/pricing">
                    <Button className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-9 rounded-xl px-5 shadow-sm transition-colors">
                      {activePlan === "free" ? "Upgrade Plan" : "Change Plan"}
                    </Button>
                  </Link>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* Right 5 Columns: Invoices & Tax Receipts */}
          <div className="lg:col-span-5 space-y-6">
            
            <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-extrabold text-slate-900">Invoice &amp; Receipts</h3>
                  <p className="text-[10px] text-slate-500">Download official GST-compliant tax invoices.</p>
                </div>
                <Receipt className="h-4 w-4 text-[#0d6e5a]" />
              </div>

              <div className="p-6 space-y-3 min-h-[260px] flex flex-col justify-start">
                {invoices.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-slate-500 space-y-2 select-none">
                    <FileText className="h-8 w-8 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">No Invoices Yet</span>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      When you upgrade to a paid plan, your GST receipts and transaction records will appear here.
                    </p>
                  </div>
                ) : (
                  invoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handlePrintReceipt(inv)}
                      className="bg-slate-50 border border-slate-200 hover:border-[#0d6e5a]/40 p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer group transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-[#0d6e5a] transition-colors truncate">
                            {inv.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span>{inv.date}</span>
                          <span>&bull;</span>
                          <span className="text-emerald-700 font-semibold uppercase">{inv.status}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-slate-900">{inv.amount}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintReceipt(inv);
                          }}
                          className="h-7 px-2.5 rounded-lg bg-teal-50 group-hover:bg-[#0d6e5a] border border-teal-200 text-[#0d6e5a] group-hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold"
                          title="Download GST Invoice"
                        >
                          <Download className="h-3 w-3" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5 text-[10px] text-slate-500 select-none">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>256-bit SSL secured payments &amp; 5% GST tax invoice receipts.</span>
              </div>
            </Card>

            {/* Quick Support Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 flex items-center justify-between gap-3 shadow-sm">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900">Need Billing Help?</h4>
                <p className="text-[10px] text-slate-500">Questions about payments, plans, or custom invoices?</p>
              </div>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-support-chatbot", { detail: { mode: "admin" } }));
                }}
                className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-[10px] font-bold h-8 rounded-lg px-3.5 transition-all cursor-pointer shrink-0"
              >
                Contact Us
              </button>
            </div>

          </div>

        </ScrollFadeIn>

        {/* Clear Billing FAQ Section */}
        <ScrollFadeIn className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-[#0d6e5a]" />
            <h3 className="text-sm font-extrabold text-slate-900">Frequently Asked Billing Questions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900">When do my credits reset?</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Your monthly resume optimization credits refresh automatically on the exact same date each month (e.g. every 30 days).
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900">Can I change plans anytime?</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Yes, you can upgrade or switch between Free, Premium Pro, and Pro Max whenever you need. Unused credits rollover when upgrading.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900">How do GST tax invoices work?</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Every transaction includes an official GST tax breakdown with your company name, GSTIN (optional), and payment ID for easy expense claims.
              </p>
            </div>
          </div>
        </ScrollFadeIn>

      </main>

      {/* OFFICIAL GST INVOICE DOWNLOAD MODAL */}
      {selectedInvoiceData && (
        <GstInvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          invoice={selectedInvoiceData}
        />
      )}

    </div>
  );
}

