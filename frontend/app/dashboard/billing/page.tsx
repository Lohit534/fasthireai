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
  TrendingUp
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { CreditInfo } from "@/types";

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
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [cardDetails, setCardDetails] = useState<{ brand: string; last4: string; exp: string; name: string } | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Card Edit Modal
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardModalLoading, setCardModalLoading] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvc, setNewCardCvc] = useState("");

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

        // 1. Plan Tier Loading
        const plan = localStorage.getItem(`fastHire_plan_${user.id}`) || "free";
        setActivePlan(plan);

        // 2. Credits setup
        const creditsData = localStorage.getItem(`fastHire_mockCredits_${user.id}`);
        if (creditsData) {
          try {
            setCredits(JSON.parse(creditsData));
          } catch (e) {}
        } else {
          // Fetch from live database if available, otherwise mock
          try {
            const res = await fetch("/api/credits");
            if (res.ok) {
              const apiCredits = await res.json();
              setCredits(apiCredits);
            } else {
              setCredits({
                freeUsed: 0,
                paidCredits: 2,
                freeRemaining: 2,
                resetAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
              });
            }
          } catch (err) {
            setCredits({
              freeUsed: 0,
              paidCredits: 2,
              freeRemaining: 2,
              resetAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
            });
          }
        }

        // 3. Card details loading
        const savedCard = localStorage.getItem(`fastHire_card_${user.id}`);
        if (savedCard) {
          try {
            setCardDetails(JSON.parse(savedCard));
          } catch (e) {}
        } else if (plan !== "free") {
          // Prefill card for premium mock subscriptions
          const mockCard = { brand: "Visa", last4: "4242", exp: "12/28", name: "Candidate user" };
          setCardDetails(mockCard);
          localStorage.setItem(`fastHire_card_${user.id}`, JSON.stringify(mockCard));
        }

        // 4. Invoices creation
        const invoiceHistory: Invoice[] = [
          { id: "inv_1", date: "2026-06-15", description: "FastHire Premium Monthly Subscription", amount: "₹99.00", status: "paid" },
          { id: "inv_2", date: "2026-05-15", description: "FastHire Premium Monthly Subscription", amount: "₹99.00", status: "paid" }
        ];

        if (plan === "team") {
          invoiceHistory.unshift({
            id: "inv_3", date: "2026-06-20", description: "FastHire Team Plan Setup Package", amount: "₹199.00", status: "paid"
          });
        }

        if (plan !== "free") {
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

  const handleUpdateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!newCardName.trim() || newCardNumber.length < 19 || newCardExpiry.length < 5 || newCardCvc.length < 3) {
      toast.error("Please fill in correct payment details.");
      return;
    }

    setCardModalLoading(true);

    setTimeout(() => {
      const cardType = newCardNumber.startsWith("5") ? "Mastercard" : newCardNumber.startsWith("3") ? "Amex" : "Visa";
      const info = {
        brand: cardType,
        last4: newCardNumber.slice(-4),
        exp: newCardExpiry,
        name: newCardName.trim()
      };

      localStorage.setItem(`fastHire_card_${userId}`, JSON.stringify(info));
      setCardDetails(info);
      setCardModalLoading(false);
      setIsCardModalOpen(false);
      toast.success("Payment card info updated successfully!");
    }, 1500);
  };

  const handleRemoveCard = () => {
    if (!userId) return;
    if (confirm("Are you sure you want to remove your credit card? If you have an active subscription, it will not renew.")) {
      localStorage.removeItem(`fastHire_card_${userId}`);
      setCardDetails(null);
      toast.success("Card removed successfully.");
    }
  };

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
  const totalLimit = activePlan === "free" ? 2 : activePlan === "premium" ? 15 : activePlan === "team" ? 30 : 9999;
  const used = credits?.freeUsed ?? 0;
  const remaining = credits?.freeRemaining ?? totalLimit;
  const percentUsed = Math.min(100, Math.round((used / totalLimit) * 100));

  return (
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Header Title */}
        <div className="flex items-center gap-4">
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
              Check your active plan quotas, update credit card settings, and view invoice histories.
            </p>
          </div>
        </div>

        {/* Dashboard Split Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Sub details and payment methods */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Card 1: Subscription Quota overview */}
            <Card className="border-white/5 bg-[#0e0f21]/40 shadow-xl flex-1 flex flex-col justify-between">
              <CardContent className="p-6 space-y-6">
                
                {/* Header Sub details */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Package Tier</p>
                    <h3 className="text-lg font-extrabold text-white capitalize select-none">
                      {activePlan === "free" ? "Free Career Tier" : activePlan === "premium" ? "Premium Pro" : "Team & Bootcamps"}
                    </h3>
                  </div>
                  <Badge className={`text-[10px] font-bold border capitalize ${
                    activePlan === "free" 
                      ? "bg-slate-800/50 border-white/5 text-slate-400"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}>
                    {activePlan === "free" ? "Limited Access" : "Active & Paid"}
                  </Badge>
                </div>

                {/* Quota Progress */}
                {activePlan !== "team" ? (
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
                      <p className="text-[10px] text-slate-500">Your bootcamp package includes unlimited optimizations.</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                )}

                <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-4">
                  <div className="text-[11px] text-slate-400">
                    {activePlan !== "free" ? (
                      <span>Renews automatically for <strong className="text-white">{activePlan === "premium" ? "₹99" : "₹199"}</strong></span>
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

            {/* Card 2: Payment details */}
            <Card className="border-white/5 bg-[#0e0f21]/40 shadow-xl">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Payment Method Settings</p>
                </div>

                {cardDetails ? (
                  <div className="flex items-center justify-between p-3.5 bg-[#0c0d1b] border border-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-14 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-300 select-none uppercase">
                        {cardDetails.brand}
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-bold text-white text-xs truncate block">
                          •••• •••• •••• {cardDetails.last4}
                        </span>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase">
                          Exp: {cardDetails.exp} &bull; {cardDetails.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setNewCardName(cardDetails.name);
                          setNewCardNumber("");
                          setNewCardExpiry(cardDetails.exp);
                          setNewCardCvc("");
                          setIsCardModalOpen(true);
                        }}
                        className="h-7 px-3 rounded-full hover:bg-white/5 border border-white/5 text-[10px] text-slate-300 font-bold transition-colors"
                      >
                        Update
                      </button>
                      <button
                        onClick={handleRemoveCard}
                        className="h-7 w-7 rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-400 flex items-center justify-center transition-colors"
                        title="Remove Card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/5 rounded-xl text-center gap-3">
                    <AlertCircle className="h-6 w-6 text-slate-500" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-white text-[11px]">No active payment card</span>
                      <p className="text-[9px] text-slate-500">Add a credit card to proceed to subscription checkouts.</p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setNewCardName("");
                        setNewCardNumber("");
                        setNewCardExpiry("");
                        setNewCardCvc("");
                        setIsCardModalOpen(true);
                      }}
                      className="bg-transparent border border-white/10 hover:bg-white/5 text-slate-200 h-8 text-[10px] rounded-full px-4"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Payment Method
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>

          </div>

          {/* Right Column: Invoices list */}
          <div className="lg:col-span-5 flex flex-col">
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

        </div>

      </main>

      {/* UPDATE/ADD CARD MODAL WINDOW */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-[#060713]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d0e1f] border border-white/10 p-6 rounded-2xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="font-extrabold text-white text-sm">
                Configure Billing Method
              </h3>
              <button 
                onClick={() => setIsCardModalOpen(false)}
                disabled={cardModalLoading}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleUpdateCard} className="space-y-4 text-xs select-none">
              
              {/* Cardholder name */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Cardholder Name</label>
                <Input
                  required
                  placeholder="e.g. Alexis Carter"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                />
              </div>

              {/* Credit card number */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Credit Card Number</label>
                <div className="relative">
                  <Input
                    required
                    placeholder="0000 0000 0000 0000"
                    value={newCardNumber}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "");
                      if (val.length > 16) val = val.substring(0, 16);
                      const matches = val.match(/\d{4,16}/g);
                      const match = (matches && matches[0]) || "";
                      const parts = [];
                      for (let i = 0; i < match.length; i += 4) {
                        parts.push(match.substring(i, i + 4));
                      }
                      setNewCardNumber(parts.length > 0 ? parts.join(" ") : val);
                    }}
                    className="h-9 pl-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                  />
                  <CreditCard className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                </div>
              </div>

              {/* Expiry & CVV */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Expiration Date</label>
                  <Input
                    required
                    placeholder="MM/YY"
                    value={newCardExpiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "");
                      if (val.length > 4) val = val.substring(0, 4);
                      setNewCardExpiry(val.length >= 2 ? val.substring(0, 2) + "/" + val.substring(2) : val);
                    }}
                    className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Security Code (CVV)</label>
                  <Input
                    required
                    maxLength={4}
                    placeholder="123"
                    value={newCardCvc}
                    onChange={(e) => setNewCardCvc(e.target.value.replace(/\D/g, ""))}
                    className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Submit triggers */}
              <Button
                type="submit"
                disabled={cardModalLoading}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold h-10 rounded-lg flex items-center justify-center gap-1.5"
              >
                {cardModalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating card...
                  </>
                ) : (
                  <>
                    Save Configuration Details
                  </>
                )}
              </Button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
