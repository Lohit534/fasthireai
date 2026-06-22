"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Check, 
  Sparkles, 
  Loader2, 
  CreditCard, 
  Lock, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Plan {
  id: "free" | "premium" | "team";
  name: string;
  priceMonthly: string;
  priceYearly: string;
  periodMonthly: string;
  periodYearly: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free Career Tier",
    priceMonthly: "₹0",
    priceYearly: "₹0",
    periodMonthly: "forever",
    periodYearly: "forever",
    description: "Perfect for casual job seekers needing basic optimization.",
    features: [
      "1 resume download (PDF + DOCX)",
      "1 cover letter download (PDF + DOCX)",
      "No subscription needed",
      "No watermark",
      "Job application tracker"
    ],
    cta: "Current Plan"
  },
  {
    id: "premium",
    name: "Premium Pro",
    priceMonthly: "₹99",
    priceYearly: "₹166",
    periodMonthly: "month",
    periodYearly: "year",
    description: "For active job hunters targeting multiple roles.",
    features: [
      "Unlimited PDF + DOCX downloads",
      "5 cover letters / month",
      "Skills learning roadmap (15/month)",
      "Build up to 20 resumes from scratch",
      "AI resume builder (improve bullets, write summary)",
      "Import resume via AI",
      "Optimization history (3-month retention)",
      "Job application tracker",
      "Priority support"
    ],
    cta: "Upgrade to Pro",
    popular: true
  },
  {
    id: "team",
    name: "Team & Bootcamps",
    priceMonthly: "₹199",
    priceYearly: "₹332",
    periodMonthly: "month",
    periodYearly: "year",
    description: "For groups, universities, and collaborative workspaces.",
    features: [
      "Unlimited resume optimizations",
      "Shared candidates workspace and history logs",
      "Centralized billing and roles controls",
      "FastHire Optimization API integrations",
      "Dedicated account manager support"
    ],
    cta: "Get Started Team"
  }
];

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Can I see my results before paying?",
    answer: "Yes! You can input your resume and job description, run the optimization, and view your ATS scores and optimized suggestions before making any payments."
  },
  {
    question: "What is the premier pro?",
    answer: "Premium Pro is our signature individual package designed for active job hunters, providing 15 monthly AI optimizations, full PDF/DOCX downloads, and custom instruction tuning."
  },
  {
    question: "What counts as a \"skill roadmap\"?",
    answer: "A skill roadmap is an AI-generated step-by-step learning guide that identifies gaps between your resume and a target job, recommending courses, topics, and projects."
  },
  {
    question: "What is the Optimization History?",
    answer: "It is a history log of all your previous resume scans and optimizations, stored for up to 3 months to let you retrieve and download previous versions."
  },
  {
    question: "Can I edit my resume or cover letter after the AI generates it?",
    answer: "Absolutely! Our interactive builder lets you refine personal information, experiences, and project descriptions manually inside the preview screen."
  },
  {
    question: "What is the difference between monthly and yearly plans?",
    answer: "Monthly plans bill every 30 days. Yearly plans are billed annually and offer heavily discounted pricing equivalent to 2 months free extra."
  },
  {
    question: "Can I cancel my subscription?",
    answer: "Yes, anytime. Your plan stays active until the end of the billing period (monthly or annual), then you return to the free tier. No pro-rated refunds for unused time."
  },
  {
    question: "Is Razorpay secure?",
    answer: "Yes. Razorpay is PCI-DSS compliant. We never store your card details."
  },
  {
    question: "What is the Team plan?",
    answer: "The Team plan is designed for teams, bootcamps, and universities to collaborate, share candidates workspaces, and manage pooled resume optimizations."
  },
  {
    question: "Can I have a Team plan and a Pro/Power subscription at the same time?",
    answer: "No, subscriptions are per-account. If you are part of a Team workspace, your account will inherit the Team plan benefits automatically."
  }
];

