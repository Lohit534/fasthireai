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


  // Load admin tickets when opened
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
        <div className="w-80 sm:w-[360px] h-[460px] bg-[#0c0d1e] border border-white/10 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#12132a] border-b border-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <HeadphonesIcon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-xs tracking-tight">Admin Support</h3>
                <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Send message to our team
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#090a18]/45">
            {loadingTickets ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                <p className="text-[10px] text-slate-500 font-semibold select-none">Loading messages...</p>
              </div>
            ) : adminTickets.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2 select-none">
                <MessageSquare className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-[11px] font-bold text-white">Message the Admin</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Have a question? Send a message to our support team and we&apos;ll reply here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Refresh bar */}
                <div className="bg-[#12132a]/40 border border-white/5 p-2 rounded-lg text-[9px] text-slate-400 flex items-center justify-between select-none">
                  <span>Admin Support Channel</span>
                  <button
                    onClick={loadAdminTickets}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Refresh
                  </button>
                </div>

                {adminTickets.map((ticket: any) => (
                  <div key={ticket.id} className="space-y-2.5">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-emerald-700 text-white rounded-2xl rounded-br-none px-3.5 py-2 text-xs leading-relaxed">
                        <p>{ticket.message}</p>
                        <div className="flex items-center justify-end gap-1.5 mt-1 border-t border-white/10 pt-0.5">
                          <span className="text-[8px] text-emerald-200">
                            {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <Badge className="bg-white/10 border-none text-white text-[7px] font-bold px-1 rounded">Sent</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Admin reply */}
                    {ticket.reply ? (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] bg-[#0f1d19] border border-emerald-500/20 text-slate-200 rounded-2xl rounded-bl-none px-3.5 py-2 text-xs leading-relaxed">
                          <div className="flex items-center gap-1 text-[8px] text-emerald-400 font-extrabold uppercase tracking-wide mb-1">
                            <ShieldCheck className="h-3 w-3 shrink-0" />
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
          <div className="p-3.5 border-t border-white/5 bg-[#12132a]/30">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Message the admin team..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                className="flex-1 bg-[#060714] border-white/5 text-xs text-white focus:border-emerald-500 rounded-xl h-9"
              />
              <Button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/10"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-2xl flex items-center justify-center border border-white/10 hover:scale-105 active:scale-95 transition-all duration-300"
          title="Contact Admin Support"
        >
          <HeadphonesIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
