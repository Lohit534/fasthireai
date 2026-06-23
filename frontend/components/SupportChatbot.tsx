"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  CheckCircle2,
  Clock
} from "lucide-react";
import { toast } from "react-hot-toast";

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

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"ai" | "admin">("ai"); // 'ai' = AI Assistant, 'admin' = Contact Admin
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  
  // User context metadata
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string>("Free Tier");
  const [remainingCredits, setRemainingCredits] = useState<string>("2");
  const [rawCredits, setRawCredits] = useState<UserCreditsInfo | null>(null);

  // Chat message histories
  const [aiHistory, setAiHistory] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Hello! I am your FastHire-AI Assistant. Ask me anything about resume optimization, ATS scores, our Pro Max plan, or how to use the builder!",
      timestamp: new Date()
    }
  ]);
  
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiHistory, adminTickets, isOpen, mode]);

  // Load User Authentication & Plan details
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          setUserEmail(user.email ?? null);
          
          // Fetch backend credits
          const credRes = await fetch("/api/credits");
          if (credRes.ok) {
            const creds: UserCreditsInfo = await credRes.json();
            setRawCredits(creds);

            // Fetch stored plan ID
            const planId = localStorage.getItem(`fastHire_plan_${user.id}`) || "free";
            
            // Map plan name and credits
            if (creds.isOwner) {
              setActivePlan(`Owner (${planId === "promax" ? "Pro Max" : planId === "premium" ? "Premium Pro" : "Free"})`);
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
      } catch (err) {
        console.error("Failed to load user credentials for support bot:", err);
      }
    }

    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  // Load human admin support tickets
  const loadAdminTickets = async () => {
    if (!userId) return;
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/support/messages");
      if (res.ok) {
        const data = await res.json();
        // Sort tickets by oldest/newest appropriately
        setAdminTickets(data.reverse()); // Show newest at the bottom
      }
    } catch (err) {
      console.error("Error loading support tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (isOpen && mode === "admin" && userId) {
      loadAdminTickets();
    }
  }, [isOpen, mode, userId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText("");

    if (mode === "ai") {
      // 1. Add User Message to AI History
      setAiHistory(prev => [...prev, { sender: "user", text: userMsg, timestamp: new Date() }]);
      setLoading(true);

      try {
        const res = await fetch("/api/support/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userMsg })
        });

        if (res.ok) {
          const data = await res.json();
          setAiHistory(prev => [...prev, { sender: "ai", text: data.answer, timestamp: new Date() }]);
        } else {
          setAiHistory(prev => [...prev, { 
            sender: "ai", 
            text: "Sorry, I am having trouble connecting right now. Please try again or toggle to 'Contact Admin' to drop a message.", 
            timestamp: new Date() 
          }]);
        }
      } catch (err) {
        setAiHistory(prev => [...prev, { 
          sender: "ai", 
          text: "Connection error. Please check your network and try again.", 
          timestamp: new Date() 
        }]);
      } finally {
        setLoading(false);
      }
    } else {
      // 2. Contact Admin mode
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
          toast.success("Message logged for the FastHire-AI Admin.");
          // Reload tickets
          await loadAdminTickets();
        } else {
          toast.error("Failed to send support ticket.");
        }
      } catch (err) {
        toast.error("Network error sending message.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-2xl flex items-center justify-center border border-white/10 hover:scale-105 active:scale-95 transition-all duration-300"
          title="Open Help & Support Chat"
        >
          <MessageSquare className="h-6 w-6 animate-pulse" />
        </Button>
      )}

      {/* Premium Chat Panel */}
      {isOpen && (
        <Card className="w-80 sm:w-96 h-[520px] bg-[#0c0d1e] border-white/10 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header Panel (incorporating the 2 required things: plan and credits) */}
          <div className="bg-[#12132a] border-b border-white/5 p-4 flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-violet-600/25 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <HelpCircle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-xs tracking-tight">FastHire Support Chat</h3>
                  <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 select-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Support Online
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/5 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Crucial Section: The 2 details requested (active simulated plan, remaining credits balance) */}
            <div className="grid grid-cols-2 gap-2 bg-[#060714]/80 border border-white/5 p-2.5 rounded-xl text-[10px] font-bold select-none mt-1">
              <div className="space-y-0.5">
                <span className="text-[8px] text-slate-500 uppercase tracking-wider block">Simulated Plan</span>
                <span className="text-violet-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-violet-400 shrink-0" />
                  {activePlan}
                </span>
              </div>
              <div className="space-y-0.5 border-l border-white/5 pl-2">
                <span className="text-[8px] text-slate-500 uppercase tracking-wider block">Credits Remaining</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Coins className="h-3 w-3 text-emerald-400 shrink-0" />
                  {remainingCredits}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switch Toggle Selector */}
          <div className="px-4 py-2 border-b border-white/5 bg-[#0e0f21]/20 flex gap-2">
            <button
              onClick={() => setMode("ai")}
              className={`flex-1 py-1 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 border ${
                mode === "ai"
                  ? "bg-violet-600/10 border-violet-500/25 text-violet-400 font-bold"
                  : "bg-transparent border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Cpu className="h-3 w-3" />
              AI Assistant
            </button>
            <button
              onClick={() => setMode("admin")}
              className={`flex-1 py-1 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 border ${
                mode === "admin"
                  ? "bg-violet-600/10 border-violet-500/25 text-violet-400 font-bold"
                  : "bg-transparent border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <User className="h-3 w-3" />
              Contact Admin
            </button>
          </div>

          {/* Chat Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#090a18]/45">
            {mode === "ai" ? (
              // AI Assistant Messages Logs
              aiHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-violet-600 text-white rounded-br-none"
                      : "bg-[#14162e] border border-white/5 text-slate-200 rounded-bl-none"
                  }`}>
                    {msg.text}
                    <span className="block text-[8px] text-slate-500 font-semibold text-right mt-1.5">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              // Contact Human Admin Logs
              loadingTickets ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
                  <p className="text-[10px] text-slate-500 font-semibold select-none">Syncing admin conversation...</p>
                </div>
              ) : adminTickets.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-2 select-none">
                  <MessageSquare className="h-8 w-8 text-slate-600 mx-auto" />
                  <p className="text-[11px] font-bold text-white">Direct Message to Admin</p>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Submit a query to our system administrator. Support responses will be pushed directly here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Notice */}
                  <div className="bg-[#12132a]/40 border border-white/5 p-2 rounded-lg text-[9px] text-slate-400 flex items-center justify-between select-none">
                    <span>Direct Admin Support Channel</span>
                    <button 
                      onClick={loadAdminTickets} 
                      className="text-violet-400 hover:text-violet-300 flex items-center gap-1 font-bold"
                    >
                      <RefreshCw className="h-2.5 w-2.5" /> Refresh
                    </button>
                  </div>

                  {adminTickets.map((ticket: any) => (
                    <div key={ticket.id} className="space-y-2.5">
                      {/* User message ticket */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] bg-violet-600 text-white rounded-2xl rounded-br-none px-3.5 py-2 text-xs leading-relaxed">
                          <p>{ticket.message}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-1 border-t border-white/10 pt-0.5">
                            <span className="text-[8px] text-violet-200">
                              {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <Badge className="bg-white/10 border-none text-white text-[7px] font-bold px-1 rounded">
                              Sent
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Admin response block if exists */}
                      {ticket.reply ? (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] bg-[#0f1d19] border border-emerald-500/20 text-slate-200 rounded-2xl rounded-bl-none px-3.5 py-2 text-xs leading-relaxed">
                            <div className="flex items-center gap-1 text-[8px] text-emerald-400 font-extrabold uppercase tracking-wide mb-1">
                              <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
                              Admin Reply
                            </div>
                            <p>{ticket.reply}</p>
                            <span className="block text-[8px] text-slate-500 font-semibold text-right mt-1.5">
                              {new Date(ticket.repliedAt || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] bg-[#1b1710] border border-amber-500/20 text-slate-400 rounded-2xl rounded-bl-none px-3.5 py-2 text-xs leading-relaxed italic select-none">
                            <div className="flex items-center gap-1.5 text-[8px] text-amber-500 font-bold uppercase tracking-wider animate-pulse mb-1">
                              <Clock className="h-3 w-3" />
                              Awaiting reply response...
                            </div>
                            Our owner/support agent will review your inquiry shortly.
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* AI typing loading indicator */}
            {loading && mode === "ai" && (
              <div className="flex justify-start">
                <div className="bg-[#14162e] border border-white/5 text-slate-400 rounded-2xl rounded-bl-none px-3.5 py-2.5 text-xs flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                  <span>AI assistant is typing response...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form Input Footer */}
          <div className="p-3.5 border-t border-white/5 bg-[#12132a]/30">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder={mode === "ai" ? "Ask the AI assistant..." : "Message human administrator..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                className="flex-1 bg-[#060714] border-white/5 text-xs text-white focus:border-violet-500 rounded-xl h-9"
              />
              <Button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="h-9 w-9 p-0 bg-violet-600 hover:bg-violet-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-violet-600/10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>

        </Card>
      )}
    </div>
  );
}
