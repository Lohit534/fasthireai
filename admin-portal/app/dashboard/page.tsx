"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";
import {
  Loader2, LogOut, Users, MessageSquare, Inbox,
  Search, TrendingUp, TrendingDown, Wallet, Sparkles,
  CheckCircle, User as UserIcon, Clock, AlertCircle,
  Trash2, CheckCircle2, RefreshCw, X, Layers,
  UserPlus, Copy, ExternalLink, Mail, Check, ShieldCheck
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
  expiresAt?: string | null;
  billingCycle?: string | null;
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

type TabKey = "users" | "tickets" | "feedback";

const PLAN_CONFIG = {
  owner:   { label: "👑 Owner",      bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700" },
  promax:  { label: "Pro Max",       bg: "bg-emerald-50", border: "border-emerald-200",text: "text-emerald-700" },
  premium: { label: "Premium Pro",   bg: "bg-teal-50",    border: "border-teal-200",   text: "text-teal-700" },
  free:    { label: "Free Tier",     bg: "bg-slate-100",  border: "border-slate-300",  text: "text-slate-600" },
};

/* ──────────────────── Dashboard ──────────────────── */
export default function AdminDashboard() {
  const [authLoading, setAuthLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  // Users
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [analytics, setAnalytics] = useState<any>({ totalOptimizations: 0, totalTickets: 0 });
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "owner" | "promax" | "premium" | "free">("all");
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

  const [refreshing, setRefreshing] = useState(false);

  // Invite User Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePlan, setInvitePlan] = useState<"free" | "premium" | "promax">("free");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    emailSent: boolean;
    inviteLink: string | null;
    message: string;
    email: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  /* ── Auth guard ── */
  useEffect(() => {
    let resolved = false;

    const checkAndInit = (session: any) => {
      const user = session?.user;
      const token = session?.access_token;
      if (!user || !isAdminEmail(user.email)) {
        window.location.href = "/";
        return;
      }
      resolved = true;
      setAccessToken(token || null);
      setAuthLoading(false);
      loadUsers(token);
      loadTickets(token);
      loadFeedback(token);
    };

    const { data: authListener } = (supabase as any).auth.onAuthStateChange(
      (_event: string, session: any) => {
        if (session?.user) checkAndInit(session);
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        checkAndInit(data.session);
      } else {
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) return;
        supabase.auth.getUser().then(({ data: userData }) => {
          if (userData?.user && isAdminEmail(userData.user.email)) {
            supabase.auth.getSession().then(({ data: freshSession }) => {
              if (freshSession?.session) checkAndInit(freshSession.session);
            });
            return;
          }
          if (!resolved) window.location.href = "/";
        }).catch(() => { if (!resolved) window.location.href = "/"; });
      }
    });

    return () => { authListener?.subscription?.unsubscribe(); };
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

  const handleReload = async () => {
    setRefreshing(true);
    setUsersLoading(true);
    setTicketsLoading(true);
    setFeedbackLoading(true);
    try {
      await Promise.allSettled([loadUsers(accessToken), loadTickets(accessToken), loadFeedback(accessToken)]);
      toast.success("Dashboard reloaded");
    } catch { toast.error("Failed to reload data"); }
    finally { setRefreshing(false); }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim(), planId: invitePlan }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInviteResult({ emailSent: data.emailSent, inviteLink: data.inviteLink, message: data.message, email: inviteEmail.trim() });
        toast.success(data.emailSent ? "Invitation email dispatched!" : "Invitation link generated!");
        loadUsers(accessToken);
      } else {
        toast.error(data.error || "Failed to invite user");
      }
    } catch { toast.error("Connection error while sending invitation"); }
    finally { setInviting(false); }
  };

  const resetInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteEmail("");
    setInviteName("");
    setInvitePlan("free");
    setInviteResult(null);
    setCopiedLink(false);
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
        setSelectedTicket(remaining.length > 0 ? remaining[0] : null);
      } else toast.error("Failed to delete ticket.");
    } catch { toast.error("Connection error."); }
  };

  const handleDeleteFeedback = async (id: string) => {
    setDeletingFeedbackId(id);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ action: "delete", id }),
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
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-[#0d6e5a] to-[#0f766e] flex items-center justify-center shadow-lg">
            <Loader2 className="h-7 w-7 text-white animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">Verifying admin access</p>
            <p className="text-xs text-slate-500">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Derived values ── */
  const totalUsers = users.length;
  const ownerUsers = users.filter(u => u.plan === "owner").length;
  const promaxUsers = users.filter(u => u.plan === "promax").length;
  const premiumUsers = users.filter(u => u.plan === "premium").length;
  const freeUsers = users.filter(u => u.plan === "free").length;
  const pendingTickets = tickets.filter(t => t.status === "pending").length;

  const chronologicalUsers = [...users].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const first50UsersList = chronologicalUsers.slice(0, 50);
  const post50UsersList = chronologicalUsers.slice(50);
  const earlyAdopterProCount = first50UsersList.filter(u => u.plan === "premium").length;
  const earlyAdopterExpenses = earlyAdopterProCount * 99;
  const payingUsers = post50UsersList.filter(u => u.plan === "premium" || u.plan === "promax");
  const paidPremium = payingUsers.filter(u => u.plan === "premium").length;
  const paidProMax = payingUsers.filter(u => u.plan === "promax").length;
  const totalRevenue = paidPremium * 99 + paidProMax * 199;
  const paidCount = payingUsers.length;
  const freeGrantMembers = Math.max(0, (promaxUsers + premiumUsers) - paidCount);

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    const matchesSearch = !q || u.email.toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q);
    const matchesPlan = planFilter === "all" || u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const filteredTickets = tickets.filter(t => {
    if (ticketFilter === "pending") return t.status === "pending";
    if (ticketFilter === "replied") return t.status === "replied";
    return true;
  });

  /* ── UI ── */
  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <Toaster position="top-right" toastOptions={{ style: { background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "600" } }} />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-28 sm:pb-8 flex flex-col gap-6">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-[#0d6e5a] shrink-0">
              <Layers className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Admin System Control
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Monitor live SaaS metrics, modify user subscription tiers, and respond to support tickets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Live</span>
            </div>
            <span className="bg-[#0d6e5a] text-white text-xs font-bold px-3.5 py-1 rounded-full shadow-sm">
              Owner Portal
            </span>
            <button
              onClick={handleReload}
              disabled={refreshing}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              title="Reload data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-white bg-[#0d6e5a] hover:bg-[#094d3f] px-3 py-2 rounded-xl shadow-sm cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden xs:inline sm:inline">Invite</span>
            </button>
            <button
              onClick={handleSignOut}
              className="h-9 px-3 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl w-full sm:max-w-xl shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 min-w-[7.5rem] flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-[#0d6e5a] text-white shadow-sm font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Users &amp; Billing</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${activeTab === "users" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
              {totalUsers}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 min-w-[7.5rem] flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "tickets"
                ? "bg-[#0d6e5a] text-white shadow-sm font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Tickets</span>
            {pendingTickets > 0 && (
              <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black">
                {pendingTickets}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("feedback"); loadFeedback(); }}
            className={`flex-1 min-w-[7.5rem] flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "feedback"
                ? "bg-[#0d6e5a] text-white shadow-sm font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Inbox className="h-4 w-4 shrink-0" />
            <span>Feedback</span>
            {feedbackMessages.length > 0 && (
              <span className={`h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full text-[9px] font-black ${
                activeTab === "feedback" ? "bg-white/20 text-white" : "bg-teal-50 text-[#0d6e5a] border border-teal-200"
              }`}>
                {feedbackMessages.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "users" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-[#0d6e5a]" />
                  Monthly Financial Health
                </h2>
                <span className="text-[11px] text-slate-500 font-semibold">Billing cycle: Realtime Sync</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {usersLoading ? (
                  [0,1,2,3].map(i => (
                    <div key={i} className="admin-card p-5 space-y-3">
                      <div className="skeleton h-4 w-20" />
                      <div className="skeleton h-7 w-24" />
                      <div className="skeleton h-3 w-32" />
                    </div>
                  ))
                ) : (
                  <>
                    <div className="admin-card p-5 space-y-3 hover:border-[#0d6e5a]/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Total Collected</span>
                        <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a]">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">₹{totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 font-medium mt-1">{paidCount} paying users after early-adopter window</p>
                      </div>
                    </div>
                    <div className="admin-card p-5 space-y-3 hover:border-[#0d6e5a]/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Paying Customers</span>
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black text-sm">₹</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">{paidCount}</div>
                        <p className="text-xs text-slate-500 font-medium mt-1">Premium ₹99 · Pro Max ₹199</p>
                      </div>
                    </div>
                    <div className="admin-card p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Free Grant Members</span>
                        <div className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                          <TrendingDown className="h-4 w-4" />
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">{freeGrantMembers}</div>
                        <p className="text-xs text-slate-500 font-medium mt-1">Early adopters ₹{earlyAdopterExpenses.toLocaleString()} granted</p>
                      </div>
                    </div>
                    <div className="admin-card p-5 space-y-3 bg-gradient-to-br from-teal-50/60 to-emerald-50/60 border-teal-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0d6e5a]">Net Account Balance</span>
                        <div className="h-8 w-8 rounded-xl bg-[#0d6e5a] text-white flex items-center justify-center shadow-sm">
                          <Wallet className="h-4 w-4" />
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-[#0d6e5a]">₹{totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-teal-700 font-medium mt-1">Collected from paid users</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {usersLoading ? (
                [0,1,2,3].map(i => (
                  <div key={i} className="admin-card p-5 flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="skeleton h-2.5 w-20" />
                      <div className="skeleton h-7 w-12" />
                    </div>
                    <div className="skeleton h-10 w-10 rounded-xl" />
                  </div>
                ))
              ) : (
                [
                  { label: "Total Registrations", value: totalUsers, icon: Users, color: "text-slate-900", badge: `${ownerUsers} owner` },
                  { label: "Pro Max Tier", value: promaxUsers, icon: Sparkles, color: "text-[#0d6e5a]", badge: "₹199 / mo" },
                  { label: "Premium Pro", value: premiumUsers, icon: CheckCircle, color: "text-teal-700", badge: "₹99 / mo" },
                  { label: "Free Tier", value: freeUsers, icon: UserIcon, color: "text-slate-600", badge: "2 Free / mo" },
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={idx} className="admin-card p-5 flex items-center justify-between h-full">
                      <div className="space-y-1 min-w-0">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{kpi.label}</span>
                        <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                        <span className="text-[10px] text-slate-400 font-medium block">{kpi.badge}</span>
                      </div>
                      <div className="h-11 w-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        <Icon className={`h-5 w-5 ${kpi.color}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="admin-card p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Subscription Distribution</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Ratio of active users by subscription tier.</p>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Pro Max Tier", count: promaxUsers, color: "text-[#0d6e5a]", bar: "bg-[#0d6e5a]", icon: Sparkles },
                    { label: "Premium Pro Plan", count: premiumUsers, color: "text-teal-700", bar: "bg-teal-600", icon: CheckCircle },
                    { label: "Free Career Tier", count: freeUsers, color: "text-slate-600", bar: "bg-slate-400", icon: UserIcon },
                  ].map((tier, i) => {
                    const pct = totalUsers > 0 ? Math.round((tier.count / totalUsers) * 100) : 0;
                    const Icon = tier.icon;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={`${tier.color} flex items-center gap-1.5`}>
                            <Icon className="h-3.5 w-3.5" />
                            {tier.label}
                          </span>
                          <span className="text-slate-700">{tier.count} users ({pct}%)</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div className={`h-full ${tier.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="admin-card p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Platform Activity &amp; Load</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Realtime optimizations and service activity.</p>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  {[
                    { label: "Total Resume Scans", value: `${analytics.totalOptimizations}`, sub: "AI ATS runs completed" },
                    { label: "Support Tickets", value: `${analytics.totalTickets}`, sub: "Total tickets opened" },
                    { label: "Active Paid Credits", value: `${users.reduce((a, u) => a + (u.paidCredits > 9999 ? 0 : u.paidCredits), 0)}`, sub: "Credits available" },
                    { label: "Avg. Free Scans", value: `${totalUsers > 0 ? (users.reduce((a, u) => a + u.freeUsed, 0) / totalUsers).toFixed(1) : "0.0"}`, sub: "Scans / free account" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                      <span className="text-xl font-black text-slate-900">{stat.value}</span>
                      <span className="text-[10px] text-slate-400 block">{stat.sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-card p-4 sm:p-6 space-y-5 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#0d6e5a]" />
                    User Directory &amp; Subscription Manager
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Inspect accounts, modify plan tiers, or manage quota balances.</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} matching
                  </span>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-xs font-bold cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Invite
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    placeholder="Search users by name or email address..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="h-10 w-full pl-10 pr-9 border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0d6e5a]"
                  />
                  {userSearch && (
                    <button onClick={() => setUserSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  {(["all", "promax", "premium", "free", "owner"] as const).map((filter) => {
                    const labels: Record<string, string> = { all: "All", promax: "Pro Max", premium: "Premium", free: "Free", owner: "Owner" };
                    const isSelected = planFilter === filter;
                    return (
                      <button
                        key={filter}
                        onClick={() => setPlanFilter(filter)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#0d6e5a] text-white border-[#0d6e5a] shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {labels[filter]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {usersLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className="border border-slate-200 rounded-2xl p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="skeleton h-9 w-9 rounded-xl shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="skeleton h-3 w-24" />
                          <div className="skeleton h-2.5 w-36" />
                        </div>
                      </div>
                      <div className="skeleton h-8 w-full rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-200 bg-slate-50/60 rounded-2xl">
                  <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-700 font-bold">No users found</p>
                  <p className="text-xs text-slate-500 mt-0.5">Try clearing the search query or changing the filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((u) => {
                    const cfg = PLAN_CONFIG[u.plan] || PLAN_CONFIG.free;
                    const isOwnerUser = u.plan === "owner";
                    const initials = (u.name || u.email)[0]?.toUpperCase() || "?";
                    return (
                      <div key={u.id} className="bg-slate-50 hover:bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 hover:border-slate-300 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-xl bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center text-[#0d6e5a] font-extrabold text-xs shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-900 text-xs block truncate">{u.name || "Anonymous User"}</span>
                              <span className="text-[10px] text-slate-500 font-medium block truncate mt-0.5">{u.email}</span>
                            </div>
                          </div>
                          <span className={`text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                            {cfg.label.replace("👑 ", "")}
                          </span>
                        </div>
                        <div className="border-t border-slate-200 pt-3 space-y-1.5 text-[11px] font-medium text-slate-500">
                          <div className="flex justify-between">
                            <span>Registered:</span>
                            <span className="text-slate-800 font-semibold">{new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Free Scans Used:</span>
                            <span className="text-slate-800 font-semibold">{u.freeUsed} scans</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Paid Balance:</span>
                            <span className="text-[#0d6e5a] font-bold">{u.plan === "owner" || u.paidCredits > 9999 ? "Unlimited" : `${u.paidCredits} Credits`}</span>
                          </div>
                          {u.expiresAt && (
                            <div className="flex justify-between">
                              <span>Expires:</span>
                              <span className="text-emerald-700 font-bold">{new Date(u.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Plan Tier</span>
                          {isOwnerUser ? (
                            <span className="text-[10px] text-[#0d6e5a] font-bold uppercase">Immutable Owner</span>
                          ) : updatingPlanId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 text-[#0d6e5a] animate-spin" />
                          ) : (
                            <select
                              value={u.plan}
                              onChange={(e) => handleUpdatePlan(u.id, e.target.value as any)}
                              className="bg-white text-slate-800 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-[#0d6e5a] cursor-pointer shadow-sm"
                            >
                              <option value="free">Free Tier</option>
                              <option value="premium">Premium Pro</option>
                              <option value="promax">Pro Max</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tickets" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {ticketsLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 space-y-3">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="admin-card p-4 space-y-3">
                      <div className="skeleton h-3 w-36" />
                      <div className="skeleton h-2.5 w-full" />
                    </div>
                  ))}
                </div>
                <div className="lg:col-span-7">
                  <div className="admin-card p-6 space-y-4">
                    <div className="skeleton h-5 w-48" />
                    <div className="skeleton h-24 w-full rounded-xl" />
                  </div>
                </div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl p-12 sm:p-20 text-center border border-dashed border-slate-200 bg-white shadow-sm max-w-xl mx-auto w-full">
                <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center mb-4">
                  <Inbox className="h-6 w-6 text-[#0d6e5a]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">No Tickets Logged</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Help queries posted by users from the support chatbot will load here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="flex bg-white border border-slate-200 p-1 rounded-xl gap-1 shadow-sm">
                    {(["all", "pending", "replied"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setTicketFilter(tab)}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          ticketFilter === tab ? "bg-[#0d6e5a] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3 max-h-[420px] lg:max-h-[550px] overflow-y-auto pr-1">
                    {filteredTickets.map((ticket) => {
                      const isActive = selectedTicket?.id === ticket.id;
                      const hasReplied = ticket.status === "replied";
                      return (
                        <button
                          key={ticket.id}
                          onClick={() => { setSelectedTicket(ticket); setReplyText(""); }}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                            isActive ? "bg-teal-50/70 border-[#0d6e5a] shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]">{ticket.userEmail}</span>
                            <span className={`text-[8px] font-bold uppercase tracking-wider py-0.5 px-2 rounded-full border ${
                              hasReplied ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}>
                              {ticket.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 font-semibold mt-2.5 line-clamp-2 leading-relaxed">{ticket.message}</p>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-3 font-semibold">
                            <Clock className="h-3 w-3" />
                            {new Date(ticket.createdAt).toLocaleDateString()} • {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-7">
                  {selectedTicket ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6 flex flex-col shadow-sm">
                      <div className="flex items-start justify-between border-b border-slate-200 pb-4 gap-4">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Client Email</span>
                          <h3 className="text-sm font-extrabold text-slate-900 mt-0.5 break-all">{selectedTicket.userEmail}</h3>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1.5 font-bold flex-wrap">
                            <span>Tier: {selectedTicket.userPlan.toUpperCase()}</span>
                            <span>•</span>
                            <span>Credits: {selectedTicket.userCredits}</span>
                          </div>
                        </div>
                        <button
                          onClick={handleDeleteTicket}
                          className="h-8 text-[10px] font-bold rounded-lg px-3 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 transition-colors cursor-pointer shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">User Query / Message</span>
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-800 leading-relaxed font-medium">{selectedTicket.message}</div>
                      </div>
                      {selectedTicket.reply && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-black uppercase tracking-widest gap-2">
                            <span>Submitted Reply</span>
                            {selectedTicket.repliedAt && (
                              <span className="font-semibold text-slate-400">
                                {new Date(selectedTicket.repliedAt).toLocaleDateString()} at {new Date(selectedTicket.repliedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                          <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 leading-relaxed font-medium">{selectedTicket.reply}</div>
                        </div>
                      )}
                      <form onSubmit={handleReply} className="space-y-3 pt-2 border-t border-slate-200">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">
                          {selectedTicket.reply ? "Update Answer / Reply" : "Compose Answer"}
                        </span>
                        <textarea
                          rows={4}
                          placeholder="Type your response to the user message..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full min-h-[100px] text-xs border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl p-3.5 outline-none focus:bg-white focus:border-[#0d6e5a] resize-none"
                        />
                        <button
                          type="submit"
                          disabled={submittingReply || !replyText.trim()}
                          className="w-full bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          {submittingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          {submittingReply ? "Sending Reply..." : "Send Reply Message"}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="h-48 lg:h-full min-h-[180px] flex items-center justify-center border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-xs italic bg-white shadow-sm">
                      Select a support ticket to compose a reply.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">Feedback Inbox</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Messages auto-delete after 24 hours. {feedbackMessages.length} message{feedbackMessages.length !== 1 ? "s" : ""} remaining.
                </p>
              </div>
              <button
                onClick={() => loadFeedback()}
                className="self-start text-[10px] font-bold text-[#0d6e5a] hover:text-[#094d3f] border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Refresh
              </button>
            </div>
            {feedbackLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[0,1,2].map(i => (
                  <div key={i} className="admin-card p-4 space-y-3">
                    <div className="skeleton h-3.5 w-20" />
                    <div className="skeleton h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : feedbackMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 bg-white rounded-2xl shadow-sm">
                <Inbox className="h-10 w-10 text-slate-400 mb-3" />
                <p className="text-sm font-bold text-slate-700">No feedback messages yet</p>
                <p className="text-xs text-slate-500 mt-1">When users submit feedback, it will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {feedbackMessages.map((fb) => {
                  const typeColors: Record<string, string> = {
                    bug: "bg-rose-50 border-rose-200 text-rose-700",
                    feature: "bg-amber-50 border-amber-200 text-amber-700",
                    improvement: "bg-yellow-50 border-yellow-200 text-yellow-700",
                    general: "bg-sky-50 border-sky-200 text-sky-700",
                  };
                  const typeLabel: Record<string, string> = {
                    bug: "🐛 Bug",
                    feature: "✨ Feature",
                    improvement: "💡 Improvement",
                    general: "💬 General",
                  };
                  const sentAt = new Date(fb.createdAt);
                  const expiresAt = new Date(sentAt.getTime() + 24 * 60 * 60 * 1000);
                  const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000));
                  return (
                    <div key={fb.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-slate-300 transition-all shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{fb.name || "Anonymous"}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{fb.email || "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeColors[fb.type] || typeColors.general}`}>
                            {typeLabel[fb.type] || typeLabel.general}
                          </span>
                          <button
                            onClick={() => handleDeleteFeedback(fb.id)}
                            disabled={deletingFeedbackId === fb.id}
                            className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            {deletingFeedbackId === fb.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-4 font-medium">{fb.message}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-[9px] text-slate-400 font-mono">
                          {sentAt.toLocaleDateString()} {sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[9px] text-amber-600 font-semibold">Expires in {hoursLeft}h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1">
          <button onClick={() => setActiveTab("users")} className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold ${activeTab === "users" ? "text-[#0d6e5a] bg-teal-50" : "text-slate-500"}`}>
            <Users className="h-4 w-4" />
            Users
          </button>
          <button onClick={() => setActiveTab("tickets")} className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold ${activeTab === "tickets" ? "text-[#0d6e5a] bg-teal-50" : "text-slate-500"}`}>
            <MessageSquare className="h-4 w-4" />
            Tickets
            {pendingTickets > 0 && <span className="absolute top-1 right-4 h-1.5 w-1.5 rounded-full bg-rose-500" />}
          </button>
          <button onClick={() => { setActiveTab("feedback"); loadFeedback(); }} className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold ${activeTab === "feedback" ? "text-[#0d6e5a] bg-teal-50" : "text-slate-500"}`}>
            <Inbox className="h-4 w-4" />
            Inbox
          </button>
          <button onClick={() => setIsInviteModalOpen(true)} className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-500">
            <UserPlus className="h-4 w-4" />
            Invite
          </button>
        </div>
      </nav>

      {/* ══ INVITE USER MODAL ══ */}

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#0d6e5a]/10 flex items-center justify-center text-[#0d6e5a]">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Invite New User</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Create an account & assign a plan tier</p>
                </div>
              </div>
              <button
                onClick={resetInviteModal}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {inviteResult ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border text-xs ${
                    inviteResult.emailSent
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-teal-50 border-teal-200 text-slate-900"
                  }`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <CheckCircle2 className="h-4 w-4 text-[#0d6e5a]" />
                      <span>{inviteResult.emailSent ? "Invitation Email Sent!" : "Account Created & Link Ready!"}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600 mt-1">{inviteResult.message}</p>
                  </div>

                  {inviteResult.inviteLink && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        {inviteResult.emailSent ? "Direct Activation Link (backup):" : "Direct Activation Link:"}
                      </label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={inviteResult.inviteLink}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all outline-none cursor-text"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (inviteResult.inviteLink) {
                              navigator.clipboard.writeText(inviteResult.inviteLink!);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2500);
                              toast.success("Invite link copied!");
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
                        >
                          {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span className="hidden sm:inline">{copiedLink ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>

                      <a
                        href={`mailto:${inviteResult.email}?subject=${encodeURIComponent("You're invited to FastHire AI")}&body=${encodeURIComponent(
                          `Hi ${inviteName || "there"},\n\nYou have been invited to FastHire AI — the AI resume optimizer.\n\nClick the link below to activate your account:\n${inviteResult.inviteLink}\n\nBest regards,\nFastHire AI Team`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors mt-2"
                      >
                        <Mail className="h-3.5 w-3.5 text-[#0d6e5a]" />
                        Open in Email App
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                    </div>
                  )}

                  <button
                    onClick={resetInviteModal}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-[#0d6e5a] focus:ring-2 focus:ring-[#0d6e5a]/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Full Name <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-[#0d6e5a] focus:ring-2 focus:ring-[#0d6e5a]/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Initial Plan Tier</label>
                    <select
                      value={invitePlan}
                      onChange={e => setInvitePlan(e.target.value as any)}
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-[#0d6e5a] transition-all cursor-pointer"
                    >
                      <option value="free">🆓 Free Tier (2 free monthly optimizations)</option>
                      <option value="premium">⭐ Premium Pro (15 paid credits / month)</option>
                      <option value="promax">⚡ Pro Max (Unlimited — 999,999 credits)</option>
                    </select>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0d6e5a]/5 border border-[#0d6e5a]/15">
                    <ShieldCheck className="h-4 w-4 text-[#0d6e5a] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-700">Resilient delivery: </span>
                      If Supabase email limits are hit, a direct activation link is generated automatically — just copy and share it manually.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={resetInviteModal}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {inviting ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Sending...</span></>
                      ) : (
                        <><Mail className="h-3.5 w-3.5" /><span>Send Invitation</span></>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
