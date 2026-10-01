"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";
import {
  Loader2, LogOut, Layers, Users, MessageSquare, Inbox,
  Search, TrendingUp, TrendingDown, Wallet, Sparkles,
  CheckCircle, User as UserIcon, Clock, AlertCircle,
  Trash2, ShieldAlert, CheckCircle2, RefreshCw,
  UserPlus, Copy, ExternalLink, Mail, Check, X, ShieldCheck
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
        if (session?.user) {
          checkAndInit(session);
        }
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        checkAndInit(data.session);
      } else {
        // Allow brief time if OAuth hash is present in URL
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          return;
        }
        // Fallback: check getUser before redirecting (prevents false logout on page refresh/reload)
        supabase.auth.getUser().then(({ data: userData }) => {
          if (userData?.user && isAdminEmail(userData.user.email)) {
            supabase.auth.getSession().then(({ data: freshSession }) => {
              if (freshSession?.session) {
                checkAndInit(freshSession.session);
              }
            });
            return;
          }
          if (!resolved) {
            window.location.href = "/";
          }
        }).catch(() => {
          if (!resolved) {
            window.location.href = "/";
          }
        });
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleReload = async () => {
    setRefreshing(true);
    setUsersLoading(true);
    setTicketsLoading(true);
    setFeedbackLoading(true);
    try {
      await Promise.allSettled([
        loadUsers(accessToken),
        loadTickets(accessToken),
        loadFeedback(accessToken),
      ]);
      toast.success("Dashboard reloaded");
    } catch {
      toast.error("Failed to reload data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setInviting(true);
    try {
      const clientOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          planId: invitePlan,
          origin: clientOrigin,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        let displayLink = data.inviteLink;
        if (displayLink && typeof window !== "undefined") {
          displayLink = displayLink
            .replace(/^https?:\/\/localhost(?::\d+)?/i, window.location.origin)
            .replace(/^https?:\/\/127\.0\.0\.1(?::\d+)?/i, window.location.origin)
            .replace(/redirect_to=http(?:s)?%3A%2F%2Flocalhost(?::\d+)?/gi, `redirect_to=${encodeURIComponent(window.location.origin)}`)
            .replace(/redirect_to=http(?:s)?%3A%2F%2F127\.0\.0\.1(?::\d+)?/gi, `redirect_to=${encodeURIComponent(window.location.origin)}`);
        }
        setInviteResult({
          emailSent: data.emailSent,
          inviteLink: displayLink,
          message: data.message,
          email: inviteEmail.trim(),
        });
        toast.success(data.emailSent ? "Invitation email dispatched!" : "Invitation link generated!");
        loadUsers(accessToken);
      } else {
        toast.error(data.error || "Failed to invite user");
      }
    } catch {
      toast.error("Connection error while sending invitation");
    } finally {
      setInviting(false);
    }
  };

  const resetInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteEmail("");
    setInviteName("");
    setInvitePlan("free");
    setInviteResult(null);
    setCopiedLink(false);
  };

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
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-[#0d6e5a] animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  /* ── Derived values ── */
  const totalUsers = users.length;
  const promaxUsers = users.filter(u => u.plan === "promax" || u.plan === "owner").length;
  const premiumUsers = users.filter(u => u.plan === "premium").length;
  const freeUsers = users.filter(u => u.plan === "free").length;

  // Chronologically separate first 50 early adopters from 51st+ paying users
  const chronologicalUsers = [...users].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const first50UsersList = chronologicalUsers.slice(0, 50);
  const post50UsersList = chronologicalUsers.slice(50);

  // Early adopter promo concessions tracked under Expenses
  const earlyAdopterProCount = first50UsersList.filter(u => u.plan === "premium").length;
  const earlyAdopterExpenses = earlyAdopterProCount * 99;

  // Paid users from 51st user onwards
  const payingUsers = post50UsersList.filter(u => u.plan === "premium" || u.plan === "promax");
  const paidPremium = payingUsers.filter(u => u.plan === "premium").length;
  const paidProMax = payingUsers.filter(u => u.plan === "promax").length;
  const totalRevenue = paidPremium * 99 + paidProMax * 199;
  const totalReceived = totalRevenue;
  const netBalance = totalReceived;

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
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-[#0d6e5a]/15">
      <Toaster position="top-right" toastOptions={{ style: { background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0", fontSize: "12px" } }} />

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            <img 
              src="/logo.png" 
              alt="FastHire Logo" 
              className="h-8 w-8 rounded-xl object-contain drop-shadow-xs" 
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                FastHire AI
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#0d6e5a]">
                Admin Console
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-500" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">

        {/* Page title */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="h-6 w-6 text-[#0d6e5a]" />
              Admin System Control
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Monitor users, update plans, and respond to support tickets.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-white bg-[#0d6e5a] hover:bg-[#094d3f] px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
              title="Invite a new user to FastHire AI"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Invite User</span>
            </button>
            <button
              onClick={handleReload}
              disabled={refreshing || usersLoading || ticketsLoading}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#0d6e5a] bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Reload dashboard data"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#0d6e5a] ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Reloading..." : "Reload Data"}</span>
            </button>
            <span className="text-[10px] font-black text-[#0d6e5a] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full shadow-xs">
              Owner Workspace
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-white border border-slate-200 p-1 rounded-xl max-w-lg shadow-xs">
          {([
            { key: "users", label: "Users & Billing", icon: Users },
            { key: "tickets", label: "Support Tickets", icon: MessageSquare },
            { key: "feedback", label: "Feedback", icon: Inbox },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); if (key === "feedback") loadFeedback(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === key ? "bg-[#0d6e5a] text-white shadow-xs font-black" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {key === "tickets" && tickets.filter(t => t.status === "pending").length > 0 && (
                <span className="h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                  {tickets.filter(t => t.status === "pending").length}
                </span>
              )}
              {key === "feedback" && feedbackMessages.length > 0 && (
                <span className={`h-4 min-w-4 px-1 flex items-center justify-center rounded-full text-[9px] font-black ${
                  activeTab === key ? "bg-white/25 text-white" : "bg-teal-50 text-[#0d6e5a] border border-teal-200"
                }`}>
                  {feedbackMessages.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: USERS ── */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Revenue cards — shimmer while loading */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {usersLoading ? (
                <>
                  {[0,1,2,3].map(i => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg animate-shimmer" />
                        <div className="h-4 w-20 rounded-lg animate-shimmer" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-7 w-28 rounded-lg animate-shimmer" />
                        <div className="h-3 w-36 rounded-lg animate-shimmer" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { label: "Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, sub: `${payingUsers.length} paying user${payingUsers.length !== 1 ? 's' : ''} (51st onwards)`, color: "text-slate-900" },
                    { label: "Received", value: `₹${totalReceived.toLocaleString()}`, icon: TrendingUp, sub: "Collected from paid users", color: "text-slate-900" },
                    { label: "Expenses", value: `₹${earlyAdopterExpenses.toLocaleString()}`, icon: TrendingDown, sub: `${earlyAdopterProCount} early adopters (1-yr free)`, color: "text-rose-600" },
                    { label: "Net Balance", value: `₹${netBalance.toLocaleString()}`, icon: Wallet, sub: "Collected net revenue", color: "text-[#0d6e5a]" },
                  ].map((card, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-slate-300 shadow-sm transition-all">
                      <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                        <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a]">
                          <card.icon className="h-4 w-4" />
                        </div>
                        {card.label}
                      </div>
                      <div>
                        <div className={`text-2xl font-black ${card.color}`}>{card.value}</div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{card.sub}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* KPI tiles — shimmer while loading */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {usersLoading ? (
                <>
                  {[0,1,2,3].map(i => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-24 rounded-lg animate-shimmer" />
                        <div className="h-7 w-16 rounded-lg animate-shimmer" />
                      </div>
                      <div className="h-10 w-10 rounded-xl animate-shimmer" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { label: "Total Registrations", value: totalUsers, icon: Users, color: "text-slate-900", iconBg: "bg-slate-100 text-slate-700" },
                    { label: "Pro Max Tier", value: promaxUsers, icon: Sparkles, color: "text-emerald-700", iconBg: "bg-emerald-50 text-emerald-700" },
                    { label: "Premium Pro", value: premiumUsers, icon: CheckCircle, color: "text-teal-700", iconBg: "bg-teal-50 text-teal-700" },
                    { label: "Free Tier", value: freeUsers, icon: UserIcon, color: "text-slate-600", iconBg: "bg-slate-100 text-slate-600" },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{kpi.label}</span>
                        <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                      </div>
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center border border-slate-200/60 ${kpi.iconBg}`}>
                        <kpi.icon className="h-5 w-5" />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Analytics grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subscription distribution */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Subscription Distribution</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Active users per pricing tier.</p>
                </div>
                {[
                  { label: "Pro Max", count: promaxUsers, color: "bg-[#0d6e5a]", textColor: "text-[#0d6e5a]", icon: Sparkles },
                  { label: "Premium Pro", count: premiumUsers, color: "bg-teal-600", textColor: "text-teal-700", icon: CheckCircle },
                  { label: "Free Tier", count: freeUsers, color: "bg-slate-400", textColor: "text-slate-600", icon: UserIcon },
                ].map((tier, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className={`${tier.textColor} flex items-center gap-1.5`}>
                        <tier.icon className="h-3.5 w-3.5" />{tier.label}
                      </span>
                      <span className="text-slate-700">{tier.count} ({totalUsers > 0 ? Math.round((tier.count / totalUsers) * 100) : 0}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full ${tier.color} transition-all duration-500`}
                        style={{ width: `${totalUsers > 0 ? (tier.count / totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Platform stats */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Platform Activity</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Key resume & credits metrics.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Total Optimizations", value: `${analytics.totalOptimizations}` },
                    { label: "Support Tickets", value: `${analytics.totalTickets}` },
                    { label: "Active Paid Credits", value: `${users.reduce((a, u) => a + (u.paidCredits > 9999 ? 0 : u.paidCredits), 0)}` },
                    { label: "Avg Free Used", value: `${totalUsers > 0 ? (users.reduce((a, u) => a + u.freeUsed, 0) / totalUsers).toFixed(1) : "0.0"}` },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                      <span className="text-lg font-black text-slate-900">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User search & plan modifier */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Search className="h-4 w-4 text-[#0d6e5a]" />
                    Billing &amp; Subscription Modifier
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Search user by email or name to modify plan tier, or send an invitation.</p>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Invite New User</span>
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Type email or name..."
                  className="w-full h-10 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#0d6e5a] transition-colors"
                />
              </div>
              {usersLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
                  {[0,1,2].map(i => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-24 rounded-lg animate-shimmer" />
                          <div className="h-2.5 w-36 rounded-lg animate-shimmer" />
                        </div>
                        <div className="h-5 w-16 rounded-full animate-shimmer" />
                      </div>
                      <div className="border-t border-slate-200 pt-3 space-y-2">
                        <div className="h-2.5 w-full rounded-lg animate-shimmer" />
                        <div className="h-2.5 w-3/4 rounded-lg animate-shimmer" />
                        <div className="h-2.5 w-1/2 rounded-lg animate-shimmer" />
                      </div>
                      <div className="border-t border-slate-200 pt-3">
                        <div className="h-7 w-full rounded-lg animate-shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : userSearch.trim() === "" ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs bg-slate-50/50">
                  Enter a name or email to search users
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <AlertCircle className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No users matched &quot;{userSearch}&quot;</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map(u => (
                    <div key={u.id} className="bg-slate-50 hover:bg-white border border-slate-200 rounded-xl p-4 space-y-4 hover:border-slate-300 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-900 text-xs block truncate">{u.name || "Anonymous"}</span>
                          <span className="text-[10px] text-slate-500 font-semibold block truncate mt-0.5">{u.email}</span>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                          u.plan === "owner" ? "bg-teal-50 border-teal-200 text-[#0d6e5a]" :
                          u.plan === "promax" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                          u.plan === "premium" ? "bg-teal-50 border-teal-200 text-teal-700" :
                          "bg-slate-200 border-slate-300 text-slate-700"
                        }`}>
                          {u.plan === "owner" ? "👑 Owner" : u.plan === "promax" ? "Pro Max" : u.plan === "premium" ? "Premium Pro" : "Free Tier"}
                        </span>
                      </div>
                      <div className="border-t border-slate-200 pt-3 space-y-1.5 text-[10px] font-semibold text-slate-500">
                        <div className="flex justify-between"><span>Registered:</span><span className="text-slate-800">{new Date(u.createdAt).toLocaleDateString()}</span></div>
                        <div className="flex justify-between"><span>Free scans used:</span><span className="text-slate-800">{u.freeUsed}</span></div>
                        <div className="flex justify-between"><span>Paid balance:</span><span className="text-[#0d6e5a] font-bold">{u.plan === "owner" || u.paidCredits > 9999 ? "Unlimited (Pro Max)" : `${u.paidCredits} credits`}</span></div>
                      </div>
                      <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Modify Plan</span>
                        {u.plan === "owner" ? (
                          <span className="text-[9px] text-[#0d6e5a] font-bold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">👑 Pro Max Unlimited (Owner)</span>
                        ) : updatingPlanId === u.id ? (
                          <Loader2 className="h-3 w-3 text-[#0d6e5a] animate-spin" />
                        ) : (
                          <select
                            value={u.plan}
                            onChange={e => handleUpdatePlan(u.id, e.target.value as any)}
                            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-2 py-0.5 text-[9px] font-bold focus:outline-none focus:border-[#0d6e5a] cursor-pointer shadow-xs"
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Ticket list shimmer */}
                <div className="lg:col-span-5 space-y-3">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-3 w-36 rounded-lg animate-shimmer" />
                        <div className="h-4 w-14 rounded-full animate-shimmer" />
                      </div>
                      <div className="h-2.5 w-full rounded-lg animate-shimmer" />
                      <div className="h-2.5 w-3/4 rounded-lg animate-shimmer" />
                      <div className="h-2.5 w-20 rounded-lg animate-shimmer" />
                    </div>
                  ))}
                </div>
                {/* Ticket detail shimmer */}
                <div className="lg:col-span-7">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                    <div className="space-y-2 pb-4 border-b border-slate-200">
                      <div className="h-2.5 w-20 rounded-lg animate-shimmer" />
                      <div className="h-5 w-48 rounded-lg animate-shimmer" />
                      <div className="h-3 w-32 rounded-lg animate-shimmer" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-24 rounded-lg animate-shimmer" />
                      <div className="h-24 w-full rounded-xl animate-shimmer" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-24 rounded-lg animate-shimmer" />
                      <div className="h-20 w-full rounded-xl animate-shimmer" />
                      <div className="h-10 w-full rounded-xl animate-shimmer" />
                    </div>
                  </div>
                </div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 bg-white rounded-2xl shadow-sm">
                <Inbox className="h-10 w-10 text-slate-400 mb-3" />
                <p className="text-sm font-bold text-slate-700">No support tickets yet</p>
                <p className="text-xs text-slate-500 mt-1">Tickets sent by candidates from the chatbot will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Ticket list */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex bg-white border border-slate-200 p-1 rounded-xl gap-1 shadow-xs">
                    {(["all", "pending", "replied"] as const).map(f => (
                      <button key={f} onClick={() => setTicketFilter(f)}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                          ticketFilter === f ? "bg-[#0d6e5a] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >{f}</button>
                    ))}
                  </div>
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                    {filteredTickets.map(ticket => (
                      <button key={ticket.id} onClick={() => { setSelectedTicket(ticket); setReplyText(""); }}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedTicket?.id === ticket.id
                            ? "bg-teal-50/70 border-[#0d6e5a] shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 font-bold truncate max-w-[160px]">{ticket.userEmail}</span>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                            ticket.status === "replied"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-amber-50 border-amber-200 text-amber-700"
                          }`}>{ticket.status}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-semibold mt-2 line-clamp-2 leading-relaxed">{ticket.message}</p>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-2.5 font-semibold">
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
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200 pb-4 gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Client Email</span>
                          <h3 className="text-sm font-extrabold text-slate-900 mt-0.5 break-all">{selectedTicket.userEmail}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-1.5 font-bold">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Tier: {selectedTicket.userPlan?.toUpperCase()}</span>
                            <span>&bull;</span>
                            <span className="bg-teal-50 px-2 py-0.5 rounded text-[#0d6e5a]">Credits: {selectedTicket.userCredits}</span>
                          </div>
                        </div>
                        <button onClick={handleDeleteTicket}
                          className="w-full sm:w-auto text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-3 py-2 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-xs">
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Ticket</span>
                        </button>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">User Message</span>
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-800 leading-relaxed font-medium break-words whitespace-pre-wrap">
                          {selectedTicket.message}
                        </div>
                      </div>
                      {selectedTicket.reply && (
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">Your Reply</span>
                          <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 leading-relaxed font-medium break-words whitespace-pre-wrap">
                            {selectedTicket.reply}
                          </div>
                        </div>
                      )}
                      <form onSubmit={handleReply} className="space-y-3 pt-4 border-t border-slate-200">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">
                          {selectedTicket.reply ? "Update Reply" : "Compose Reply"}
                        </span>
                        <textarea
                          rows={4}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Type your response..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#0d6e5a] resize-none transition-colors"
                        />
                        <button type="submit" disabled={submittingReply || !replyText.trim()}
                          className="w-full h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-[#0d6e5a] hover:bg-[#094d3f] shadow-xs cursor-pointer"
                        >
                          {submittingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Send Reply
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-xs italic bg-white shadow-xs">
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
                <h2 className="text-sm font-black text-slate-900">Feedback Inbox</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">{feedbackMessages.length} message{feedbackMessages.length !== 1 ? "s" : ""} in inbox.</p>
              </div>
              <button onClick={() => loadFeedback()}
                className="text-[10px] font-bold text-[#0d6e5a] hover:text-[#094d3f] border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                Refresh
              </button>
            </div>
            {feedbackLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-20 rounded-lg animate-shimmer" />
                        <div className="h-2.5 w-28 rounded-lg animate-shimmer" />
                      </div>
                      <div className="h-5 w-16 rounded-full animate-shimmer" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-full rounded-lg animate-shimmer" />
                      <div className="h-2.5 w-5/6 rounded-lg animate-shimmer" />
                      <div className="h-2.5 w-4/6 rounded-lg animate-shimmer" />
                    </div>
                    <div className="pt-1 border-t border-slate-100 flex justify-between">
                      <div className="h-2.5 w-16 rounded-lg animate-shimmer" />
                      <div className="h-2.5 w-12 rounded-lg animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : feedbackMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 bg-white rounded-2xl shadow-sm">
                <Inbox className="h-10 w-10 text-slate-400 mb-3" />
                <p className="text-sm font-bold text-slate-700">No feedback messages</p>
                <p className="text-xs text-slate-500 mt-1">User comments and suggestions will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {feedbackMessages.map(fb => {
                  const typeColors: Record<string, string> = {
                    bug: "bg-rose-50 border-rose-200 text-rose-700",
                    feature: "bg-amber-50 border-amber-200 text-amber-700",
                    improvement: "bg-yellow-50 border-yellow-200 text-yellow-700",
                    general: "bg-sky-50 border-sky-200 text-sky-700",
                  };
                  const typeLabel: Record<string, string> = { bug: "🐛 Bug", feature: "✨ Feature", improvement: "💡 Improvement", general: "💬 General" };
                  return (
                    <div key={fb.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-slate-300 shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{fb.name || "Anonymous"}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{fb.email || "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeColors[fb.type] || typeColors.general}`}>
                            {typeLabel[fb.type] || typeLabel.general}
                          </span>
                          <button onClick={() => handleDeleteFeedback(fb.id)} disabled={deletingFeedbackId === fb.id}
                            className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                            {deletingFeedbackId === fb.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-4 font-medium">{fb.message}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[9px] text-slate-400 font-semibold">
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

        {/* ── Invite User Modal ── */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a]">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Invite New User</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Create user account &amp; assign pricing tier</p>
                  </div>
                </div>
                <button
                  onClick={resetInviteModal}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {inviteResult ? (
                <div className="space-y-4 py-2">
                  <div className={`p-4 rounded-xl border text-xs ${
                    inviteResult.emailSent
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-teal-50 border-teal-200 text-slate-900"
                  }`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <CheckCircle2 className="h-4 w-4 text-[#0d6e5a]" />
                      <span>{inviteResult.emailSent ? "Email Dispatched Successfully!" : "Account Created & Link Generated!"}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                      {inviteResult.message}
                    </p>
                  </div>

                  {inviteResult.inviteLink && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Direct Invitation / Activation Link:
                      </label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={inviteResult.inviteLink}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (inviteResult.inviteLink) {
                              navigator.clipboard.writeText(inviteResult.inviteLink);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2500);
                              toast.success("Invite link copied to clipboard!");
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                        >
                          {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedLink ? "Copied" : "Copy"}</span>
                        </button>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <a
                          href={`mailto:${inviteResult.email}?subject=${encodeURIComponent("You're invited to join FastHire AI")}&body=${encodeURIComponent(
                            `Hi ${inviteName || "there"},\n\nYou have been invited to FastHire AI — the AI resume optimizer.\n\nClick the link below to activate your account and access your dashboard:\n${inviteResult.inviteLink}\n\nBest regards,\nFastHire AI Team`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5 text-[#0d6e5a]" />
                          <span>Open in Email App</span>
                        </a>
                        <button
                          type="button"
                          onClick={resetInviteModal}
                          className="py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      User Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0d6e5a] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0d6e5a] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Initial Plan Tier
                    </label>
                    <select
                      value={invitePlan}
                      onChange={e => setInvitePlan(e.target.value as any)}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#0d6e5a] transition-all"
                    >
                      <option value="free">Free Tier (2 free monthly optimizations)</option>
                      <option value="premium">Premium Pro (15 paid credits / mo)</option>
                      <option value="promax">Pro Max (Unlimited 999,999 credits)</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#0d6e5a]" />
                      <span>Resilient Invitation Delivery</span>
                    </div>
                    <p className="leading-relaxed">
                      Sends via Supabase mailer or automatically generates a direct activation link if Supabase email rate limits or SMTP issues occur.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={resetInviteModal}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {inviting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Sending Invite...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="h-3.5 w-3.5" />
                          <span>Send Invitation</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
