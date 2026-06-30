"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  ArrowLeft, 
  MessageSquare, 
  User, 
  Sparkles, 
  Clock, 
  CheckCircle,
  Inbox,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

interface Ticket {
  id: string;
  userId: string;
  userEmail: string;
  userPlan: string;
  userCredits: number;
  message: string;
  reply: string | null;
  status: "pending" | "replied";
  createdAt: string;
  repliedAt: string | null;
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "replied">("all");
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          toast.error("Please sign in to access admin services.");
          router.push("/auth/login");
          return;
        }

        // Verify if user is an owner on backend
        const res = await fetch("/api/credits");
        if (res.ok) {
          const creditsData = await res.json();
          if (!creditsData.isOwner) {
            toast.error("Access denied. Admin access only.");
            router.push("/dashboard");
            return;
          }
        } else {
          toast.error("Failed to verify admin status.");
          router.push("/dashboard");
          return;
        }

        setAuthLoading(false);
        loadTickets();
      } catch (err) {
        toast.error("Authentication check failed.");
        router.push("/dashboard");
      }
    }
    checkAdmin();
  }, [router]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support/messages");
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (data.length > 0) {
          setSelectedTicket(data[0]);
        }
      } else {
        toast.error("Failed to fetch support messages.");
      }
    } catch (e) {
      toast.error("Error loading tickets.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          messageId: selectedTicket.id,
          replyText: replyText.trim()
        })
      });

      if (res.ok) {
        const responseData = await res.json();
        toast.success("Reply submitted successfully!");
        setReplyText("");
        
        // Refresh ticket list and maintain selection
        const updatedTickets = tickets.map((t) => 
          t.id === selectedTicket.id 
            ? { ...t, reply: replyText.trim(), status: "replied" as const, repliedAt: new Date().toISOString() } 
            : t
        );
        setTickets(updatedTickets);
        setSelectedTicket(updatedTickets.find((t) => t.id === selectedTicket.id) || null);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to submit reply.");
      }
    } catch (err) {
      toast.error("Connection error submitting reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    if (!confirm("Are you sure you want to delete this ticket permanently?")) return;

    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          messageId: selectedTicket.id,
        })
      });

      if (res.ok) {
        toast.success("Ticket deleted successfully.");
        const remaining = tickets.filter(t => t.id !== selectedTicket.id);
        setTickets(remaining);
        setSelectedTicket(remaining.length > 0 ? remaining[0] : null);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to delete ticket.");
      }
    } catch (err) {
      toast.error("Connection error deleting ticket.");
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  const filteredTickets = tickets.filter((t) => {
    if (filter === "pending") return t.status === "pending";
    if (filter === "replied") return t.status === "replied";
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Header Block */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-white/5 text-slate-300 hover:bg-white/5 h-9 w-9 p-0 rounded-full bg-transparent">
                <ArrowLeft className="h-4.5 w-4.5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-violet-400" />
                User Support Messaging
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Answer help tickets, check simulated plans, and message users.
              </p>
            </div>
          </div>

          <Badge className="bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold px-3 py-1 rounded-full animate-pulse select-none">
            Admin Workspace
          </Badge>
        </div>

        {/* Dashboard Grid split */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            <p className="text-xs text-slate-500 font-semibold">Loading support logs...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl p-20 text-center border border-dashed border-white/5 bg-[#0e0f21]/20 max-w-xl mx-auto w-full select-none">
            <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Inbox className="h-6 w-6 text-violet-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">No Tickets Logged</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When users post help queries or direct messages from their chatbot drawer, they will populate here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Sidebar List View */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Filter Tabs */}
              <div className="flex bg-[#0f1022] border border-white/5 p-1 rounded-xl gap-1">
                {(["all", "pending", "replied"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                      filter === tab
                        ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab === "all" ? "All Messages" : tab === "pending" ? "Pending" : "Replied"}
                  </button>
                ))}
              </div>

              {/* Tickets List */}
              <div className="space-y-3 overflow-y-auto max-h-[550px] pr-2">
                {filteredTickets.length === 0 ? (
                  <div className="text-center p-8 bg-[#0e0f21]/25 border border-white/5 rounded-xl text-slate-500 text-xs italic select-none">
                    No tickets match current filter.
                  </div>
                ) : (
                  filteredTickets.map((ticket) => {
                    const isSelected = selectedTicket?.id === ticket.id;
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden ${
                          isSelected 
                            ? "bg-violet-950/20 border-violet-500/30 text-white" 
                            : "bg-[#0e0f21]/40 border-white/5 hover:border-white/10 text-slate-300"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-xs font-bold truncate max-w-[70%]">{ticket.userEmail}</span>
                          <Badge className={`text-[9px] font-bold border rounded-md uppercase shrink-0 ${
                            ticket.status === "pending"
                              ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          }`}>
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {ticket.message}
                        </p>
                        <div className="flex items-center justify-between gap-2 text-[9px] text-slate-500 font-semibold pt-1 border-t border-white/5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                          <span className="capitalize">{ticket.userPlan} Plan</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Conversation / Reply Pane */}
            <div className="lg:col-span-7">
              {selectedTicket ? (
                <Card className="border-white/5 bg-[#0e0f21]/40 shadow-xl h-full flex flex-col justify-between overflow-hidden rounded-2xl">
                  {/* Ticket Header Metadata */}
                  <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Submitted By</span>
                        <h3 className="font-extrabold text-white text-base mt-0.5">{selectedTicket.userEmail}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                          selectedTicket.status === "pending"
                            ? "bg-amber-500/10 border border-amber-500/25 text-amber-400 animate-pulse"
                            : "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
                        }`}>
                          {selectedTicket.status === "pending" ? "Awaiting Reply" : "Resolved"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleDeleteTicket}
                          className="h-7 px-3 text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-full transition-colors"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Attached details metadata (2 properties) */}
                    <div className="grid grid-cols-2 gap-4 bg-[#070814]/60 border border-white/5 p-4 rounded-xl text-xs font-semibold select-none">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Simulated User Plan</span>
                        <span className="text-white capitalize flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                          {selectedTicket.userPlan === "promax" ? "Pro Max" : selectedTicket.userPlan === "premium" ? "Premium Pro" : "Free Tier"}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Remaining API Credits</span>
                        <span className="text-white flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-violet-400" />
                          {selectedTicket.userCredits >= 99999 ? "Unlimited" : selectedTicket.userCredits}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Message body */}
                  <div className="p-6 flex-1 space-y-6 overflow-y-auto max-h-[350px]">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <User className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">User Query message</span>
                      </div>
                      <div className="bg-[#070814]/40 border border-white/5 p-4 rounded-xl text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {selectedTicket.message}
                      </div>
                    </div>

                    {selectedTicket.reply && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Admin Reply Response</span>
                        </div>
                        <div className="bg-emerald-950/5 border border-emerald-500/20 p-4 rounded-xl text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {selectedTicket.reply}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ticket Reply Form */}
                  <div className="p-6 border-t border-white/5 bg-[#070814]/30">
                    {!selectedTicket.reply ? (
                      <form onSubmit={handleReplySubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compose Ticket Reply</label>
                          <Textarea
                            placeholder="Type your reply response here..."
                            rows={3}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="bg-[#070814] border-white/5 text-white text-xs focus:border-violet-500 rounded-xl"
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            disabled={submittingReply || !replyText.trim()}
                            className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs h-9 px-6 rounded-xl shrink-0"
                          >
                            {submittingReply ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Send Reply Response"
                            )}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold select-none leading-relaxed">
                        <AlertCircle className="h-4 w-4" />
                        <span>This help ticket has been successfully resolved and locked. Replied on: {new Date(selectedTicket.repliedAt!).toLocaleString()}.</span>
                      </div>
                    )}
                  </div>

                </Card>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic p-20 select-none bg-[#0e0f21]/20 border border-white/5 rounded-2xl">
                  Select a support ticket from the sidebar to view thread details.
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
