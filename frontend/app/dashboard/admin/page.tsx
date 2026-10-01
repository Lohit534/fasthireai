"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  MessageSquare, 
  User as UserIcon, 
  Sparkles, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Briefcase,
  Users,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Inbox,
  Trash2,
  Bug,
  Lightbulb,
  MessageCircle,
  UserPlus,
  Copy,
  Check,
  Mail,
  ExternalLink,
  RefreshCw,
  X,
  Loader2,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { AdminSkeleton, AdminUsersSkeleton, AdminTicketsSkeleton, Bone } from "@/components/SkeletonShimmer";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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

export default function UnifiedAdminDashboard() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  
  // Tab control: "users", "tickets", or "feedback"
  const [activeTab, setActiveTab] = useState<"users" | "tickets" | "feedback">("users");

  // Users Tab States
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [analytics, setAnalytics] = useState<any>({ totalOptimizations: 0, totalTickets: 0, totalRevenue: 0, paidCount: 0, recentPayments: [] });
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "owner" | "promax" | "premium" | "free">("all");
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  // Tickets Tab States
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketFilter, setTicketFilter] = useState<"all" | "pending" | "replied">("all");
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Feedback Tab States
  const [feedbackMessages, setFeedbackMessages] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);

  // Invite User Modal States
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

  // Recharts Client Mount Safety
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute Daily User Registration Growth
  const userGrowthData = React.useMemo(() => {
    if (!users || users.length === 0) return [];
    const dayMap = new Map<string, number>();
    for (const u of users) {
      if (!u.createdAt) continue;
      const day = new Date(u.createdAt).toISOString().slice(0, 10);
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
    const sortedDays = Array.from(dayMap.keys()).sort();
    if (sortedDays.length === 0) return [];

    let runningTotal = 0;
    return sortedDays.map((dayStr) => {
      const count = dayMap.get(dayStr) || 0;
      runningTotal += count;
      const d = new Date(dayStr);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        date: label,
        fullDate: dayStr,
        registrations: count,
        totalUsers: runningTotal,
      };
    });
  }, [users]);

  // Compute Monthly Revenue Trends
  const revenueTrendsData = React.useMemo(() => {
    const monthMap = new Map<string, { revenue: number; orders: number }>();
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      monthMap.set(key, { revenue: 0, orders: 0 });
    }

    const payments = analytics?.recentPayments || [];
    for (const p of payments) {
      const pDate = p.createdAt ? new Date(p.createdAt) : now;
      const key = pDate.toISOString().slice(0, 7);
      const prev = monthMap.get(key) || { revenue: 0, orders: 0 };
      const amt = Number(p.amount) || (p.planId === "promax" ? 199 : 99);
      monthMap.set(key, {
        revenue: prev.revenue + amt,
        orders: prev.orders + 1,
      });
    }

    if (payments.length === 0 && (analytics?.totalRevenue || 0) > 0) {
      const curKey = now.toISOString().slice(0, 7);
      monthMap.set(curKey, {
        revenue: analytics.totalRevenue,
        orders: analytics.paidCount || 1,
      });
    }

    const sortedMonths = Array.from(monthMap.keys()).sort();
    return sortedMonths.map((mStr) => {
      const [year, month] = mStr.split("-");
      const d = new Date(Number(year), Number(month) - 1, 1);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const item = monthMap.get(mStr) || { revenue: 0, orders: 0 };
      return {
        month: label,
        revenue: item.revenue,
        orders: item.orders,
      };
    });
  }, [analytics]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setInviting(true);
    try {
      const clientOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          emailSent: Boolean(data.emailSent),
          inviteLink: displayLink,
          message: data.message,
          email: inviteEmail.trim(),
        });
        toast.success(data.emailSent ? "Invitation dispatched to email!" : "Invitation link generated!");
        loadUsersData();
      } else {
        toast.error(data.error || "Failed to invite user.");
      }
    } catch {
      toast.error("Connection error while sending invitation.");
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

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          toast.error("Please sign in to access admin services.");
          router.push("/auth/login");
          return;
        }

        // Verify owner role
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
        loadUsersData();
        loadTicketsData();
        loadFeedbackData();
      } catch (err) {
        toast.error("Authentication check failed.");
        router.push("/dashboard");
      }
    }
    checkAdmin();
  }, [router]);

  const loadUsersData = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setAnalytics(data.analytics || { totalOptimizations: 0, totalTickets: 0 });
      } else {
        toast.error("Failed to load users list.");
      }
    } catch (e) {
      toast.error("Error loading users analytics.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadTicketsData = async () => {
    setTicketsLoading(true);
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
      setTicketsLoading(false);
    }
  };

  const loadFeedbackData = async () => {
    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) {
        const data = await res.json();
        setFeedbackMessages(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      toast.error("Error loading feedback messages.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    setDeletingFeedbackId(id);
    try {
      const res = await fetch("/api/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setFeedbackMessages((prev) => prev.filter((f) => f.id !== id));
        toast.success("Feedback deleted.");
      } else {
        toast.error("Failed to delete feedback.");
      }
    } catch {
      toast.error("Connection error.");
    } finally {
      setDeletingFeedbackId(null);
    }
  };

  const handleUpdateUserPlan = async (targetUserId: string, newPlanId: "free" | "premium" | "promax") => {
    const targetUser = users.find(u => u.id === targetUserId);
    if (targetUser?.plan === "owner") {
      toast.error("Owner account cannot be modified.");
      return;
    }

    setUpdatingPlanId(targetUserId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, planId: newPlanId })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const displayPlanId = data.planId || newPlanId;
        const displayCredits = data.paidCredits ?? (newPlanId === "premium" ? 20 : newPlanId === "promax" ? 90 : 0);
        toast.success(`User plan updated to ${displayPlanId}!`);
        // Refresh local user records list optimistically
        setUsers(prev => prev.map(u => 
          u.id === targetUserId 
            ? { ...u, plan: displayPlanId as any, paidCredits: displayCredits }
            : u
        ));
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update user plan.");
      }
    } catch (e) {
      toast.error("Connection error updating user plan.");
    } finally {
      setUpdatingPlanId(null);
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
        toast.success("Reply submitted successfully!");
        setReplyText("");
        
        // Refresh local ticket state
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
    return <AdminSkeleton />;
  }

  // Filter computations
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(userSearch.toLowerCase()) || 
      (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesPlan = planFilter === "all" || u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === "pending") return t.status === "pending";
    if (ticketFilter === "replied") return t.status === "replied";
    return true;
  });

  // Analytics variables
  const totalUsers = users.length;
  const ownerUsers = users.filter(u => u.plan === "owner").length;
  const promaxUsers = users.filter(u => u.plan === "promax").length;
  const premiumUsers = users.filter(u => u.plan === "premium").length;
  const freeUsers = users.filter(u => u.plan === "free").length;

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-28 sm:pb-8 flex flex-col gap-6">
        
        {/* Top Header Block */}
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-6"
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-100 h-9 w-9 p-0 rounded-full bg-white shadow-sm transition-transform hover:scale-105">
                <ArrowLeft className="h-4.5 w-4.5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-[#0d6e5a]">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight select-none">
                  Admin System Control
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 select-none">
                Monitor live SaaS metrics, modify user subscription tiers, and respond to support tickets.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold select-none">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>System Live</span>
              </div>
              <Badge className="bg-[#0d6e5a] text-white text-xs font-bold px-3 py-1 rounded-full select-none shadow-sm">
                Owner Portal
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  loadUsersData();
                  loadTicketsData();
                  loadFeedbackData();
                  toast.success("Metrics refreshed!");
                }}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold text-slate-700 hover:text-slate-900 border-slate-200 bg-white rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Refresh</span>
              </Button>
              <Button
                onClick={() => setIsInviteModalOpen(true)}
                size="sm"
                className="h-8 text-xs font-bold bg-[#0d6e5a] hover:bg-[#094d3f] text-white rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Invite User</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Tab selection bar */}
        <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl max-w-xl select-none shadow-sm">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === "users"
                ? "bg-[#0d6e5a] text-white shadow-sm font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Users &amp; Billing</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === "users" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
              {totalUsers}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === "tickets"
                ? "bg-[#0d6e5a] text-white shadow-sm font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Support Tickets</span>
            {tickets.filter(t => t.status === "pending").length > 0 && (
              <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black">
                {tickets.filter(t => t.status === "pending").length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("feedback"); loadFeedbackData(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === "feedback"
                ? "bg-[#0d6e5a] text-white shadow-sm font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Inbox className="h-4 w-4" />
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

        <AnimatePresence mode="wait">
          {/* TAB 1: USERS & PRICING LEVEL */}
          {activeTab === "users" && (
            <motion.div
              key="tab-users"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="space-y-6"
            >
            
            {/* ── RECHARTS DYNAMIC LINE CHARTS (Users & Billing) ── */}
            <div className="space-y-4">
              {/* Financial Health Summary strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a]">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">Financial Growth &amp; Registrations</h2>
                    <p className="text-[11px] text-slate-500">Live dynamic charts based on platform data</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium overflow-x-auto py-1">
                  <span>Collected: <strong className="text-slate-900 font-extrabold">₹{(analytics.totalRevenue || 0).toLocaleString()}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>Paying: <strong className="text-[#0d6e5a] font-extrabold">{analytics.paidCount || 0}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>Total Users: <strong className="text-slate-900 font-extrabold">{totalUsers}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>Conversion: <strong className="text-emerald-700 font-extrabold">{totalUsers > 0 ? (((analytics.paidCount || 0) / totalUsers) * 100).toFixed(1) : 0}%</strong></span>
                </div>
              </div>

              {/* Two Recharts Line Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Chart 1: Daily User Registration Growth */}
                <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <Users className="h-4 w-4 text-[#0d6e5a]" />
                          <span>Daily User Registration Growth</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Cumulative users and day-by-day signups</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-slate-900">{totalUsers}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">Total accounts</span>
                      </div>
                    </div>

                    <div className="h-64 w-full pt-2">
                      {isMounted && userGrowthData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={userGrowthData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                              dataKey="date"
                              stroke="#94a3b8"
                              fontSize={11}
                              tickLine={false}
                              axisLine={{ stroke: "#e2e8f0" }}
                            />
                            <YAxis
                              stroke="#94a3b8"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs select-none">
                                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</div>
                                      <div className="flex items-center gap-2 font-bold text-teal-400">
                                        <span>Cumulative Users:</span>
                                        <span className="text-white text-sm">{payload[0]?.value}</span>
                                      </div>
                                      {payload[1] && (
                                        <div className="text-[10px] text-slate-300 mt-0.5">
                                          +{payload[1]?.value} new on this date
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="totalUsers"
                              stroke="#0d6e5a"
                              strokeWidth={2.5}
                              dot={{ r: 3, fill: "#0d6e5a", stroke: "#ffffff", strokeWidth: 1.5 }}
                              activeDot={{ r: 6, fill: "#0d6e5a", stroke: "#ffffff", strokeWidth: 2 }}
                              name="Total Users"
                            />
                            <Line
                              type="monotone"
                              dataKey="registrations"
                              stroke="#10b981"
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              dot={false}
                              name="Daily Signups"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                          Loading registration metrics...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Chart 2: Monthly Revenue Trends */}
                <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <TrendingUp className="h-4 w-4 text-[#0f766e]" />
                          <span>Monthly Revenue Trends</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Collected subscription revenue over time (₹)</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-[#0d6e5a]">₹{(analytics.totalRevenue || 0).toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 font-medium block">Total revenue</span>
                      </div>
                    </div>

                    <div className="h-64 w-full pt-2">
                      {isMounted && revenueTrendsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={revenueTrendsData} margin={{ top: 10, right: 12, left: -5, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                              dataKey="month"
                              stroke="#94a3b8"
                              fontSize={11}
                              tickLine={false}
                              axisLine={{ stroke: "#e2e8f0" }}
                            />
                            <YAxis
                              stroke="#94a3b8"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(val) => `₹${val}`}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs select-none">
                                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</div>
                                      <div className="flex items-center gap-2 font-bold text-emerald-400">
                                        <span>Revenue:</span>
                                        <span className="text-white text-sm">₹{Number(payload[0]?.value || 0).toLocaleString()}</span>
                                      </div>
                                      {payload[0]?.payload?.orders !== undefined && (
                                        <div className="text-[10px] text-slate-300 mt-0.5">
                                          {payload[0].payload.orders} paid transaction{payload[0].payload.orders !== 1 ? "s" : ""}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="revenue"
                              stroke="#0f766e"
                              strokeWidth={2.5}
                              dot={{ r: 4, fill: "#0f766e", stroke: "#ffffff", strokeWidth: 2 }}
                              activeDot={{ r: 7, fill: "#0d6e5a", stroke: "#ffffff", strokeWidth: 2 }}
                              name="Monthly Revenue"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                          Loading revenue metrics...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* KPI Cards row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              {[
                { label: "Total Registrations", value: totalUsers, icon: Users, color: "text-slate-900", badge: "All Accounts" },
                { label: "Pro Max Tier", value: promaxUsers, icon: Sparkles, color: "text-[#0d6e5a]", badge: "₹199 / mo" },
                { label: "Premium Pro", value: premiumUsers, icon: CheckCircle, color: "text-teal-700", badge: "₹99 / mo" },
                { label: "Free Tier", value: freeUsers, icon: UserIcon, color: "text-slate-600", badge: "2 Free / mo" },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card className="bg-white border border-slate-200 rounded-2xl relative overflow-hidden shadow-sm hover:border-slate-300 transition-colors h-full">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{kpi.label}</span>
                          <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                          <span className="text-[10px] text-slate-400 font-medium block">{kpi.badge}</span>
                        </div>
                        <div className="h-11 w-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                          <Icon className={`h-5 w-5 ${kpi.color}`} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Recent Payments Table */}
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-[#0d6e5a]" />
                      Recent Payments
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Real Razorpay transactions only. Admin-granted free plans are excluded.</p>
                  </div>
                  <span className="text-xs font-bold text-[#0d6e5a] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                    ₹{(analytics.totalRevenue || 0).toLocaleString()} total
                  </span>
                </div>

                {(!analytics.recentPayments || analytics.recentPayments.length === 0) ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 bg-slate-50/60 rounded-2xl select-none">
                    <Wallet className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-700 font-bold">No payments recorded yet</p>
                    <p className="text-xs text-slate-500 mt-0.5">New Razorpay payments will appear here automatically.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-2 pr-4">Customer</th>
                          <th className="text-left text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-2 pr-4">Plan</th>
                          <th className="text-left text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-2 pr-4">Cycle</th>
                          <th className="text-right text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-2 pr-4">Amount</th>
                          <th className="text-right text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {analytics.recentPayments.map((p: any, idx: number) => (
                          <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 pr-4 font-medium text-slate-800 truncate max-w-[180px]">{p.email}</td>
                            <td className="py-2.5 pr-4">
                              {p.planId === "promax" ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full">
                                  <Sparkles className="h-2.5 w-2.5" /> Pro Max
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-700 font-bold text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full">
                                  <CheckCircle className="h-2.5 w-2.5" /> Premium
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 pr-4 text-slate-500 capitalize">{p.billingCycle}</td>
                            <td className="py-2.5 pr-4 text-right font-black text-[#0d6e5a]">₹{p.amount}</td>
                            <td className="py-2.5 text-right text-slate-500">
                              {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dashboard Analytics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Subscription distribution cards */}
              <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Subscription Distribution</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Ratio of active users by subscription tier.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Pro Max */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#0d6e5a] flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          Pro Max Tier
                        </span>
                        <span className="text-slate-700">{promaxUsers} users ({totalUsers > 0 ? Math.round((promaxUsers / totalUsers) * 100) : 0}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-[#0d6e5a] rounded-full transition-all duration-500" 
                          style={{ width: `${totalUsers > 0 ? (promaxUsers / totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Premium Pro */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-teal-700 flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Premium Pro Plan
                        </span>
                        <span className="text-slate-700">{premiumUsers} users ({totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-teal-600 rounded-full transition-all duration-500" 
                          style={{ width: `${totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Free Tier */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600 flex items-center gap-1.5">
                          <UserIcon className="h-3.5 w-3.5" />
                          Free Career Tier
                        </span>
                        <span className="text-slate-700">{freeUsers} users ({totalUsers > 0 ? Math.round((freeUsers / totalUsers) * 100) : 0}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-slate-400 rounded-full transition-all duration-500" 
                          style={{ width: `${totalUsers > 0 ? (freeUsers / totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Platform performance usage analytics */}
              <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Platform Activity &amp; Load</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Realtime optimizations and service activity.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Resume Scans</span>
                      <span className="text-xl font-black text-slate-900">{analytics.totalOptimizations}</span>
                      <span className="text-[10px] text-slate-400 block">AI ATS runs completed</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Support Tickets</span>
                      <span className="text-xl font-black text-slate-900">{analytics.totalTickets}</span>
                      <span className="text-[10px] text-slate-400 block">Total tickets opened</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active Paid Credits</span>
                      <span className="text-xl font-black text-slate-900">
                        {users.reduce((acc, u) => acc + (u.paidCredits > 9999 ? 0 : u.paidCredits), 0)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Credits available</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Avg. Free Scans</span>
                      <span className="text-xl font-black text-slate-900">
                        {totalUsers > 0 ? (users.reduce((acc, u) => acc + u.freeUsed, 0) / totalUsers).toFixed(1) : "0.0"}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Scans / free account</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Interactive User Billing Controls Panel */}
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <CardContent className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Users className="h-4.5 w-4.5 text-[#0d6e5a]" />
                      User Directory &amp; Subscription Manager
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Inspect accounts, modify plan tiers, or manage quota balances.</p>
                  </div>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full self-start sm:self-auto">
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} matching
                  </span>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search users by name or email address..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="h-10 pl-10 pr-9 border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs w-full focus:bg-white focus:border-[#0d6e5a]"
                    />
                    {userSearch && (
                      <button
                        onClick={() => setUserSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <span className="text-xs font-bold">✕</span>
                      </button>
                    )}
                  </div>

                  {/* Plan Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                    {(["all", "promax", "premium", "free", "owner"] as const).map((filter) => {
                      const labels: Record<string, string> = {
                        all: "All",
                        promax: "Pro Max",
                        premium: "Premium",
                        free: "Free",
                        owner: "Owner"
                      };
                      const isSelected = planFilter === filter;
                      return (
                        <button
                          key={filter}
                          onClick={() => setPlanFilter(filter)}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
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

                {/* Lookup output cards */}
                {usersLoading ? (
                  <AdminUsersSkeleton count={6} />
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 bg-slate-50/60 rounded-2xl select-none">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-700 font-bold">No users found</p>
                    <p className="text-xs text-slate-500 mt-0.5">Try clearing the search query or changing the filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((u) => {
                      const isOwnerUser = u.plan === "owner";
                      return (
                        <motion.div
                          key={u.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ y: -2 }}
                          transition={{ duration: 0.15 }}
                          className="bg-slate-50 hover:bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 hover:border-slate-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="h-9 w-9 rounded-xl bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center text-[#0d6e5a] font-extrabold text-xs shrink-0">
                                {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-extrabold text-slate-900 text-xs block truncate">{u.name || "Anonymous User"}</span>
                                <span className="text-[10px] text-slate-500 font-medium block truncate break-all mt-0.5" title={u.email}>{u.email}</span>
                              </div>
                            </div>
                            {u.plan === "owner" ? (
                              <Badge className="bg-teal-50 border-teal-200 text-[#0d6e5a] font-bold text-[8px] uppercase tracking-wide shrink-0">Owner</Badge>
                            ) : u.plan === "promax" ? (
                              <Badge className="bg-emerald-50 border-emerald-200 text-emerald-700 font-bold text-[8px] uppercase tracking-wide shrink-0">Pro Max</Badge>
                            ) : u.plan === "premium" ? (
                              <Badge className="bg-teal-50 border-teal-200 text-teal-700 font-bold text-[8px] uppercase tracking-wide shrink-0">Premium Pro</Badge>
                            ) : (
                              <Badge className="bg-slate-200 border-slate-300 text-slate-700 font-bold text-[8px] uppercase tracking-wide shrink-0">Free Tier</Badge>
                            )}
                          </div>

                          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-[11px] font-medium text-slate-500">
                            <div className="flex justify-between">
                              <span>Registered:</span>
                              <span className="text-slate-800 font-semibold">
                                {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Free Scans Used:</span>
                              <span className="text-slate-800 font-semibold">{u.freeUsed} scans</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Paid Balance:</span>
                              <span className="text-[#0d6e5a] font-bold">{u.paidCredits > 9999 ? "Unlimited" : `${u.paidCredits} Credits`}</span>
                            </div>
                            {u.expiresAt && (
                              <div className="flex justify-between">
                                <span>Expires:</span>
                                <span className="text-emerald-700 font-bold">
                                  {new Date(u.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-slate-200 pt-3 flex items-center justify-between gap-2 min-w-0">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0">Plan Tier</span>
                            {isOwnerUser ? (
                              <span className="text-[10px] text-[#0d6e5a] font-bold uppercase truncate">👑 Owner</span>
                            ) : (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {updatingPlanId === u.id ? (
                                  <Bone width={90} height={26} borderRadius={8} duration={1.2} />
                                ) : (
                                  <select
                                    value={u.plan}
                                    onChange={(e) => handleUpdateUserPlan(u.id, e.target.value as any)}
                                    disabled={updatingPlanId === u.id}
                                    className="bg-white text-slate-800 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none focus:border-[#0d6e5a] cursor-pointer shadow-sm hover:border-slate-300 max-w-[130px]"
                                  >
                                    <option value="free">Free Tier</option>
                                    <option value="premium">Premium Pro</option>
                                    <option value="promax">Pro Max</option>
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </motion.div>
          )}

          {/* TAB 2: SUPPORT TICKETS LIST */}
          {activeTab === "tickets" && (
            <motion.div
              key="tab-tickets"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="space-y-6"
            >
            {ticketsLoading ? (
              <AdminTicketsSkeleton count={4} />
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl p-20 text-center border border-dashed border-slate-200 bg-white shadow-sm max-w-xl mx-auto w-full select-none">
                <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center mb-4">
                  <Inbox className="h-6 w-6 text-[#0d6e5a]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">No Tickets Logged</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Help queries posted by users from the support chatbot will load here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* Left ticket lists column */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  
                  {/* Filter Sub-Tabs */}
                  <div className="flex bg-white border border-slate-200 p-1 rounded-xl gap-1 select-none shadow-sm">
                    {(["all", "pending", "replied"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setTicketFilter(tab)}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                          ticketFilter === tab
                            ? "bg-[#0d6e5a] text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable list */}
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                    {filteredTickets.map((ticket) => {
                      const isActive = selectedTicket?.id === ticket.id;
                      const hasReplied = ticket.status === "replied";
                      return (
                        <button
                          key={ticket.id}
                          onClick={() => { setSelectedTicket(ticket); setReplyText(""); }}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                            isActive
                              ? "bg-teal-50/70 border-[#0d6e5a] shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]">
                              {ticket.userEmail}
                            </span>
                            <Badge className={`text-[8px] font-bold uppercase tracking-wider py-0.5 px-2 ${
                              hasReplied 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}>
                              {ticket.status}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-slate-800 font-semibold mt-2.5 line-clamp-2 leading-relaxed">
                            {ticket.message}
                          </p>

                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-3 font-semibold">
                            <Clock className="h-3 w-3" />
                            {new Date(ticket.createdAt).toLocaleDateString()} &bull; {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right ticket reader and replier column */}
                <div className="lg:col-span-7">
                  {selectedTicket ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 flex flex-col h-full justify-between shadow-sm">
                      <div className="space-y-6">
                        
                        {/* Header details info */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200 pb-4 gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Client Email</span>
                            <h3 className="text-sm font-extrabold text-slate-900 mt-0.5 break-all">{selectedTicket.userEmail}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-1.5 font-bold">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Tier: {selectedTicket.userPlan.toUpperCase()}</span>
                              <span>&bull;</span>
                              <span className="bg-teal-50 px-2 py-0.5 rounded text-[#0d6e5a]">Credits: {selectedTicket.userCredits}</span>
                            </div>
                          </div>
                          <Button
                            onClick={handleDeleteTicket}
                            variant="destructive"
                            size="sm"
                            className="w-full sm:w-auto h-8 text-[11px] font-bold rounded-xl px-3.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete Ticket</span>
                          </Button>
                        </div>

                        {/* Message details */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">User Query / Message</span>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-800 leading-relaxed font-medium break-words whitespace-pre-wrap">
                            {selectedTicket.message}
                          </div>
                        </div>

                        {/* Reply detail if already answered */}
                        {selectedTicket.reply && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-black uppercase tracking-widest">
                              <span>Submitted Reply</span>
                              {selectedTicket.repliedAt && (
                                <span className="font-semibold text-slate-400">
                                  {new Date(selectedTicket.repliedAt).toLocaleDateString()} at {new Date(selectedTicket.repliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 leading-relaxed font-medium break-words whitespace-pre-wrap">
                              {selectedTicket.reply}
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Reply form text editor */}
                      <form onSubmit={handleReplySubmit} className="space-y-3 pt-6 border-t border-slate-200">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">
                          {selectedTicket.reply ? "Update Answer / Reply" : "Compose Answer"}
                        </span>
                        <Textarea
                          placeholder="Type your response to the user message..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[100px] text-xs border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-[#0d6e5a]"
                        />
                        <Button
                          type="submit"
                          disabled={submittingReply || !replyText.trim()}
                          className="w-full bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                        >
                          {submittingReply ? (
                            <div className="flex items-center gap-2">
                              <Bone width={14} height={14} borderRadius={3} duration={1.2} style={{ background: "rgba(255,255,255,0.4)" }} />
                              <span>Sending Reply...</span>
                            </div>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              <span>Send Reply Message</span>
                            </>
                          )}
                        </Button>
                      </form>

                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-2xl p-10 text-center select-none text-slate-400 text-xs italic bg-white shadow-sm">
                      Select a support ticket from the sidebar to compose a reply.
                    </div>
                  )}
                </div>

              </div>
            )}
            </motion.div>
          )}

          {/* TAB 3: FEEDBACK MESSAGES */}
          {activeTab === "feedback" && (
            <motion.div
              key="tab-feedback"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="space-y-4"
            >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900">Feedback Inbox</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Messages auto-delete after 24 hours. {feedbackMessages.length} message{feedbackMessages.length !== 1 ? "s" : ""} remaining.</p>
              </div>
              <button
                onClick={loadFeedbackData}
                className="text-[10px] font-bold text-[#0d6e5a] hover:text-[#094d3f] border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            {feedbackLoading ? (
              <AdminTicketsSkeleton count={3} />
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
                  const colorClass = typeColors[fb.type] || typeColors.general;
                  const label = typeLabel[fb.type] || typeLabel.general;
                  const sentAt = new Date(fb.createdAt);
                  const expiresAt = new Date(sentAt.getTime() + 24 * 60 * 60 * 1000);
                  const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000));

                  return (
                    <motion.div
                      key={fb.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.15 }}
                      className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-slate-300 transition-all shadow-sm"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{fb.name || "Anonymous"}</p>
                          <p className="text-[10px] text-slate-500 font-mono break-all truncate">{fb.email || "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
                            {label}
                          </span>
                          <button
                            onClick={() => handleDeleteFeedback(fb.id)}
                            disabled={deletingFeedbackId === fb.id}
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete feedback"
                          >
                            {deletingFeedbackId === fb.id ? (
                              <Bone width={14} height={14} borderRadius={3} duration={1.2} />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Message */}
                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-4 font-medium">
                        {fb.message}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-[9px] text-slate-400 font-mono">
                          {sentAt.toLocaleDateString()} {sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[9px] text-amber-600 font-semibold">
                          Expires in {hoursLeft}h
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Invite User Modal ── */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a] shrink-0">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Invite New User</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Create user account &amp; assign pricing tier</p>
                  </div>
                </div>
                <button
                  onClick={resetInviteModal}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          readOnly
                          value={inviteResult.inviteLink}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all outline-none break-all"
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
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                        >
                          {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedLink ? "Copied" : "Copy"}</span>
                        </button>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <a
                          href={`mailto:${inviteResult.email}?subject=${encodeURIComponent("You're invited to join FastHire AI")}&body=${encodeURIComponent(
                            `Hi ${inviteName || "there"},\n\nYou have been invited to FastHire AI — the AI resume optimizer.\n\nClick the link below to activate your account and access your dashboard:\n${inviteResult.inviteLink}\n\nBest regards,\nFastHire AI Team`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                        >
                          <Mail className="h-3.5 w-3.5 text-[#0d6e5a]" />
                          <span>Open in Email App</span>
                        </a>
                        <button
                          type="button"
                          onClick={resetInviteModal}
                          className="py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
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
                    <Input
                      type="email"
                      required
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-10 text-xs rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Full Name <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Jane Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="h-10 text-xs rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Initial Subscription Plan
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["free", "premium", "promax"] as const).map((plan) => {
                        const labels: Record<string, string> = {
                          free: "Free Tier",
                          premium: "Premium",
                          promax: "Pro Max",
                        };
                        const isSelected = invitePlan === plan;
                        return (
                          <button
                            type="button"
                            key={plan}
                            onClick={() => setInvitePlan(plan)}
                            className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                              isSelected
                                ? "bg-teal-50 border-[#0d6e5a] text-[#0d6e5a] shadow-xs"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {labels[plan]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={resetInviteModal}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      disabled={inviting || !inviteEmail}
                      className="h-9 px-4 text-xs font-bold bg-[#0d6e5a] hover:bg-[#094d3f] text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      {inviting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Sending Invite...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Send Invitation</span>
                        </>
                      )}
                    </Button>
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
