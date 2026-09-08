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
  Loader2, 
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
  MessageCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

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

export default function UnifiedAdminDashboard() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  
  // Tab control: "users", "tickets", or "feedback"
  const [activeTab, setActiveTab] = useState<"users" | "tickets" | "feedback">("users");

  // Users Tab States
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [analytics, setAnalytics] = useState<any>({ totalOptimizations: 0, totalTickets: 0 });
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
    setUpdatingPlanId(targetUserId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, planId: newPlanId })
      });

      if (res.ok) {
        toast.success(`User plan tier updated to ${newPlanId}!`);
        // Refresh local user records list
        setUsers(prev => prev.map(u => 
          u.id === targetUserId 
            ? { ...u, plan: newPlanId, paidCredits: newPlanId === "premium" ? 15 : newPlanId === "promax" ? 999999 : 0 }
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-[#0d6e5a] animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Verifying admin access...</p>
        </div>
      </div>
    );
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

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Top Header Block */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-100 h-9 w-9 p-0 rounded-full bg-white shadow-sm">
                <ArrowLeft className="h-4.5 w-4.5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 select-none">
                <Layers className="h-6 w-6 text-[#0d6e5a]" />
                Admin System Control
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 select-none">
                Monitor user statistics, upgrade plan pricing levels, and answer client help tickets.
              </p>
            </div>
          </div>

          <Badge className="bg-teal-50 border border-teal-200 text-[#0d6e5a] text-xs font-bold px-3.5 py-1 rounded-full select-none">
            Owner Workspace
          </Badge>
        </div>

        {/* Tab selection bar */}
        <div className="flex bg-white border border-slate-200 p-1 rounded-xl max-w-lg select-none shadow-sm">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "users"
                ? "bg-[#0d6e5a] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="h-4 w-4" />
            Users &amp; Billing
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "tickets"
                ? "bg-[#0d6e5a] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Support Tickets
            {tickets.filter(t => t.status === "pending").length > 0 && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab("feedback"); loadFeedbackData(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "feedback"
                ? "bg-[#0d6e5a] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Inbox className="h-4 w-4" />
            Feedback
            {feedbackMessages.length > 0 && (
              <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-emerald-100 text-[9px] font-black text-emerald-800 border border-emerald-200">{feedbackMessages.length}</span>
            )}
          </button>
        </div>

        {/* TAB 1: USERS & PRICING LEVEL */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* THIS MONTH Financial & Project Metrics Section */}
            <div className="space-y-3 select-none">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                THIS MONTH
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Revenue Card */}
                <Card className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-all shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                        <TrendingUp className="h-4 w-4 text-[#0d6e5a]" />
                      </div>
                      <span>Revenue</span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-slate-900">
                        ₹{(premiumUsers * 99 + promaxUsers * 199).toLocaleString()}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {users.filter(u => u.plan !== "free").length} new projects
                      </p>
                      <p className="text-[10px] text-slate-400 italic mt-0.5">
                        Sum of new project budgets this month
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Received Card */}
                <Card className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-all shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[#0d6e5a] font-bold text-xs">
                        ₹
                      </div>
                      <span>Received</span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-slate-900">
                        ₹{(premiumUsers * 99 + promaxUsers * 199).toLocaleString()}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Payments collected this month
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Expenses Card */}
                <Card className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-all shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <div className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                        <TrendingDown className="h-4 w-4" />
                      </div>
                      <span>Expenses</span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-rose-600">
                        ₹0
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Team payouts &amp; tools
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Money in account Card */}
                <Card className="bg-emerald-50/50 border border-emerald-200 rounded-2xl overflow-hidden hover:border-emerald-300 transition-all shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <span>Money in account</span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-emerald-700">
                        ₹{(premiumUsers * 99 + promaxUsers * 199).toLocaleString()}
                      </div>
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        Received minus expenses
                      </p>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>

            {/* KPI Cards row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              {[
                { label: "Total Registrations", value: totalUsers, icon: Users, color: "text-slate-900" },
                { label: "Pro Max Tier", value: promaxUsers, icon: Sparkles, color: "text-[#0d6e5a]" },
                { label: "Premium Pro", value: premiumUsers, icon: CheckCircle, color: "text-teal-600" },
                { label: "Free Tier", value: freeUsers, icon: UserIcon, color: "text-slate-600" },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <Card key={idx} className="bg-white border border-slate-200 rounded-2xl relative overflow-hidden shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{kpi.label}</span>
                        <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Icon className={`h-5 w-5 ${kpi.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Dashboard Analytics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Subscription distribution cards */}
              <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Subscription distribution</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Ratio of active users per pricing level plan.</p>
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
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-[#0d6e5a] rounded-full" 
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
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-teal-600 rounded-full" 
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
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-slate-400 rounded-full" 
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
                    <h3 className="text-sm font-bold text-slate-900">Platform Load &amp; Activity</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Key resume optimize operation and credits metrics.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Total Resume Scans</span>
                      <span className="text-lg font-black text-slate-900">{analytics.totalOptimizations} scans</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Support Tickets Logged</span>
                      <span className="text-lg font-black text-slate-900">{analytics.totalTickets} tickets</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Total Paid Credits active</span>
                      <span className="text-lg font-black text-slate-900">
                        {users.reduce((acc, u) => acc + (u.paidCredits > 9999 ? 0 : u.paidCredits), 0)} credits
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Avg. Free Credits used</span>
                      <span className="text-lg font-black text-slate-900">
                        {totalUsers > 0 ? (users.reduce((acc, u) => acc + u.freeUsed, 0) / totalUsers).toFixed(1) : "0.0"} scans
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Interactive User Billing Controls Panel */}
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Search className="h-4 w-4 text-[#0d6e5a]" />
                    Billing &amp; Subscription Modifier
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Search a registered user by email or name to modify credit levels or plan tiers.</p>
                </div>

                {/* Filter / Search input */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Type email address or profile name to manage..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="h-10 pl-10 border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs w-full focus:bg-white focus:border-[#0d6e5a]"
                    />
                  </div>
                </div>

                {/* Lookup output cards */}
                {usersLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="h-6 w-6 text-[#0d6e5a] animate-spin" />
                    <p className="text-[10px] text-slate-500 font-semibold">Running lookups...</p>
                  </div>
                ) : userSearch.trim() === "" ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 bg-slate-50/60 rounded-xl select-none">
                    <UserIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-700 font-bold">Billing Lookup Panel</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Enter a user name or email address above to inspect and modify plan tiers.</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 bg-slate-50/60 rounded-xl select-none">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-semibold">No registered users matched "{userSearch}"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((u) => {
                      const isOwnerUser = u.plan === "owner";
                      return (
                        <div key={u.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 hover:border-slate-300 transition-colors shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-900 text-xs block truncate">{u.name || "Anonymous User"}</span>
                              <span className="text-[10px] text-slate-500 font-semibold block truncate mt-0.5">{u.email}</span>
                            </div>
                            {u.plan === "owner" ? (
                              <Badge className="bg-teal-50 border-teal-200 text-[#0d6e5a] font-bold text-[8px] uppercase tracking-wide shrink-0">Owner</Badge>
                            ) : u.plan === "promax" ? (
                              <Badge className="bg-emerald-50 border-emerald-200 text-emerald-700 font-bold text-[8px] uppercase tracking-wide shrink-0">Pro Max</Badge>
                            ) : u.plan === "premium" ? (
                              <Badge className="bg-teal-50 border-teal-200 text-teal-700 font-bold text-[8px] uppercase tracking-wide shrink-0">Premium Pro</Badge>
                            ) : (
                              <Badge className="bg-slate-100 border-slate-200 text-slate-600 font-bold text-[8px] uppercase tracking-wide shrink-0">Free Tier</Badge>
                            )}
                          </div>

                          <div className="border-t border-slate-200 pt-3 space-y-2 text-[10px] font-semibold text-slate-500">
                            <div className="flex justify-between">
                              <span>Registered:</span>
                              <span className="text-slate-800">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Free scans:</span>
                              <span className="text-slate-800">{u.freeUsed} used</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Paid balance:</span>
                              <span className="text-slate-800">{u.paidCredits > 9999 ? "Unlimited" : `${u.paidCredits} Paid`}</span>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Modify Plan</span>
                            {isOwnerUser ? (
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Immutable Owner</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {updatingPlanId === u.id ? (
                                  <Loader2 className="h-3 w-3 text-[#0d6e5a] animate-spin mr-1" />
                                ) : (
                                  <select
                                    value={u.plan}
                                    onChange={(e) => handleUpdateUserPlan(u.id, e.target.value as any)}
                                    className="bg-white text-slate-800 border border-slate-200 rounded-lg px-2 py-0.5 text-[9px] font-bold focus:outline-none focus:border-[#0d6e5a] cursor-pointer"
                                  >
                                    <option value="free">Free Tier</option>
                                    <option value="premium">Premium Pro</option>
                                    <option value="promax">Pro Max</option>
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}

        {/* TAB 2: SUPPORT TICKETS LIST */}
        {activeTab === "tickets" && (
          <div className="space-y-6">
            {ticketsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 text-[#0d6e5a] animate-spin" />
                <p className="text-xs text-slate-500 font-semibold">Loading tickets list...</p>
              </div>
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
                        <div className="flex items-start justify-between border-b border-slate-200 pb-4 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Client Email</span>
                            <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">{selectedTicket.userEmail}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1.5 font-bold">
                              <span>Tier: {selectedTicket.userPlan.toUpperCase()}</span>
                              <span>&bull;</span>
                              <span>Credits: {selectedTicket.userCredits}</span>
                            </div>
                          </div>
                          <Button
                            onClick={handleDeleteTicket}
                            variant="destructive"
                            size="sm"
                            className="h-8 text-[10px] font-bold rounded-lg px-3 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 transition-colors"
                          >
                            Delete Ticket
                          </Button>
                        </div>

                        {/* Message details */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">User Query / Message</span>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-800 leading-relaxed font-medium">
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
                            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 leading-relaxed font-medium">
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
                          className="w-full bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                        >
                          {submittingReply ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Send Reply Message
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
          </div>
        )}

        {/* TAB 3: FEEDBACK MESSAGES */}
        {activeTab === "feedback" && (
          <div className="space-y-4 animate-in fade-in duration-200">
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
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#0d6e5a]" />
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
                  const colorClass = typeColors[fb.type] || typeColors.general;
                  const label = typeLabel[fb.type] || typeLabel.general;
                  const sentAt = new Date(fb.createdAt);
                  const expiresAt = new Date(sentAt.getTime() + 24 * 60 * 60 * 1000);
                  const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000));

                  return (
                    <div
                      key={fb.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-slate-300 transition-all shadow-sm"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-900">{fb.name || "Anonymous"}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{fb.email || "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
                            {label}
                          </span>
                          <button
                            onClick={() => handleDeleteFeedback(fb.id)}
                            disabled={deletingFeedbackId === fb.id}
                            className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete feedback"
                          >
                            {deletingFeedbackId === fb.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
