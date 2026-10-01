"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";
import {
  Loader2, LogOut, LayoutDashboard, Users, MessageSquare, Inbox,
  Search, TrendingUp, TrendingDown, Wallet, Sparkles,
  CheckCircle, User as UserIcon, Clock, AlertCircle,
  Trash2, CheckCircle2, RefreshCw, Menu, X,
  UserPlus, Copy, ExternalLink, Mail, Check, ShieldCheck,
  Bell, ChevronRight, Activity, BarChart3,
  ArrowUpRight, ArrowDownRight, Filter, Eye, Send,
  Star, Zap, Crown, Shield
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

type TabKey = "overview" | "users" | "tickets" | "feedback";

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
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const sidebarRef = useRef<HTMLDivElement>(null);

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

  /* ── Close sidebar on outside click (mobile) ── */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sidebarOpen]);

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
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn("[admin] Users load notice:", err.error);
      }
    } catch (e: any) {
      console.warn("[admin] Error loading users:", e.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadTickets = async (token = accessToken) => {
    setTicketsLoading(true);
    try {
      const res = await fetch("/api/tickets", { headers: authHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        const ticketsList = Array.isArray(data) ? data : [];
        setTickets(ticketsList);
        if (ticketsList.length > 0) setSelectedTicket(ticketsList[0]);
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn("[admin] Tickets load notice:", err.error);
      }
    } catch (e: any) {
      console.warn("[admin] Error loading tickets:", e.message);
    } finally {
      setTicketsLoading(false);
    }
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
            ? { ...u, plan: planId, paidCredits: planId === "premium" ? 20 : planId === "promax" ? 90 : 0 }
            : u
        ));
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to update plan.");
      }
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
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8]">
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
  const promaxUsers = users.filter(u => u.plan === "promax" || u.plan === "owner").length;
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

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q);
  });

  const filteredTickets = tickets.filter(t => {
    if (ticketFilter === "pending") return t.status === "pending";
    if (ticketFilter === "replied") return t.status === "replied";
    return true;
  });

  /* ── Sidebar nav items ── */
  const navItems = [
    { key: "overview" as TabKey, label: "Overview",        icon: LayoutDashboard, badge: null },
    { key: "users"    as TabKey, label: "Users & Billing", icon: Users,           badge: totalUsers > 0 ? String(totalUsers) : null },
    { key: "tickets"  as TabKey, label: "Support Tickets", icon: MessageSquare,   badge: pendingTickets > 0 ? String(pendingTickets) : null },
    { key: "feedback" as TabKey, label: "Feedback Inbox",  icon: Inbox,           badge: feedbackMessages.length > 0 ? String(feedbackMessages.length) : null },
  ];

  /* ── UI ── */
  return (
    <div className="flex h-screen bg-[#f0f4f8] text-slate-900 font-sans overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "600" } }} />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        ref={sidebarRef}
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col bg-white border-r border-slate-200 shadow-2xl lg:shadow-none transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#0f766e] flex items-center justify-center shadow-md overflow-hidden">
              <img
                src="/logo.png"
                alt="FastHire"
                className="h-6 w-6 object-contain"
                onError={(e: any) => {
                  e.target.style.display = "none";
                  e.target.parentElement.innerHTML = '<span style="color:white;font-size:12px;font-weight:800">F</span>';
                }}
              />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-tight">FastHire AI</p>
              <p className="text-[9px] font-black text-[#0d6e5a] uppercase tracking-widest leading-tight">Admin Console</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 pt-2 pb-1.5">Navigation</p>
          {navItems.map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setSidebarOpen(false);
                if (key === "feedback") loadFeedback();
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                activeTab === key
                  ? "bg-[#0d6e5a]/10 text-[#0d6e5a] font-extrabold border-l-[3px] border-[#0d6e5a] pl-[9px]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold border-l-[3px] border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 shrink-0 ${activeTab === key ? "text-[#0d6e5a]" : "text-slate-400 group-hover:text-slate-500"}`} />
                <span className="text-[13px]">{label}</span>
              </div>
              {badge && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  key === "tickets" && pendingTickets > 0
                    ? "bg-rose-500 text-white"
                    : activeTab === key
                    ? "bg-[#0d6e5a] text-white"
                    : "bg-slate-200 text-slate-600"
                }`}>
                  {badge}
                </span>
              )}
            </button>
          ))}

          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 pt-4 pb-1.5">Actions</p>
          <button
            onClick={() => { setIsInviteModalOpen(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-slate-600 hover:text-[#0d6e5a] hover:bg-teal-50 font-semibold transition-all group border-l-[3px] border-transparent"
          >
            <UserPlus className="h-4 w-4 text-slate-400 group-hover:text-[#0d6e5a] shrink-0" />
            <span className="text-[13px]">Invite User</span>
          </button>
          <button
            onClick={() => { handleReload(); setSidebarOpen(false); }}
            disabled={refreshing}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-slate-600 hover:text-[#0d6e5a] hover:bg-teal-50 font-semibold transition-all group disabled:opacity-50 border-l-[3px] border-transparent"
          >
            <RefreshCw className={`h-4 w-4 text-slate-400 group-hover:text-[#0d6e5a] shrink-0 ${refreshing ? "animate-spin" : ""}`} />
            <span className="text-[13px]">{refreshing ? "Reloading..." : "Reload Data"}</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 shrink-0 space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0d6e5a]/5 border border-[#0d6e5a]/15">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0d6e5a] to-[#0f766e] flex items-center justify-center text-white shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-slate-900">Administrator</p>
              <p className="text-[10px] text-[#0d6e5a] font-bold">Full Access</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all text-xs font-bold cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <span>Admin Console</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-900 font-extrabold">
                {activeTab === "overview" ? "Dashboard" : activeTab === "users" ? "Users & Billing" : activeTab === "tickets" ? "Support Tickets" : "Feedback Inbox"}
              </span>
            </div>
            {/* Mobile title */}
            <span className="sm:hidden font-extrabold text-slate-900 text-sm">
              {activeTab === "overview" ? "Dashboard" : activeTab === "users" ? "Users" : activeTab === "tickets" ? "Tickets" : "Feedback"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-emerald-700">System Live</span>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-white bg-[#0d6e5a] hover:bg-[#094d3f] px-3 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Invite User</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* ══ TAB: OVERVIEW ══ */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto">
              <div>
                <h1 className="text-xl font-black text-slate-900">Dashboard Overview</h1>
                <p className="text-xs text-slate-500 mt-0.5">Real-time platform metrics and health at a glance.</p>
              </div>

              {/* Revenue Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {usersLoading ? (
                  [0,1,2,3].map(i => (
                    <div key={i} className="admin-card p-5 space-y-3">
                      <div className="skeleton h-4 w-20" />
                      <div className="skeleton h-7 w-24" />
                      <div className="skeleton h-3 w-32" />
                    </div>
                  ))
                ) : (
                  [
                    { label: "Gross Revenue",  value: `₹${totalRevenue.toLocaleString()}`,           sub: `${payingUsers.length} paying users`,       accent: "metric-card-green", icon: TrendingUp,   iconColor: "text-[#0d6e5a]", iconBg: "bg-[#0d6e5a]/10" },
                    { label: "Net Received",   value: `₹${totalRevenue.toLocaleString()}`,           sub: "Collected from paid users",                 accent: "metric-card-teal",  icon: Wallet,       iconColor: "text-teal-700",  iconBg: "bg-teal-50" },
                    { label: "Early Adopters", value: `₹${earlyAdopterExpenses.toLocaleString()}`,   sub: `${earlyAdopterProCount} free early users`,  accent: "metric-card-rose",  icon: TrendingDown, iconColor: "text-rose-600",  iconBg: "bg-rose-50" },
                    { label: "Net Balance",    value: `₹${totalRevenue.toLocaleString()}`,           sub: "After expenses",                            accent: "metric-card-blue",  icon: BarChart3,    iconColor: "text-blue-700",  iconBg: "bg-blue-50" },
                  ].map((card, i) => (
                    <div key={i} className={`admin-card ${card.accent} p-5 space-y-4`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                        <div className={`h-8 w-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                          <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                        </div>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900">{card.value}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{card.sub}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                    { label: "Total Users",  value: totalUsers,   icon: Users,    iconBg: "bg-slate-100",  iconColor: "text-slate-600",   valColor: "text-slate-900" },
                    { label: "Pro Max",      value: promaxUsers,  icon: Zap,      iconBg: "bg-emerald-50", iconColor: "text-emerald-700", valColor: "text-emerald-700" },
                    { label: "Premium Pro",  value: premiumUsers, icon: Star,     iconBg: "bg-teal-50",    iconColor: "text-teal-700",    valColor: "text-teal-700" },
                    { label: "Free Tier",    value: freeUsers,    icon: UserIcon, iconBg: "bg-slate-100",  iconColor: "text-slate-500",   valColor: "text-slate-600" },
                  ].map((kpi, i) => (
                    <div key={i} className="admin-card p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">{kpi.label}</span>
                        <span className={`text-2xl font-black ${kpi.valColor}`}>{kpi.value}</span>
                      </div>
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                        <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Analytics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan distribution */}
                <div className="admin-card p-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[#0d6e5a]" />
                      Subscription Distribution
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Active users per pricing tier</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Pro Max",     count: promaxUsers,  gradFrom: "#0d6e5a", gradTo: "#0f766e", textColor: "text-[#0d6e5a]",  icon: Zap },
                      { label: "Premium Pro", count: premiumUsers, gradFrom: "#0f766e", gradTo: "#14b8a6", textColor: "text-teal-700",    icon: Star },
                      { label: "Free Tier",   count: freeUsers,    gradFrom: "#94a3b8", gradTo: "#cbd5e1", textColor: "text-slate-500",   icon: UserIcon },
                    ].map((tier, i) => {
                      const pct = totalUsers > 0 ? Math.round((tier.count / totalUsers) * 100) : 0;
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`${tier.textColor} flex items-center gap-1.5 font-bold`}>
                              <tier.icon className="h-3.5 w-3.5" />
                              {tier.label}
                            </span>
                            <span className="text-slate-600 font-bold">
                              {tier.count} <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%`, background: `linear-gradient(to right, ${tier.gradFrom}, ${tier.gradTo})` }}
                              className="h-full rounded-full transition-all duration-700"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Platform stats */}
                <div className="admin-card p-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-[#0d6e5a]" />
                      Platform Activity
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Key resume & credit metrics</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total Optimizations", value: `${analytics.totalOptimizations}`, icon: Zap,          iconColor: "text-[#0d6e5a]", bg: "bg-[#0d6e5a]/5 border-[#0d6e5a]/10" },
                      { label: "Support Tickets",      value: `${analytics.totalTickets}`,       icon: MessageSquare, iconColor: "text-amber-600",  bg: "bg-amber-50 border-amber-100" },
                      { label: "Active Paid Credits",  value: `${users.reduce((a, u) => a + (u.paidCredits > 9999 ? 0 : u.paidCredits), 0)}`, icon: Star, iconColor: "text-teal-700", bg: "bg-teal-50 border-teal-100" },
                      { label: "Avg Free Used",        value: `${totalUsers > 0 ? (users.reduce((a, u) => a + u.freeUsed, 0) / totalUsers).toFixed(1) : "0.0"}`, icon: BarChart3, iconColor: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
                    ].map((stat, i) => (
                      <div key={i} className={`border p-4 rounded-xl flex items-start gap-3 ${stat.bg}`}>
                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-200/50">
                          <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide leading-tight">{stat.label}</p>
                          <p className="text-xl font-black text-slate-900 leading-tight">{stat.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="admin-card p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setActiveTab("users")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d6e5a]/10 text-[#0d6e5a] text-xs font-bold hover:bg-[#0d6e5a]/15 transition-colors cursor-pointer">
                    <Users className="h-3.5 w-3.5" />
                    Manage Users
                  </button>
                  <button onClick={() => setActiveTab("tickets")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer">
                    <MessageSquare className="h-3.5 w-3.5" />
                    View Tickets
                    {pendingTickets > 0 && (
                      <span className="bg-rose-500 text-white rounded-full text-[9px] px-1.5 py-0.5">{pendingTickets}</span>
                    )}
                  </button>
                  <button onClick={() => { setActiveTab("feedback"); loadFeedback(); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100 transition-colors cursor-pointer">
                    <Inbox className="h-3.5 w-3.5" />
                    Feedback Inbox
                  </button>
                  <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                    <UserPlus className="h-3.5 w-3.5" />
                    Invite New User
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB: USERS ══ */}
          {activeTab === "users" && (
            <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-slate-900">Users & Billing</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Search and manage all registered users and their subscription tiers.</p>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite New User
                </button>
              </div>

              <div className="admin-card p-5 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search by email or name..."
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#0d6e5a] focus:ring-2 focus:ring-[#0d6e5a]/10 transition-all"
                  />
                </div>

                {usersLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[0,1,2].map(i => (
                      <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="skeleton h-9 w-9 rounded-full shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <div className="skeleton h-3 w-24" />
                            <div className="skeleton h-2.5 w-36" />
                          </div>
                          <div className="skeleton h-5 w-14 rounded-full" />
                        </div>
                        <div className="border-t border-slate-100 pt-3 space-y-1.5">
                          <div className="skeleton h-2.5 w-full" />
                          <div className="skeleton h-2.5 w-3/4" />
                        </div>
                        <div className="border-t border-slate-100 pt-3">
                          <div className="skeleton h-8 w-full rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : userSearch.trim() === "" ? (
                  <div className="text-center py-14 text-slate-400">
                    <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-semibold text-slate-600">Search to find users</p>
                    <p className="text-xs mt-1">{totalUsers} total registered users</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No results for "{userSearch}"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredUsers.map(u => {
                      const cfg = PLAN_CONFIG[u.plan] || PLAN_CONFIG.free;
                      const initials = (u.name || u.email)[0]?.toUpperCase() || "?";
                      return (
                        <div key={u.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white hover:border-slate-300 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#0d6e5a]/20 to-teal-100 flex items-center justify-center text-[#0d6e5a] font-black text-sm shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 text-xs truncate">{u.name || "Anonymous"}</p>
                                <p className="text-[10px] text-slate-500 font-medium truncate">{u.email}</p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] font-medium text-slate-500">
                            <div className="flex justify-between">
                              <span>Registered:</span>
                              <span className="text-slate-800 font-semibold">{new Date(u.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Free scans used:</span>
                              <span className="text-slate-800 font-semibold">{u.freeUsed}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Paid credits:</span>
                              <span className="text-[#0d6e5a] font-bold">
                                {u.plan === "owner" || u.paidCredits > 9999 ? "Unlimited" : `${u.paidCredits}`}
                              </span>
                            </div>
                          </div>
                          <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Modify Plan</span>
                            {u.plan === "owner" ? (
                              <span className="text-[9px] text-[#0d6e5a] font-bold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">👑 Owner</span>
                            ) : updatingPlanId === u.id ? (
                              <Loader2 className="h-3.5 w-3.5 text-[#0d6e5a] animate-spin" />
                            ) : (
                              <select
                                value={u.plan}
                                onChange={e => handleUpdatePlan(u.id, e.target.value as any)}
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

          {/* ══ TAB: TICKETS ══ */}
          {activeTab === "tickets" && (
            <div className="space-y-4 animate-in fade-in duration-200 max-w-7xl mx-auto">
              <div>
                <h1 className="text-xl font-black text-slate-900">Support Tickets</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {pendingTickets > 0
                    ? `${pendingTickets} ticket${pendingTickets !== 1 ? "s" : ""} awaiting reply.`
                    : "All tickets have been addressed."}
                </p>
              </div>

              {ticketsLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-5 space-y-3">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="admin-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="skeleton h-3 w-36" />
                          <div className="skeleton h-4 w-14 rounded-full" />
                        </div>
                        <div className="skeleton h-2.5 w-full" />
                        <div className="skeleton h-2.5 w-3/4" />
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
                <div className="admin-card flex flex-col items-center justify-center py-20 text-center">
                  <Inbox className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-base font-bold text-slate-700">No support tickets</p>
                  <p className="text-xs text-slate-500 mt-1">User-submitted tickets will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Ticket list */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex bg-white border border-slate-200 p-1 rounded-xl gap-1 shadow-sm">
                      {(["all", "pending", "replied"] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setTicketFilter(f)}
                          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            ticketFilter === f ? "bg-[#0d6e5a] text-white shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2 max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                      {filteredTickets.map(ticket => (
                        <button
                          key={ticket.id}
                          onClick={() => { setSelectedTicket(ticket); setReplyText(""); }}
                          className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                            selectedTicket?.id === ticket.id
                              ? "bg-teal-50 border-[#0d6e5a] shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[11px] text-slate-600 font-bold truncate max-w-[160px]">{ticket.userEmail}</span>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                              ticket.status === "replied"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}>
                              {ticket.status === "replied" ? "✓ Replied" : "● Pending"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">{ticket.message}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2 font-semibold">
                            <Clock className="h-3 w-3" />
                            {new Date(ticket.createdAt).toLocaleDateString()} · {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ticket detail */}
                  <div className="lg:col-span-7">
                    {selectedTicket ? (
                      <div className="admin-card p-5 sm:p-6 space-y-5">
                        <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#0d6e5a]/10 flex items-center justify-center text-[#0d6e5a] font-black text-sm shrink-0">
                              {selectedTicket.userEmail[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-slate-900">{selectedTicket.userEmail}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-semibold">
                                <span className="capitalize">Tier: {selectedTicket.userPlan}</span>
                                <span>·</span>
                                <span>Credits: {selectedTicket.userCredits}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={handleDeleteTicket}
                            className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">User Message</p>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-800 leading-relaxed font-medium">
                            {selectedTicket.message}
                          </div>
                        </div>

                        {selectedTicket.reply && (
                          <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Your Reply</p>
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-sm text-emerald-900 leading-relaxed font-medium">
                              {selectedTicket.reply}
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleReply} className="space-y-3 pt-4 border-t border-slate-100">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                            {selectedTicket.reply ? "Update Reply" : "Compose Reply"}
                          </p>
                          <textarea
                            rows={4}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Type your response to the user..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#0d6e5a] resize-none transition-colors"
                          />
                          <button
                            type="submit"
                            disabled={submittingReply || !replyText.trim()}
                            className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-[#0d6e5a] hover:bg-[#094d3f] shadow-sm cursor-pointer"
                          >
                            {submittingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {submittingReply ? "Sending..." : "Send Reply"}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="admin-card h-64 flex items-center justify-center text-center p-10">
                        <div>
                          <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-sm font-bold text-slate-600">Select a ticket to reply</p>
                          <p className="text-xs text-slate-400 mt-1">Choose from the list on the left</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: FEEDBACK ══ */}
          {activeTab === "feedback" && (
            <div className="space-y-4 animate-in fade-in duration-200 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-slate-900">Feedback Inbox</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {feedbackMessages.length} message{feedbackMessages.length !== 1 ? "s" : ""} from users.
                  </p>
                </div>
                <button
                  onClick={() => loadFeedback()}
                  className="self-start sm:self-auto flex items-center gap-2 text-xs font-bold text-[#0d6e5a] hover:text-[#094d3f] border border-teal-200 hover:bg-teal-50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              {feedbackLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className="admin-card p-4 space-y-3">
                      <div className="skeleton h-3.5 w-20" />
                      <div className="skeleton h-2.5 w-28" />
                      <div className="skeleton h-16 w-full" />
                    </div>
                  ))}
                </div>
              ) : feedbackMessages.length === 0 ? (
                <div className="admin-card flex flex-col items-center justify-center py-20 text-center">
                  <Inbox className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-base font-bold text-slate-700">No feedback yet</p>
                  <p className="text-xs text-slate-500 mt-1">User comments and suggestions will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {feedbackMessages.map(fb => {
                    const typeColors: Record<string, string> = {
                      bug: "bg-rose-50 border-rose-200 text-rose-700",
                      feature: "bg-amber-50 border-amber-200 text-amber-700",
                      improvement: "bg-yellow-50 border-yellow-200 text-yellow-700",
                      general: "bg-sky-50 border-sky-200 text-sky-700",
                    };
                    const typeLabel: Record<string, string> = {
                      bug: "🐛 Bug Report",
                      feature: "✨ Feature",
                      improvement: "💡 Improvement",
                      general: "💬 General",
                    };
                    return (
                      <div key={fb.id} className="admin-card p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{fb.name || "Anonymous"}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{fb.email || "—"}</p>
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
                              {deletingFeedbackId === fb.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed line-clamp-4 font-medium">{fb.message}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
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

      {/* ══ INVITE USER MODAL ══ */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
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
