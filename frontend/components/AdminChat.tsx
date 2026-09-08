"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Clock,
  HeadphonesIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [adminTickets, isOpen]);

  // Load user id
  useEffect(() => {
    supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) => {
      const u = res.data?.user;
      if (u) setUserId(u.id);
    });
  }, []);


  // Listen to open-support-chatbot custom event from Navbar
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
      if (userId) loadAdminTickets();
    };
    window.addEventListener("open-support-chatbot", handleOpenChat);
    return () => {
      window.removeEventListener("open-support-chatbot", handleOpenChat);
    };
  }, [userId]);

  // Load admin tickets when opened
  const loadAdminTickets = async () => {
    if (!userId) return;
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/support/messages");
      if (res.ok) {
        const data = await res.json();
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        // Filter tickets: only for current user AND not replied > 24 hours ago
        const userTickets = data.filter((t: any) => {
          if (t.userId !== userId) return false;
          if (t.reply && t.repliedAt) {
            const replyTime = new Date(t.repliedAt).getTime();
            if (now - replyTime > TWENTY_FOUR_HOURS) return false;
          }
          return true;
        });

        setAdminTickets(userTickets.reverse());
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      loadAdminTickets();
    }
  }, [isOpen, userId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = inputText.trim();
    if (!msg) return;
    setInputText("");
    setLoading(true);
    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, userPlan: "free", userCredits: 0 }),
      });
      if (res.ok) {
        toast.success("Message sent to admin!");
        await loadAdminTickets();
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end gap-3">
      {/* Chat Panel */}
      {isOpen && (
        <div className="w-80 sm:w-[360px] h-[460px] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a]">
                <HeadphonesIcon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">Admin Support</h3>
                <span className="text-[9px] text-slate-500 font-semibold flex items-center gap-1 select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Send message to our team
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
            {loadingTickets ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="h-5 w-5 text-[#0d6e5a] animate-spin" />
                <p className="text-[10px] text-slate-500 font-semibold select-none">Loading messages...</p>
              </div>
            ) : adminTickets.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2 select-none">
                <MessageSquare className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-[11px] font-bold text-slate-900">Message the Admin</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Have a question? Send a message to our support team and we&apos;ll reply here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Refresh bar */}
                <div className="bg-white border border-slate-200 p-2 rounded-lg text-[9px] text-slate-500 flex items-center justify-between select-none shadow-sm">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-2.5 w-2.5 text-amber-600" />
                    Auto-deletes 24h after admin reply
                  </span>
                  <button
                    onClick={loadAdminTickets}
                    className="text-[#0d6e5a] hover:text-[#094d3f] flex items-center gap-1 font-bold"
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
                            Awaiting reply...
                          </div>
                          Our support team will respond shortly.
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3.5 border-t border-slate-200 bg-white">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Message the admin team..."
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

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-white hover:bg-slate-50 text-[#0d6e5a] shadow-xl flex items-center justify-center border border-slate-200 hover:scale-105 active:scale-95 transition-all duration-300"
          title="Contact Admin Support"
        >
          <HeadphonesIcon className="h-6 w-6 text-[#0d6e5a]" />
        </button>
      )}
    </div>
  );
}
