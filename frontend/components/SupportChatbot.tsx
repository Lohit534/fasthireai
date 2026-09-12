"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  User, 
  Cpu, 
  Loader2, 
  RefreshCw, 
  HelpCircle,
  Coins,
  ShieldCheck,
  Clock,
  HeadphonesIcon,
  Search,
  ChevronRight,
  ChevronDown,
  Mail,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface ChatMessage {
  sender: "user" | "ai" | "admin" | "system";
  text: string;
  timestamp: Date;
  status?: string;
}

interface UserCreditsInfo {
  freeUsed: number;
  paidCredits: number;
  freeRemaining: number;
  isOwner: boolean;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Remove all asterisks and format cleanly
 */
function cleanAsterisks(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/(^|\n)\s*[\*\-]\s+/g, "$1• ")
    .replace(/\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const FAQS: FAQItem[] = [
  {
    id: "plan-status-free",
    question: "If I haven't purchased a plan, does it always show Free?",
    answer: "Yes! If you have not purchased a plan, your account strictly stays on the Free Plan with your monthly free credits. You can view all 3 plans on the Pricing page to compare features, but you will never be charged or switched to a paid plan without your explicit checkout."
  },
  {
    id: "payment-visibility",
    question: "Why is my payment not visible on the dashboard?",
    answer: "Payments are verified securely in real-time via Razorpay. If your credits haven't refreshed immediately, please check your Billing & Subscription page, click 'Refresh', or create a support ticket with your Payment ID."
  },
  {
    id: "credits-reset",
    question: "When do my monthly optimization credits reset?",
    answer: "Your credits refresh automatically every 30 days on your monthly cycle. Free plan users get free monthly credits, Pro gets 20, and Pro Max members get unlimited optimizations."
  },
  {
    id: "ats-scoring",
    question: "How does FastHire ATS scoring & keyword optimization work?",
    answer: "FastHire AI analyzes your resume against target job description keywords, technical requirements, and industry-standard ATS rubrics, highlighting exact keyword gaps and upgrading weak bullet points to help you reach a 90+ score."
  },
  {
    id: "gst-invoices",
    question: "How do GST tax invoices work?",
    answer: "Every transaction generates an official 5% GST tax invoice with an official breakdown. You can preview and download GST invoices as PDFs anytime on your Billing page."
  },
  {
    id: "plan-switching",
    question: "Can I upgrade or switch between plans anytime?",
    answer: "Yes! You can upgrade from Free to Pro (20 optimizations/month) or Pro Max (Unlimited) at any time from the Pricing page."
  }
];

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  // Views: 'help-center' (Image 1) | 'contact-options' (Image 2) | 'ticket' (Admin team) | 'ai-chat' (AI chatbot)
  const [view, setView] = useState<"help-center" | "contact-options" | "ticket" | "ai-chat">("help-center");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Chat states
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  
  // User metadata
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string>("Free Tier");
  const [remainingCredits, setRemainingCredits] = useState<string>("2");
  const [rawCredits, setRawCredits] = useState<UserCreditsInfo | null>(null);

  // Chat message histories
  const [aiHistory, setAiHistory] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Hello! I am your FastHire AI Assistant. Ask me anything about resume optimization, ATS keywords, pricing plans, or career advice!",
      timestamp: new Date()
    }
  ]);
  
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (view === "ai-chat" || view === "ticket") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiHistory, adminTickets, isOpen, view]);

  // Load User Authentication & Plan details
  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email ?? null);
        
        const credRes = await fetch("/api/credits");
        if (credRes.ok) {
          const creds: UserCreditsInfo = await credRes.json();
          setRawCredits(creds);

          const planId = localStorage.getItem(`fastHire_plan_${user.id}`) || "free";
          
          if (creds.isOwner) {
            setActivePlan("Owner (Unlimited)");
            setRemainingCredits("Unlimited");
          } else if (planId === "promax" || creds.paidCredits >= 99999) {
            setActivePlan("Pro Max");
            setRemainingCredits("Unlimited");
          } else if (planId === "premium") {
            setActivePlan("Premium Pro");
            setRemainingCredits(`${creds.paidCredits} Credits`);
          } else {
            setActivePlan("Free Tier");
            setRemainingCredits(`${creds.freeRemaining} Credits`);
          }
        }
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  // External open trigger listener (from Billing "Contact Us" or Navbar)
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetMode = customEvent.detail?.mode || "contact-options";
      setIsOpen(true);
      if (targetMode === "admin" || targetMode === "ticket") {
        setView("ticket");
      } else if (targetMode === "ai" || targetMode === "ai-chat") {
        setView("ai-chat");
      } else if (targetMode === "contact-options") {
        setView("contact-options");
      } else {
        setView("help-center");
      }
      loadUserData();
    };

    window.addEventListener("open-support-chatbot", handleOpenChat as any);
    return () => {
      window.removeEventListener("open-support-chatbot", handleOpenChat as any);
    };
  }, []);

  // Load human admin support tickets
  const loadAdminTickets = async () => {
    if (!userId) return;
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/support/messages");
      if (res.ok) {
        const data = await res.json();
        const userTickets = data.filter((t: any) => t.userId === userId);
        setAdminTickets(userTickets.reverse());
      }
    } catch {
      // silent
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (isOpen && view === "ticket" && userId) {
      loadAdminTickets();
    }
  }, [isOpen, view, userId]);

  // Send AI Chat Message
  const handleSendAiMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userMsg = inputText.trim();
    if (!userMsg || loading) return;

    setInputText("");
    const newHistory: ChatMessage[] = [
      ...aiHistory,
      { sender: "user", text: userMsg, timestamp: new Date() }
    ];
    setAiHistory(newHistory);
    setLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: userMsg,
          userPlan: activePlan.toLowerCase().includes("promax") ? "promax" : activePlan.toLowerCase().includes("premium") ? "premium" : "free"
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiHistory([
          ...newHistory,
          {
            sender: "ai",
            text: cleanAsterisks(data.answer) || "I am here to assist with any questions about FastHire AI!",
            timestamp: new Date()
          }
        ]);
      } else {
        throw new Error("Chat request failed");
      }
    } catch {
      setAiHistory([
        ...newHistory,
        {
          sender: "ai",
          text: "I'm temporarily experiencing high traffic. Please feel free to optimize your resume directly or submit an Admin ticket from the Contact Us options.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Send Admin Ticket Message
  const handleSendTicketMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMsg = inputText.trim();
    if (!userMsg || loading) return;

    setInputText("");
    setLoading(true);

    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          userPlan: activePlan.toLowerCase().includes("promax") ? "promax" : activePlan.toLowerCase().includes("premium") ? "premium" : "free",
          userCredits: rawCredits?.isOwner ? 999999 : (activePlan === "Premium Pro" ? rawCredits?.paidCredits : rawCredits?.freeRemaining) || 0
        })
      });

      if (res.ok) {
        toast.success("Ticket message sent to Admin team.");
        await loadAdminTickets();
      } else {
        toast.error("Failed to send ticket message.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter FAQs by search query
  const filteredFaqs = FAQS.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setView("help-center");
          }}
          className="h-14 w-14 rounded-full bg-white hover:bg-slate-50 text-[#0d6e5a] shadow-xl flex items-center justify-center border border-slate-200 hover:scale-105 active:scale-95 transition-all duration-300 select-none cursor-pointer"
          title="Open Help Center"
        >
          <HeadphonesIcon className="h-6 w-6 text-[#0d6e5a]" />
        </button>
      )}

      {/* Main Container Widget */}
      {isOpen && (
        <Card className="w-80 sm:w-[380px] h-[540px] bg-white border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* ============================================================ */}
          {/* VIEW 1: HELP CENTER                                           */}
          {/* ============================================================ */}
          {view === "help-center" && (
            <div className="flex flex-col h-full bg-white">
              {/* Header */}
              <div className="bg-white border-b border-slate-200 p-4 sm:p-5 flex items-start justify-between select-none">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a] shrink-0">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Help Center</h3>
                    <p className="text-xs text-slate-500 font-medium">How can we help you today?</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3.5 bg-slate-50 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search FAQs..."
                    className="pl-9 bg-white border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 rounded-xl h-9 focus:border-[#0d6e5a]"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Popular FAQs list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between select-none">
                  <h4 className="text-xs font-bold text-slate-800">Popular FAQs</h4>
                  <span className="text-[10px] text-slate-500 font-semibold">{filteredFaqs.length} articles</span>
                </div>

                <div className="space-y-2">
                  {filteredFaqs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                      No results found for &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : (
                    filteredFaqs.map((faq) => {
                      const isExpanded = expandedFaq === faq.id;
                      return (
                        <div
                          key={faq.id}
                          className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                            className="w-full p-3.5 flex items-center justify-between text-left gap-3 text-xs font-bold text-slate-800 hover:text-[#0d6e5a]"
                          >
                            <span className="leading-snug">{faq.question}</span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-slate-600 leading-relaxed border-t border-slate-200 bg-white">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bottom "Need more help? -> Contact Us" Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 text-center select-none">
                <p className="text-[11px] text-slate-500 font-semibold">Need more help?</p>
                <Button
                  onClick={() => setView("contact-options")}
                  className="w-full bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                >
                  <HeadphonesIcon className="h-4 w-4" />
                  Contact Us
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 2: CONTACT US SELECTION                                 */}
          {/* ============================================================ */}
          {view === "contact-options" && (
            <div className="flex flex-col h-full bg-white">
              {/* Header */}
              <div className="bg-white border-b border-slate-200 p-4 sm:p-5 flex items-center justify-between select-none">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setView("help-center")}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Contact Us</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Contact Options List */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-center bg-slate-50/50">
                {/* Option 1: Create Ticket (Admin Team) */}
                <button
                  onClick={() => {
                    setView("ticket");
                    if (userId) loadAdminTickets();
                  }}
                  className="w-full p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#0d6e5a]/40 rounded-2xl flex items-center justify-between gap-4 text-left transition-all group shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a] group-hover:scale-105 transition-transform shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-[#0d6e5a] transition-colors">
                        Create Ticket
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                        Resolution in 1-2 days &bull; Admin Support
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0d6e5a] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                {/* Option 2: AI Assistant Chat (Pro Max Exclusive) */}
                <button
                  onClick={() => {
                    const isProMax = activePlan.toLowerCase().includes("promax") || 
                                     activePlan.toLowerCase().includes("pro max") || 
                                     activePlan.toLowerCase().includes("owner") || 
                                     (rawCredits?.isOwner ?? false) || 
                                     (rawCredits?.paidCredits ?? 0) >= 99999;
                    if (!isProMax) {
                      toast.error("24/7 AI Chatbot is an exclusive feature of the Pro Max plan. Please upgrade to Pro Max.");
                      setTimeout(() => {
                        window.location.href = "/dashboard/pricing";
                      }, 1500);
                      return;
                    }
                    setView("ai-chat");
                  }}
                  className="w-full p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#0d6e5a]/40 rounded-2xl flex items-center justify-between gap-4 text-left transition-all group shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0d6e5a] group-hover:scale-105 transition-transform shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-[#0d6e5a] transition-colors">
                          AI Chat
                        </h4>
                        <Badge className="bg-emerald-50 border border-emerald-200 text-[#0d6e5a] text-[8px] font-bold uppercase tracking-wider px-1.5 py-0 rounded select-none">
                          24/7 ONLINE
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                        Instant AI Assistant &bull; Ask anything about FastHire
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#0d6e5a] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </div>

              {/* Bottom Quick Back Link */}
              <div className="p-4 border-t border-slate-200 text-center bg-slate-50">
                <button
                  onClick={() => setView("help-center")}
                  className="text-xs font-bold text-slate-500 hover:text-[#0d6e5a] transition-colors"
                >
                  &larr; Back to Help Center FAQs
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 3: ADMIN SUPPORT TICKET                                 */}
          {/* ============================================================ */}
          {view === "ticket" && (
            <div className="flex flex-col h-full bg-white">
              {/* Header */}
              <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between select-none">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setView("contact-options")}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Back to Contact Options"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">Admin Support Ticket</h3>
                    <span className="text-[9px] text-slate-500 font-semibold flex items-center gap-1 select-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Direct Admin Message
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={loadAdminTickets}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="Refresh tickets"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Ticket Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
                {loadingTickets ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2 select-none">
                    <Loader2 className="h-5 w-5 text-[#0d6e5a] animate-spin" />
                    <p className="text-[10px] text-slate-500 font-semibold">Loading messages...</p>
                  </div>
                ) : adminTickets.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-2 select-none">
                    <Mail className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-[11px] font-bold text-slate-900">Create a Support Ticket</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Have a billing or optimization question? Send a message to our admin team and we&apos;ll reply directly here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200 p-2 rounded-lg text-[9px] text-slate-500 flex items-center justify-between select-none shadow-sm">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="h-2.5 w-2.5 text-amber-600" />
                        Auto-deletes 24h after admin reply
                      </span>
                      <button
                        onClick={loadAdminTickets}
                        className="text-[#0d6e5a] hover:text-[#094d3f] flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <RefreshCw className="h-2.5 w-2.5" /> Refresh
                      </button>
                    </div>

                    {adminTickets.map((ticket: any) => (
                      <div key={ticket.id} className="space-y-2.5">
                        {/* User message */}
                        <div className="flex justify-end">
                          <div className="max-w-[85%] bg-[#0d6e5a] text-white rounded-2xl rounded-br-none px-3.5 py-2 text-xs leading-relaxed shadow-sm">
                            <p>{ticket.message}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-1 border-t border-white/20 pt-0.5">
                              <span className="text-[8px] text-white/80">
                                {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <Badge className="bg-white/20 border-none text-white text-[7px] font-bold px-1 rounded">Sent</Badge>
                            </div>
                          </div>
                        </div>

                        {/* Admin reply */}
                        {ticket.reply ? (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-none px-3.5 py-2 text-xs leading-relaxed shadow-sm">
                              <div className="flex items-center gap-1 text-[8px] text-[#0d6e5a] font-extrabold uppercase tracking-wide mb-1">
                                <ShieldCheck className="h-3 w-3 shrink-0 text-[#0d6e5a]" />
                                Admin Reply
                              </div>
                              <p>{ticket.reply}</p>
                              <span className="block text-[8px] text-slate-400 font-semibold text-right mt-1.5">
                                {new Date(ticket.repliedAt || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl rounded-bl-none px-3.5 py-2 text-xs leading-relaxed italic select-none">
                              <div className="flex items-center gap-1.5 text-[8px] text-amber-700 font-bold uppercase tracking-wider animate-pulse mb-1">
                                <Clock className="h-3 w-3" />
                                Awaiting admin reply...
                              </div>
                              Our support team will respond within 1-2 days.
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose Ticket Input */}
              <div className="p-3.5 border-t border-slate-200 bg-white">
                <form onSubmit={handleSendTicketMessage} className="flex gap-2">
                  <Input
                    placeholder="Describe your issue or request..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={loading}
                    className="flex-1 bg-slate-50 border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0d6e5a] focus:bg-white rounded-xl h-9"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    className="h-9 w-9 p-0 bg-[#0d6e5a] hover:bg-[#094d3f] text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 4: AI ASSISTANT CHATBOT                                 */}
          {/* ============================================================ */}
          {view === "ai-chat" && (
            <div className="flex flex-col h-full bg-white">
              {/* Header */}
              <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between select-none">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setView("contact-options")}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Back to Contact Options"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">FastHire AI Assistant</h3>
                    <span className="text-[9px] text-slate-500 font-semibold flex items-center gap-1 select-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0d6e5a] animate-pulse" />
                      24/7 Instant AI Coach
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* AI Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
                {aiHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                      msg.sender === "user"
                        ? "bg-[#0d6e5a] text-white rounded-br-none"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                    }`}>
                      <div className="whitespace-pre-wrap">{cleanAsterisks(msg.text)}</div>
                      <span className={`block text-[8px] font-semibold text-right mt-1.5 ${
                        msg.sender === "user" ? "text-white/80" : "text-slate-400"
                      }`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl rounded-bl-none px-3.5 py-2.5 text-xs flex items-center gap-2 shadow-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0d6e5a]" />
                      <span>FastHire AI is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Quick Prompt Chips */}
              <div className="px-3.5 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar">
                {[
                  "How to get 90+ ATS score?",
                  "How to tailor for any JD?",
                  "Explain pricing plans",
                  "How do credits work?"
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(chip);
                    }}
                    className="shrink-0 text-[9px] font-bold px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-sm cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3.5 border-t border-slate-200 bg-white">
                <form onSubmit={handleSendAiMessage} className="flex gap-2">
                  <Input
                    placeholder="Ask AI anything..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={loading}
                    className="flex-1 bg-slate-50 border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0d6e5a] focus:bg-white rounded-xl h-9"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    className="h-9 w-9 p-0 bg-[#0d6e5a] hover:bg-[#094d3f] text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </div>
          )}

        </Card>
      )}
    </div>
  );
}