export default function PricingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  
  // Checkout Modal State
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Card Inputs
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // FAQ open/close index state
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  // Initialize and load plan state
  useEffect(() => {
    async function checkUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          toast.error("Please sign in to view pricing packages.");
          router.push("/auth/login");
          return;
        }
        setUserId(data.user.id);
        setAuthLoading(false);

        // Load active plan
        const plan = localStorage.getItem(`fastHire_plan_${data.user.id}`) || "free";
        setCurrentPlan(plan);

        // Load billing cycle
        const cycle = localStorage.getItem(`fastHire_billingCycle_${data.user.id}`) as "monthly" | "yearly" || "monthly";
        setBillingCycle(cycle);
      } catch (err) {
        toast.error("Verification failed.");
        router.push("/auth/login");
      }
    }
    checkUser();
  }, [router]);

  const handlePlanAction = (plan: Plan) => {
    if (plan.id === currentPlan) {
      toast.success(`You are already subscribed to the ${plan.name}.`);
      return;
    }

    if (plan.id === "free") {
      if (confirm("Are you sure you want to downgrade to the Free Plan? Monthly limits will be applied.")) {
        if (userId) {
          localStorage.setItem(`fastHire_plan_${userId}`, "free");
          setCurrentPlan("free");
          toast.success("Downgraded to Free plan.");
        }
      }
      return;
    }

    // Trigger billing modal
    setSelectedPlan(plan);
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setIsCheckoutOpen(true);
  };

  // Card Number space formatter
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 16) val = val.substring(0, 16);
    const matches = val.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(" "));
    } else {
      setCardNumber(val);
    }
  };

  // Expiry date formatter
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.substring(0, 4);
    if (val.length >= 2) {
      setCardExpiry(val.substring(0, 2) + "/" + val.substring(2));
    } else {
      setCardExpiry(val);
    }
  };

  // Checkout submission handler
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    if (!cardName.trim() || cardNumber.length < 19 || cardExpiry.length < 5 || cardCvc.length < 3) {
      toast.error("Please enter correct credit card details.");
      return;
    }

    setCheckoutLoading(true);

    setTimeout(async () => {
      try {
        if (userId) {
          localStorage.setItem(`fastHire_plan_${userId}`, selectedPlan.id);
          localStorage.setItem(`fastHire_billingCycle_${userId}`, billingCycle);
          localStorage.setItem(`fastHire_planDate_${userId}`, new Date().toISOString());
          setCurrentPlan(selectedPlan.id);
          
          // Boost available credits based on new limits
          const limitValue = selectedPlan.id === "premium" ? 15 : selectedPlan.id === "team" ? 30 : 999;
          const creditsObject = {
            freeUsed: 0,
            paidCredits: limitValue,
            freeRemaining: limitValue,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          };
          localStorage.setItem(`fastHire_mockCredits_${userId}`, JSON.stringify(creditsObject));

          toast.success(`Success! Welcome to FastHire ${selectedPlan.name}.`);
        }
      } catch (err) {
        toast.error("Processing payment failed. Please try again.");
      } finally {
        setCheckoutLoading(false);
        setIsCheckoutOpen(false);
      }
    }, 2000);
  };

  const toggleFAQ = (idx: number) => {
    setOpenFAQIndex(openFAQIndex === idx ? null : idx);
  };

  const handleBillingCycleChange = (cycle: "monthly" | "yearly") => {
    setBillingCycle(cycle);
    if (userId) {
      localStorage.setItem(`fastHire_billingCycle_${userId}`, cycle);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 font-sans select-text">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
        
        {/* Title details */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4.5xl font-black text-white tracking-tight leading-none">
            Unlock Full <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">FastHire Premium</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
            Gain an unfair advantage in the application process. Choose the pipeline limits that align with your search.
          </p>

          {/* Monthly / Yearly Toggle switch (2 months free yearly) */}
          <div className="flex justify-center items-center gap-3 pt-2 select-none">
            <button
              onClick={() => handleBillingCycleChange("monthly")}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all ${
                billingCycle === "monthly"
                  ? "bg-[#161730] text-white border border-violet-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Bill Monthly
            </button>
            <button
              onClick={() => handleBillingCycleChange("yearly")}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                billingCycle === "yearly"
                  ? "bg-[#161730] text-white border border-violet-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Bill Yearly
              <Badge className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                2 Months Free
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full items-stretch">
          {PLANS.map((plan) => {
            const isActive = currentPlan === plan.id;
            const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
            const period = billingCycle === "monthly" ? plan.periodMonthly : plan.periodYearly;
            
            return (
              <Card 
                key={plan.id}
                className={`relative border-white/5 bg-[#0e0f21]/40 flex flex-col justify-between overflow-hidden rounded-2xl shadow-xl transition-all duration-300 ${
                  plan.popular 
                    ? "border-violet-500/40 ring-1 ring-violet-500/30 scale-105 shadow-violet-950/20" 
                    : "hover:border-white/10"
                }`}
              >
                {/* Popular Banner */}
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="bg-violet-600 border border-violet-500 text-white rounded-bl-xl rounded-tr-none px-3 py-1 font-bold text-[9px] uppercase tracking-wider select-none">
                      Best Choice
                    </Badge>
                  </div>
                )}

                <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  
                  {/* Tier details */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-white text-base select-none">{plan.name}</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{plan.description}</p>
                    </div>

                    {/* Price Tag */}
                    <div className="flex items-baseline text-white">
                      <span className="text-3xl font-black tracking-tight">{price}</span>
                      <span className="text-[10px] text-slate-500 font-bold ml-1 uppercase tracking-wider">
                        / {period}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/5 pt-4" />

                    {/* Feature items */}
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-300 font-medium">
                          <Check className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions CTA Trigger */}
                  <Button
                    onClick={() => handlePlanAction(plan)}
                    className={`w-full font-bold text-xs h-10 rounded-full transition-all ${
                      isActive
                        ? "bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                        : plan.popular
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/20"
                        : "bg-white text-slate-950 hover:bg-slate-200"
                    }`}
                  >
                    {isActive ? "Current Active Plan" : plan.cta}
                  </Button>

                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Security badges & Trust banners */}
        <div className="flex flex-col items-center justify-center gap-4 text-center mt-6 select-none max-w-lg mx-auto">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <Lock className="h-3.5 w-3.5 text-emerald-500" />
            <span>256-Bit SSL Secure Razorpay Payments</span>
          </div>
          <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed">
            FastHire processes transactions securely. You can downgrade, cancel, or switch billing cycles at any point from your billing profile page.
          </p>
        </div>

        {/* Divider line before FAQs */}
        <div className="border-t border-white/5 my-4" />

        {/* FAQ SECTION (Accordion dropdowns list) */}
        <div className="max-w-3xl mx-auto w-full space-y-4 select-none">
          <div className="text-center space-y-1 mb-8">
            <h2 className="text-xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400">Everything you need to know about FastHire-AI subscriptions.</p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, idx) => {
              const isOpen = openFAQIndex === idx;
              return (
                <div 
                  key={idx}
                  className="border border-white/5 bg-[#0e0f21]/30 rounded-xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFAQ(idx)}
                    className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-white hover:text-violet-400 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 text-[11px] text-slate-400 font-medium leading-relaxed border-t border-white/5 pt-3 animate-in fade-in slide-in-from-top-1 duration-150 select-text">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* SECURE MOCK BILLING CHECKOUT DIALOG */}
      {isCheckoutOpen && selectedPlan && (
        <div className="fixed inset-0 bg-[#060713]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d0e1f] border border-white/10 p-6 rounded-2xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-violet-500" />
                <h3 className="font-extrabold text-white text-sm">
                  Complete Billing Setup
                </h3>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                disabled={checkoutLoading}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs select-none">
              
              {/* Plan Selected Summary */}
              <div className="bg-[#070814] p-3 rounded-lg border border-white/5 flex justify-between items-center">
                <div>
                  <span className="font-bold text-white text-[11px]">{selectedPlan.name} Subscription</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Renews {billingCycle}ly until canceled</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-white text-base">
                    {billingCycle === "monthly" ? selectedPlan.priceMonthly : selectedPlan.priceYearly}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold block">/ {billingCycle === "monthly" ? "month" : "year"}</span>
                </div>
              </div>

              {/* Cardholder Input */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Cardholder Name</label>
                <Input
                  required
                  placeholder="e.g. Alexis Carter"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                />
              </div>

              {/* Card Number Input */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Credit Card Number</label>
                <div className="relative">
                  <Input
                    required
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="h-9 pl-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                  />
                  <CreditCard className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                </div>
              </div>

              {/* Expiry & CVC grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Expiration Date</label>
                  <Input
                    required
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Security Code (CVV)</label>
                  <Input
                    required
                    maxLength={4}
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                    className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Trust statement */}
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 bg-[#00e699]/5 border border-[#00e699]/15 p-2.5 rounded-lg leading-relaxed">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                <span>Secured by Razorpay. Mock validation algorithms. Cards are not charged.</span>
              </div>

              {/* Submit actions */}
              <Button
                type="submit"
                disabled={checkoutLoading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold h-10 rounded-lg flex items-center justify-center gap-1.5"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing Setup...
                  </>
                ) : (
                  <>
                    Subscribe &amp; Pay {billingCycle === "monthly" ? selectedPlan.priceMonthly : selectedPlan.priceYearly}
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
