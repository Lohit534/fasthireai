"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  Loader2, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Calendar, 
  Check, 
  AlertCircle,
  FileText,
  Lock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { CreditInfo } from "@/types";
import ScrollFadeIn from "@/components/ScrollFadeIn";

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
  const [authLoading, setAuthLoading] = useState(true);
  
  // States
  const [activePlan, setActivePlan] = useState("free");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

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
        setAuthLoading(false);

        // 1. Plan Tier & Credits Loading directly from DB
        let currentPlan = "free";
        let currentCycle = localStorage.getItem(`fastHire_billingCycle_${user.id}`) || "monthly";
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



        // 4. Invoices creation
        const invoiceHistory: Invoice[] = [
          { id: "inv_1", date: "2026-06-15", description: "FastHire Premium Monthly Subscription", amount: "₹99.00", status: "paid" },
          { id: "inv_2", date: "2026-05-15", description: "FastHire Premium Monthly Subscription", amount: "₹99.00", status: "paid" }
        ];

        if (currentPlan === "team" || currentPlan === "promax") {
          invoiceHistory.unshift({
            id: "inv_3", date: "2026-06-20", description: "FastHire Pro Max Setup Package", amount: "₹199.00", status: "paid"
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
    toast.success(`Downloading PDF Invoice for ${invoice.id}...`);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Verifying billing data...</p>
        </div>
      </div>
    );
  }

  // Quota computations
  const totalLimit = activePlan === "free" ? 2 : activePlan === "premium" ? 15 : (activePlan === "team" || activePlan === "promax") ? 999999 : 999999;
  const used = credits?.freeUsed ?? 0;
  const remaining = credits?.freeRemaining ?? totalLimit;
  const percentUsed = Math.min(100, Math.round((used / totalLimit) * 100));

  return (
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Header Title */}
        <ScrollFadeIn className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="border-white/5 text-slate-300 hover:bg-white/5 h-9 w-9 p-0 rounded-full bg-transparent">
              <ArrowLeft className="h-4.5 w-4.5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Billing &amp; Subscription Usage
            </h1>
            <p className="text-xs text-slate-400">
              Check your active plan quotas and view invoice histories.
            </p>
          </div>
        </ScrollFadeIn>

        {/* Dashboard Split Widgets */}
        <ScrollFadeIn className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Left Column: Sub details */}
          <div className="flex flex-col gap-6">
            
            {/* Card 1: Subscription Quota overview */}
            <Card className="border-white/5 bg-[#0e0f21]/40 shadow-xl flex-1 flex flex-col justify-between">
              <CardContent className="p-6 space-y-6">
                
                {/* Header Sub details */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Package Tier</p>
                    <h3 className="text-lg font-extrabold text-white capitalize select-none">
                      {credits?.isOwner 
                        ? `Owner Account - Unlimited ${activePlan === "free" ? "Free" : activePlan === "premium" ? "Pro" : "Pro Max"}` 
                        : (activePlan === "free" ? "Free Career Tier" : activePlan === "premium" ? "Premium Pro" : "Pro Max (Unlimited)")}
                    </h3>
                  </div>
                  <Badge className={`text-[10px] font-bold border capitalize ${
                    credits?.isOwner 
                      ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                      : (activePlan === "free" 
                          ? "bg-slate-800/50 border-white/5 text-slate-400"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400")
                  }`}>
                    {credits?.isOwner ? "Developer Bypass" : (activePlan === "free" ? "Limited Access" : "Active & Paid")}
                  </Badge>
                </div>

                {/* Quota Progress */}
                {credits?.isOwner ? (
                  <div className="space-y-4">
                    <div className="bg-violet-950/20 border border-violet-500/20 p-4 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="font-bold text-violet-400 text-xs">Developer Owner Account</span>
                        <p className="text-[10px] text-slate-400 font-semibold">Your developer account has bypassed all billing limits and quotas.</p>
                      </div>
                      <Sparkles className="h-5 w-5 text-violet-400" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Simulated Plan Quota ({activePlan === "free" ? "Free Tier" : activePlan === "premium" ? "Premium Pro" : "Team Plan"})</span>
                        <span className="text-white">Unlimited / {totalLimit} (Owner Bypassed)</span>
                      </div>
                      <Progress value={0} className="h-1.5 bg-slate-900 [&>div]:bg-violet-500 rounded-full border border-white/5" />
                    </div>
                  </div>
                ) : (activePlan !== "team" && activePlan !== "promax") ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Monthly Usage Quota</span>
                      <span className="text-white">{used} / {totalLimit} Resumes Used</span>
                    </div>
                    <Progress value={percentUsed} className="h-1.5 bg-slate-900 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-indigo-500 rounded-full border border-white/5" />
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      Your credit limit resets automatically every 30 days. Reset date: {credits?.resetAt ? new Date(credits.resetAt).toLocaleDateString() : "Next billing cycle"}.
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#0c0d1b] border border-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="font-bold text-white text-xs">Unlimited Pipeline Access</span>
                      <p className="text-[10px] text-slate-500">Your Pro Max package includes unlimited optimizations.</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                )}

                <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-4">
                  <div className="text-[11px] text-slate-400">
                    {activePlan !== "free" ? (
                      <span>Renews automatically for <strong className="text-white">{activePlan === "premium" ? (billingCycle === "yearly" ? "₹166" : "₹99") : (billingCycle === "yearly" ? "₹332" : "₹199")}</strong> / {billingCycle === "yearly" ? "year" : "month"}</span>
                    ) : (
                      <span>Need more resumes to apply? Upgrade to a premium tier.</span>
                    )}
                  </div>
                  <Link href="/dashboard/pricing">
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white font-bold h-8 text-[11px] rounded-full px-4 shrink-0 shadow-lg shadow-violet-600/10">
                      {activePlan === "free" ? "Upgrade Plan" : "Change Plan"}
                    </Button>
                  </Link>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* Right Column: Invoices list */}
          <div className="flex flex-col">
            <Card className="border-white/5 bg-[#0e0f21]/40 shadow-xl flex-1 flex flex-col justify-between overflow-hidden">
              <div className="p-6 pb-2">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Invoice &amp; Transaction History</p>
              </div>

              <div className="flex-1 overflow-y-auto px-6 max-h-[350px]">
                {invoices.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center select-none text-slate-600">
                    <FileText className="h-8 w-8 text-slate-600 mb-2" />
                    <span className="text-[10px] font-bold">No Invoices Found</span>
                    <p className="text-[9px] mt-0.5">Setup a paid plan to log invoices.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="py-3 flex justify-between items-center gap-4 text-xs font-semibold">
                        <div className="space-y-0.5 truncate">
                          <span className="text-white block text-[11px] truncate max-w-full">{inv.description}</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{inv.date} &bull; {inv.id}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-white text-xs font-bold">{inv.amount}</span>
                          <button
                            onClick={() => handlePrintReceipt(inv)}
                            className="p-1.5 rounded hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors"
                            title="Download Receipt"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom protection note */}
              <div className="p-4 border-t border-white/5 bg-[#070814]/40 flex items-center gap-2 select-none">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[9px] text-slate-500 leading-normal">
                  Invoice billing is processed by FastHire-AI mockup systems. For question about custom invoices reach out to support.
                </span>
              </div>
            </Card>
          </div>
        </ScrollFadeIn>
      </main>
    </div>
  );
}
