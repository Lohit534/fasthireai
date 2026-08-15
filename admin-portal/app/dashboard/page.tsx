"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";
import {
  Loader2, LogOut, Layers, Users, MessageSquare, Inbox,
  Search, TrendingUp, TrendingDown, Wallet, Sparkles,
  CheckCircle, User as UserIcon, Clock, AlertCircle,
  Trash2, ShieldAlert
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

/* ──────────────────── Types ──────────────────── */
interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  plan: "free" | "premium" | "promax" | "owner";
  freeUsed: number;
  paidCredits: number;
}

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

/* ──────────────────── Dashboard ──────────────────── */
export default function AdminDashboard() {
  const [authLoading, setAuthLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "tickets" | "feedback">("users");

  // Users
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [analytics, setAnalytics] = useState<any>({ totalOptimizations: 0, totalTickets: 0 });
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketFilter, setTicketFilter] = useState<"all" | "pending" | "replied">("all");
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Feedback
  const [feedbackMessages, setFeedbackMessages] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      const token = data.session?.access_token;
      if (!user || !isAdminEmail(user.email)) {
        window.location.href = "/";
        return;
      }
      setAccessToken(token || null);
      setAuthLoading(false);
      loadUsers(token);
      loadTickets(token);
      loadFeedback(token);
    });
  }, []);

  const authHeaders = (token: string | null) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  /* ── Data loaders ── */
  const loadUsers = async (token = accessToken) => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users", { headers: authHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setAnalytics(data.analytics || { totalOptimizations: 0, totalTickets: 0 });
      } else toast.error("Failed to load users.");
    } catch { toast.error("Error loading users."); }
    finally { setUsersLoading(false); }
  };

  const loadTickets = async (token = accessToken) => {
    setTicketsLoading(true);
    try {
      const res = await fetch("/api/tickets", { headers: authHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (data.length > 0) setSelectedTicket(data[0]);
      } else toast.error("Failed to load tickets.");
    } catch { toast.error("Error loading tickets."); }
    finally { setTicketsLoading(false); }
  };

  const loadFeedback = async (token = accessToken) => {
    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/feedback", { headers: authHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setFeedbackMessages(Array.isArray(data) ? data : []);
      }
    } catch { toast.error("Error loading feedback."); }
    finally { setFeedbackLoading(false); }
  };

  /* ── Actions ── */
  const handleUpdatePlan = async (targetUserId: string, planId: "free" | "premium" | "promax") => {
    setUpdatingPlanId(targetUserId);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ targetUserId, planId }),
      });
      if (res.ok) {
        toast.success(`Plan updated to ${planId}`);
        setUsers(prev => prev.map(u =>
          u.id === targetUserId
            ? { ...u, plan: planId, paidCredits: planId === "premium" ? 15 : planId === "promax" ? 999999 : 0 }
            : u
        ));
      } else toast.error("Failed to update plan.");
    } catch { toast.error("Connection error."); }
    finally { setUpdatingPlanId(null); }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ action: "reply", messageId: selectedTicket.id, replyText: replyText.trim() }),
      });
      if (res.ok) {
        toast.success("Reply sent!");
        setReplyText("");
        const updated = tickets.map(t =>
          t.id === selectedTicket.id
            ? { ...t, reply: replyText.trim(), status: "replied" as const, repliedAt: new Date().toISOString() }
            : t
        );
        setTickets(updated);
        setSelectedTicket(updated.find(t => t.id === selectedTicket.id) || null);
      } else toast.error("Failed to send reply.");
    } catch { toast.error("Connection error."); }
    finally { setSubmittingReply(false); }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket || !confirm("Delete this ticket permanently?")) return;
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ action: "delete", messageId: selectedTicket.id }),
      });
      if (res.ok) {
        toast.success("Ticket deleted.");
        const remaining = tickets.filter(t => t.id !== selectedTicket.id);
        setTickets(remaining);
        setSelectedTicket(remaining[0] || null);
      }
    } catch { toast.error("Connection error."); }
  };

  const handleDeleteFeedback = async (id: string) => {
    setDeletingFeedbackId(id);
    try {
      const res = await fetch("/api/feedback", {
        method: "DELETE",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setFeedbackMessages(prev => prev.filter(f => f.id !== id));
        toast.success("Feedback deleted.");
      }
    } catch { toast.error("Connection error."); }
    finally { setDeletingFeedbackId(null); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  /* ── Loading screen ── */
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-violet-500 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  /* ── Derived values ── */
  const totalUsers = users.length;
  const promaxUsers = users.filter(u => u.plan === "promax").length;
  const premiumUsers = users.filter(u => u.plan === "premium").length;
  const freeUsers = users.filter(u => u.plan === "free").length;

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q);
  });

  const filteredTickets = tickets.filter(t => {
    if (ticketFilter === "pending") return t.status === "pending";
    if (ticketFilter === "replied") return t.status === "replied";
    return true;
  });

  /* ── UI ── */
  return (
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 font-sans">
      <Toaster position="top-right" toastOptions={{ style: { background: "#0d0e22", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)", fontSize: "12px" } }} />

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#060713]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            <img 
              src="/logo.png" 
              alt="FastHire Logo" 
              className="h-8 w-8 rounded-xl object-cover shadow-md shadow-violet-500/20 ring-1 ring-white/10" 
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-[#c2c1ff] via-[#8b5cf6] to-[#0A84FF] bg-clip-text text-transparent">
                FastHire AI
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">
                Admin Console
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer shadow-sm"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-400" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">

        {/* Page title */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Layers className="h-6 w-6 text-violet-400" />
              Admin System Control
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Monitor users, update plans, and respond to support tickets.</p>
          </div>
          <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full animate-pulse">
            Owner Workspace
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex bg-[#0d0e22] border border-white/5 p-1 rounded-xl max-w-lg">
          {([
            { key: "users", label: "Users & Billing", icon: Users },
            { key: "tickets", label: "Support Tickets", icon: MessageSquare },
            { key: "feedback", label: "Feedback", icon: Inbox },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); if (key === "feedback") loadFeedback(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === key ? "bg-violet-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {key === "tickets" && tickets.filter(t => t.status === "pending").length > 0 && (
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              )}
              {key === "feedback" && feedbackMessages.length > 0 && (
                <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-black">{feedbackMessages.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: USERS ── */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Revenue cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Revenue", value: `₹${(premiumUsers * 99 + promaxUsers * 199).toLocaleString()}`, icon: TrendingUp, sub: `${users.filter(u => u.plan !== "free").length} paid users`, color: "text-white" },
                { label: "Received", value: `₹${(premiumUsers * 99 + promaxUsers * 199).toLocaleString()}`, icon: TrendingUp, sub: "Payments collected", color: "text-white" },
                { label: "Expenses", value: "₹0", icon: TrendingDown, sub: "Team & tools", color: "text-red-400" },
                { label: "Net Balance", value: `₹${(premiumUsers * 99 + promaxUsers * 199).toLocaleString()}`, icon: Wallet, sub: "Received minus expenses", color: "text-emerald-400" },
              ].map((card, i) => (
                <div key={i} className="bg-[#0e0f21]/60 border border-white/10 rounded-2xl p-5 space-y-3 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
                    <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <card.icon className="h-4 w-4 text-slate-400" />
                    </div>
                    {card.label}
                  </div>
                  <div>
                    <div className={`text-2xl font-black ${card.color}`}>{card.value}</div>
                    <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* KPI tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Registrations", value: totalUsers, icon: Users, color: "text-white" },
                { label: "Pro Max Tier", value: promaxUsers, icon: Sparkles, color: "text-indigo-400" },
                { label: "Premium Pro", value: premiumUsers, icon: CheckCircle, color: "text-cyan-400" },
                { label: "Free Tier", value: freeUsers, icon: UserIcon, color: "text-slate-400" },
              ].map((kpi, i) => (
                <div key={i} className="bg-[#0e0f21]/40 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{kpi.label}</span>
                    <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white/3 flex items-center justify-center">
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subscription distribution */}
              <div className="bg-[#0e0f21]/30 border border-white/5 rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-white">Subscription Distribution</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Active users per pricing tier.</p>
                </div>
                {[
                  { label: "Pro Max", count: promaxUsers, color: "from-violet-500 to-indigo-500", textColor: "text-indigo-400", icon: Sparkles },
                  { label: "Premium Pro", count: premiumUsers, color: "from-cyan-500 to-blue-500", textColor: "text-cyan-400", icon: CheckCircle },
                  { label: "Free Tier", count: freeUsers, color: "bg-slate-700", textColor: "text-slate-400", icon: UserIcon },
                ].map((tier, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className={`${tier.textColor} flex items-center gap-1.5`}>
                        <tier.icon className="h-3.5 w-3.5" />{tier.label}
                      </span>
                      <span>{tier.count} ({totalUsers > 0 ? Math.round((tier.count / totalUsers) * 100) : 0}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${tier.color}`}
                        style={{ width: `${totalUsers > 0 ? (tier.count / totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Platform stats */}
              <div className="bg-[#0e0f21]/30 border border-white/5 rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-white">Platform Activity</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Key resume & credits metrics.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Total Optimizations", value: `${analytics.totalOptimizations}` },
                    { label: "Support Tickets", value: `${analytics.totalTickets}` },
                    { label: "Active Paid Credits", value: `${users.reduce((a, u) => a + (u.paidCredits > 9999 ? 0 : u.paidCredits), 0)}` },
                    { label: "Avg Free Used", value: `${totalUsers > 0 ? (users.reduce((a, u) => a + u.freeUsed, 0) / totalUsers).toFixed(1) : "0.0"}` },
                  ].map((stat, i) => (
                    <div key={i} className="bg-[#08091a] border border-white/5 p-4 rounded-xl">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                      <span className="text-lg font-black text-white">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User search & plan modifier */}
            <div className="bg-[#0e0f21]/30 border border-white/5 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Search className="h-4 w-4 text-violet-400" />
                  Billing & Subscription Modifier
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Search user by email or name to modify plan tier.</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Type email or name..."
                  className="w-full h-10 pl-10 bg-[#08091a] border border-white/5 rounded-xl text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              {usersLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 text-violet-500 animate-spin" /></div>
              ) : userSearch.trim() === "" ? (
                <div className="text-center py-10 border border-dashed border-white/5 rounded-xl text-slate-600 text-xs">
                  Enter a name or email to search users
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/5 rounded-xl">
                  <AlertCircle className="h-7 w-7 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No users matched &quot;{userSearch}&quot;</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map(u => (
                    <div key={u.id} className="bg-[#08091a] border border-white/5 rounded-xl p-4 space-y-4 hover:border-white/10 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-extrabold text-white text-xs block truncate">{u.name || "Anonymous"}</span>
                          <span className="text-[10px] text-slate-500 font-semibold block truncate mt-0.5">{u.email}</span>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                          u.plan === "owner" ? "bg-violet-500/10 border-violet-500/20 text-violet-400" :
                          u.plan === "promax" ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                          u.plan === "premium" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                          "bg-slate-500/10 border-slate-500/20 text-slate-400"
                        }`}>
                          {u.plan === "promax" ? "Pro Max" : u.plan === "premium" ? "Premium" : u.plan === "owner" ? "Owner" : "Free"}
                        </span>
                      </div>
                      <div className="border-t border-white/5 pt-3 space-y-1.5 text-[10px] font-semibold text-slate-400">
                        <div className="flex justify-between"><span>Registered:</span><span className="text-white">{new Date(u.createdAt).toLocaleDateString()}</span></div>
                        <div className="flex justify-between"><span>Free scans used:</span><span className="text-white">{u.freeUsed}</span></div>
                        <div className="flex justify-between"><span>Paid balance:</span><span className="text-white">{u.paidCredits > 9999 ? "Unlimited" : `${u.paidCredits} credits`}</span></div>
                      </div>
                      <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Modify Plan</span>
                        {u.plan === "owner" ? (
                          <span className="text-[9px] text-slate-600 font-bold">Immutable Owner</span>
                        ) : updatingPlanId === u.id ? (
                          <Loader2 className="h-3 w-3 text-violet-500 animate-spin" />
                        ) : (
                          <select
                            value={u.plan}
                            onChange={e => handleUpdatePlan(u.id, e.target.value as any)}
                            className="bg-[#0d0e22] text-slate-300 border border-white/10 rounded-lg px-2 py-0.5 text-[9px] font-bold focus:outline-none focus:border-violet-500 cursor-pointer"
                          >
                            <option value="free">Free Tier</option>
                            <option value="premium">Premium Pro</option>
                            <option value="promax">Pro Max</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: TICKETS ── */}
        {activeTab === "tickets" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {ticketsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-violet-500 animate-spin" /></div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-2xl">
                <Inbox className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-bold text-slate-400">No support tickets yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Ticket list */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex bg-[#0d0e22] border border-white/5 p-1 rounded-xl gap-1">
                    {(["all", "pending", "replied"] as const).map(f => (
                      <button key={f} onClick={() => setTicketFilter(f)}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                          ticketFilter === f ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >{f}</button>
                    ))}
                  </div>
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                    {filteredTickets.map(ticket => (
                      <button key={ticket.id} onClick={() => { setSelectedTicket(ticket); setReplyText(""); }}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedTicket?.id === ticket.id
                            ? "bg-violet-950/10 border-violet-500/35"
                            : "bg-[#0d0e22]/50 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 font-bold truncate max-w-[160px]">{ticket.userEmail}</span>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                            ticket.status === "replied"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                          }`}>{ticket.status}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-semibold mt-2 line-clamp-2 leading-relaxed">{ticket.message}</p>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mt-2.5 font-semibold">
                          <Clock className="h-3 w-3" />
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ticket detail */}
                <div className="lg:col-span-7">
                  {selectedTicket ? (
                    <div className="bg-[#0d0e22]/30 border border-white/5 rounded-2xl p-6 space-y-6">
                      <div className="flex items-start justify-between border-b border-white/5 pb-4 gap-4">
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Client Email</span>
                          <h3 className="text-sm font-extrabold text-white mt-0.5">{selectedTicket.userEmail}</h3>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5 font-bold">
                            <span>Tier: {selectedTicket.userPlan?.toUpperCase()}</span>
                            <span>&bull;</span>
                            <span>Credits: {selectedTicket.userCredits}</span>
                          </div>
                        </div>
                        <button onClick={handleDeleteTicket}
                          className="text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/20 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors">
                          Delete Ticket
                        </button>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">User Message</span>
                        <div className="bg-[#050614] border border-white/5 p-4 rounded-xl text-xs text-slate-200 leading-relaxed">
                          {selectedTicket.message}
                        </div>
                      </div>
                      {selectedTicket.reply && (
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">Your Reply</span>
                          <div className="bg-[#050614] border border-emerald-500/10 p-4 rounded-xl text-xs text-slate-300 leading-relaxed">
                            {selectedTicket.reply}
                          </div>
                        </div>
                      )}
                      <form onSubmit={handleReply} className="space-y-3 pt-4 border-t border-white/5">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">
                          {selectedTicket.reply ? "Update Reply" : "Compose Reply"}
                        </span>
                        <textarea
                          rows={4}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Type your response..."
                          className="w-full bg-[#050614] border border-white/5 rounded-xl p-3 text-xs text-white placeholder-slate-700 outline-none focus:border-violet-500/50 resize-none transition-colors"
                        />
                        <button type="submit" disabled={submittingReply || !replyText.trim()}
                          className="w-full h-10 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                        >
                          {submittingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          Send Reply
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl p-10 text-center text-slate-500 text-xs italic">
                      Select a ticket from the left to reply.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: FEEDBACK ── */}
        {activeTab === "feedback" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white">Feedback Inbox</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">{feedbackMessages.length} message{feedbackMessages.length !== 1 ? "s" : ""} in inbox.</p>
              </div>
              <button onClick={() => loadFeedback()}
                className="text-[10px] font-bold text-violet-400 hover:text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-colors">
                Refresh
              </button>
            </div>
            {feedbackLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>
            ) : feedbackMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/8 rounded-2xl">
                <Inbox className="h-10 w-10 text-slate-600 mb-3" />
                <p className="text-sm font-bold text-slate-400">No feedback messages</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {feedbackMessages.map(fb => {
                  const typeColors: Record<string, string> = {
                    bug: "bg-red-500/10 border-red-500/20 text-red-400",
                    feature: "bg-amber-500/10 border-amber-500/20 text-amber-400",
                    improvement: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
                    general: "bg-blue-500/10 border-blue-500/20 text-blue-400",
                  };
                  const typeLabel: Record<string, string> = { bug: "🐛 Bug", feature: "✨ Feature", improvement: "💡 Improvement", general: "💬 General" };
                  return (
                    <div key={fb.id} className="bg-[#0d0e22] border border-white/8 rounded-2xl p-4 space-y-3 hover:border-white/15 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-white">{fb.name || "Anonymous"}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{fb.email || "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeColors[fb.type] || typeColors.general}`}>
                            {typeLabel[fb.type] || typeLabel.general}
                          </span>
                          <button onClick={() => handleDeleteFeedback(fb.id)} disabled={deletingFeedbackId === fb.id}
                            className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            {deletingFeedbackId === fb.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">{fb.message}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] text-slate-500 font-semibold">
                        <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                        <span>{new Date(fb.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
