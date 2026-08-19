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

const FAQS: FAQItem[] = [
  {
    id: "payment-visibility",
    question: "Why is my payment not visible on the dashboard?",
    answer: "Payments are verified securely in real-time via Razorpay. If your credits haven't refreshed immediately, please check your Billing & Subscription page, click 'Refresh', or create a support ticket with your Payment ID."
  },
  {
    id: "credits-reset",
    question: "When do my monthly optimization credits reset?",
    answer: "Your credits refresh automatically every 30 days on your monthly billing cycle date. Free plan users get 2 optimizations per month, Pro gets 20, and Pro Max members get unlimited optimizations."
  },
  {
    id: "ats-scoring",
    question: "How does FastHire ATS scoring & keyword optimization work?",
    answer: "FastHire AI analyzes your resume against target job description keywords, technical requirements, and industry-standard ATS rubrics, highlighting exact keyword gaps and upgrading weak bullet points."
  },
  {
    id: "gst-invoices",
    question: "How do GST tax invoices work?",
    answer: "Every transaction generates an official 18% GST tax invoice with an official breakdown. You can preview and download GST invoices as PDFs anytime on your Billing page."
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
        body: JSON.stringify({ question: userMsg })
      });

      if (response.ok) {
        const data = await response.json();
        setAiHistory([
          ...newHistory,
          {
            sender: "ai",
            text: data.answer || "I am here to assist with any questions about FastHire AI!",
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
          className="h-14 w-14 rounded-full bg-black hover:bg-[#14162e] text-white shadow-2xl flex items-center justify-center border border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 select-none cursor-pointer"
          title="Open Help Center"
        >
          <HeadphonesIcon className="h-6 w-6 text-teal-400" />
        </button>
      )}

      {/* Main Container Widget */}
      {isOpen && (
        <Card className="w-80 sm:w-[380px] h-[540px] bg-[#0c0d1e] border-white/10 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* ============================================================ */}
          {/* VIEW 1: HELP CENTER (Image 1 style)                           */}
          {/* ============================================================ */}
          {view === "help-center" && (
            <div className="flex flex-col h-full bg-[#0a0c1a]">
              {/* Header */}
              <div className="bg-[#121428] border-b border-white/8 p-5 flex items-start justify-between select-none">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-white text-base tracking-tight">Help center</h3>
                    <p className="text-xs text-slate-400 font-medium">How can we help you today?</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 bg-[#0a0c1a] border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    className="pl-9 bg-[#111326] border-white/10 text-xs text-white placeholder:text-slate-500 rounded-xl h-9 focus:border-white/30"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Popular FAQs list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between select-none">
                  <h4 className="text-xs font-bold text-slate-300">Popular FAQs</h4>
                  <span className="text-[10px] text-slate-500 font-semibold">{filteredFaqs.length} articles</span>
                </div>

                <div className="space-y-2">
                  {filteredFaqs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                      No results found for &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : (
                    filteredFaqs.map((faq) => {
                      const isExpanded = expandedFaq === faq.id;
                      return (
                        <div
                          key={faq.id}
                          className="bg-[#121429] border border-white/5 hover:border-white/15 rounded-xl transition-all overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                            className="w-full p-3.5 flex items-center justify-between text-left gap-3 text-xs font-bold text-slate-200 hover:text-white"
                          >
                            <span className="leading-snug">{faq.question}</span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-slate-400 leading-relaxed border-t border-white/5 bg-[#0e1022]">
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
              <div className="p-4 bg-[#101224] border-t border-white/8 space-y-2.5 text-center select-none">
                <p className="text-[11px] text-slate-400 font-semibold">Need more help?</p>
                <Button
                  onClick={() => setView("contact-options")}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  <HeadphonesIcon className="h-4 w-4" />
                  Contact Us
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 2: CONTACT US SELECTION (Image 2 style)                 */}
          {/* ============================================================ */}
          {view === "contact-options" && (
            <div className="flex flex-col h-full bg-[#0a0c1a]">
              {/* Header */}
              <div className="bg-[#121428] border-b border-white/8 p-5 flex items-center justify-between select-none">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setView("help-center")}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h3 className="font-extrabold text-white text-base tracking-tight">Contact Us</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Contact Options List */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-center">
                {/* Option 1: Create Ticket (Admin Team) */}
                <button
                  onClick={() => {
                    setView("ticket");
                    if (userId) loadAdminTickets();
                  }}
                  className="w-full p-4 bg-[#121429] hover:bg-[#181b36] border border-white/8 hover:border-white/20 rounded-2xl flex items-center justify-between gap-4 text-left transition-all group shadow-lg cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-white group-hover:text-blue-300 transition-colors">
                        Create ticket
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        Resolution in 1-2 days &bull; Admin Support
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                {/* Option 2: AI Assistant Chat */}
                <button
                  onClick={() => setView("ai-chat")}
                  className="w-full p-4 bg-[#121429] hover:bg-[#181b36] border border-white/8 hover:border-white/20 rounded-2xl flex items-center justify-between gap-4 text-left transition-all group shadow-lg cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform shrink-0">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-white group-hover:text-violet-300 transition-colors">
                        Chat
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        Instant AI Assistant &bull; 24/7 Support
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </div>

              {/* Bottom Quick Back Link */}
              <div className="p-4 border-t border-white/5 text-center bg-[#0d0f20]">
                <button
                  onClick={() => setView("help-center")}
                  className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
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
            <div className="flex flex-col h-full bg-[#0a0c1a]">
              {/* Header */}
              <div className="bg-[#121428] border-b border-white/8 p-4 flex items-center justify-between select-none">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setView("contact-options")}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Back to Contact Options"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h3 className="font-extrabold text-white text-xs tracking-tight">Admin Support Ticket</h3>
                    <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 select-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      Direct Admin Message
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={loadAdminTickets}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/5"
                    title="Refresh tickets"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Ticket Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#090a18]/45">
                {loadingTickets ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2 select-none">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                    <p className="text-[10px] text-slate-500 font-semibold">Loading messages...</p>
                  </div>
                ) : adminTickets.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-2 select-none">
                    <Mail className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-[11px] font-bold text-white">Create a Support Ticket</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Have a billing or optimization question? Send a message to our admin team and we&apos;ll reply directly here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-[#12132a]/40 border border-white/5 p-2 rounded-lg text-[9px] text-slate-400 flex items-center justify-between select-none">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-2.5 w-2.5 text-amber-400" />
                        Auto-deletes 24h after admin reply
                      </span>
                      <button
                        onClick={loadAdminTickets}
                        className="text-slate-200 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <RefreshCw className="h-2.5 w-2.5" /> Refresh
                      </button>
                    </div>

                    {adminTickets.map((ticket: any) => (
                      <div key={ticket.id} className="space-y-2.5">
                        {/* User message */}
                        <div className="flex justify-end">
                          <div className="max-w-[85%] bg-black border border-white/20 text-white rounded-2xl rounded-br-none px-3.5 py-2 text-xs leading-relaxed">
                            <p>{ticket.message}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-1 border-t border-white/10 pt-0.5">
                              <span className="text-[8px] text-slate-400">
                                {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <Badge className="bg-white/10 border-none text-white text-[7px] font-bold px-1 rounded">Sent</Badge>
                            </div>
                          </div>
                        </div>

                        {/* Admin reply */}
                        {ticket.reply ? (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-[#14162e] border border-white/10 text-slate-100 rounded-2xl rounded-bl-none px-3.5 py-2 text-xs leading-relaxed">
                              <div className="flex items-center gap-1 text-[8px] text-white font-extrabold uppercase tracking-wide mb-1">
                                <ShieldCheck className="h-3 w-3 shrink-0 text-white" />
                                Admin Reply
                              </div>
                              <p>{ticket.reply}</p>
                              <span className="block text-[8px] text-slate-500 font-semibold text-right mt-1.5">
                                {new Date(ticket.repliedAt || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] bg-[#1b1710] border border-amber-500/20 text-slate-400 rounded-2xl rounded-bl-none px-3.5 py-2 text-xs leading-relaxed italic select-none">
                              <div className="flex items-center gap-1.5 text-[8px] text-amber-500 font-bold uppercase tracking-wider animate-pulse mb-1">
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
              <div className="p-3.5 border-t border-white/5 bg-[#12132a]/30">
                <form onSubmit={handleSendTicketMessage} className="flex gap-2">
                  <Input
                    placeholder="Describe your issue or request..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={loading}
                    className="flex-1 bg-[#060714] border-white/10 text-xs text-white focus:border-white/30 rounded-xl h-9"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    className="h-9 w-9 p-0 bg-black hover:bg-white/10 text-white border border-white/20 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
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
            <div className="flex flex-col h-full bg-[#0a0c1a]">
              {/* Header */}
              <div className="bg-[#121428] border-b border-white/8 p-4 flex items-center justify-between select-none">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setView("contact-options")}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Back to Contact Options"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h3 className="font-extrabold text-white text-xs tracking-tight">FastHire AI Assistant</h3>
                    <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 select-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                      24/7 Instant AI Coach
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* AI Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#090a18]/45">
                {aiHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-black border border-white/20 text-white rounded-br-none"
                        : "bg-[#14162e] border border-white/5 text-slate-200 rounded-bl-none"
                    }`}>
                      {msg.text}
                      <span className="block text-[8px] text-slate-500 font-semibold text-right mt-1.5">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-[#14162e] border border-white/5 text-slate-400 rounded-2xl rounded-bl-none px-3.5 py-2.5 text-xs flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                      <span>FastHire AI is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Quick Prompt Chips */}
              <div className="px-3.5 py-2 border-t border-white/5 bg-[#0d0f20] flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar">
                {[
                  "How to get 90+ ATS score?",
                  "Explain Pro Max features",
                  "How to tailor for any JD?"
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(chip);
                    }}
                    className="shrink-0 text-[9px] font-bold px-2.5 py-1 rounded-full bg-[#161833] hover:bg-[#1f2248] text-slate-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3.5 border-t border-white/5 bg-[#12132a]/30">
                <form onSubmit={handleSendAiMessage} className="flex gap-2">
                  <Input
                    placeholder="Ask AI anything..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={loading}
                    className="flex-1 bg-[#060714] border-white/10 text-xs text-white focus:border-white/30 rounded-xl h-9"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    className="h-9 w-9 p-0 bg-black hover:bg-white/10 text-white border border-white/20 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
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
