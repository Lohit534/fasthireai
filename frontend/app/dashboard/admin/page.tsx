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
  Inbox,
  AlertCircle,
  Briefcase,
  Users,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowRight
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
  
  // Tab control: "users" or "tickets"
  const [activeTab, setActiveTab] = useState<"users" | "tickets">("users");

  // Users Tab States
  const [users, setUsers] = useState<UserRecord[]>([]);
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
        setUsers(data);
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
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
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
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Top Header Block */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-white/5 text-slate-300 hover:bg-white/5 h-9 w-9 p-0 rounded-full bg-transparent">
                <ArrowLeft className="h-4.5 w-4.5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 select-none">
                <Layers className="h-6 w-6 text-violet-400" />
                Admin System Control
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 select-none">
                Monitor user statistics, upgrade plan pricing levels, and answer client help tickets.
              </p>
            </div>
          </div>

          <Badge className="bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold px-3.5 py-1 rounded-full animate-pulse select-none">
            Owner Workspace
          </Badge>
        </div>

        {/* Tab selection bar */}
        <div className="flex bg-[#0d0e22] border border-white/5 p-1 rounded-xl max-w-md select-none">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "users"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            Users &amp; Billing
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "tickets"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Support Tickets
            {tickets.filter(t => t.status === "pending").length > 0 && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>
        </div>

        {/* TAB 1: USERS & PRICING LEVEL */}
        {activeTab === "users" && (
          <div className="space-y-6">
            
            {/* KPI Cards row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              {[
                { label: "Total Registrations", value: totalUsers, icon: Users, color: "text-white" },
                { label: "Pro Max Tier", value: promaxUsers, icon: Sparkles, color: "text-indigo-400" },
                { label: "Premium Pro", value: premiumUsers, icon: CheckCircle, color: "text-cyan-400" },
                { label: "Free Tier", value: freeUsers, icon: UserIcon, color: "text-slate-400" },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <Card key={idx} className="bg-[#0e0f21]/40 border border-white/5 rounded-2xl relative overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{kpi.label}</span>
                        <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-white/3 flex items-center justify-center">
                        <Icon className={`h-5 w-5 ${kpi.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Filter controls */}
            <div className="bg-[#0e0f21]/30 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Search */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search user by name or email address..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="h-10 pl-10 border-white/5 bg-[#08091a] text-slate-200 placeholder:text-slate-600 rounded-xl text-xs w-full"
                />
              </div>

              {/* Plan dropdown filters */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="h-4 w-4 text-slate-500 shrink-0" />
                <div className="flex bg-[#08091a] border border-white/5 p-1 rounded-xl w-full md:w-auto">
                  {(["all", "owner", "promax", "premium", "free"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setPlanFilter(tab)}
                      className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                        planFilter === tab
                          ? "bg-violet-600 text-white"
                          : "text-slate-500 hover:text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Users listing table */}
            {usersLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                <p className="text-xs text-slate-500 font-semibold">Loading users listings...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-20 bg-[#0e0f21]/20 border border-dashed border-white/5 rounded-2xl">
                <Users className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-semibold">No registered users matched the search.</p>
              </div>
            ) : (
              <div className="border border-white/5 bg-[#0e0f21]/20 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/2 text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">
                        <th className="py-4 px-6">User profile</th>
                        <th className="py-4 px-6">Date Registered</th>
                        <th className="py-4 px-6">Pricing Level / Plan</th>
                        <th className="py-4 px-6">Credits Quota</th>
                        <th className="py-4 px-6 text-right">Modify System Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                      {filteredUsers.map((u) => {
                        const isOwnerUser = u.plan === "owner";
                        return (
                          <tr key={u.id} className="hover:bg-white/1 transition-colors">
                            <td className="py-4 px-6">
                              <div>
                                <span className="font-extrabold text-white block">{u.name || "Anonymous User"}</span>
                                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">{u.email}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-400 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-600" />
                                {new Date(u.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {u.plan === "owner" ? (
                                <Badge className="bg-violet-500/10 border-violet-500/20 text-violet-400 font-bold text-[9px] uppercase tracking-wide">Owner Account</Badge>
                              ) : u.plan === "promax" ? (
                                <Badge className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400 font-bold text-[9px] uppercase tracking-wide">Pro Max</Badge>
                              ) : u.plan === "premium" ? (
                                <Badge className="bg-cyan-500/10 border-cyan-500/20 text-cyan-400 font-bold text-[9px] uppercase tracking-wide">Premium Pro</Badge>
                              ) : (
                                <Badge className="bg-slate-500/10 border-slate-500/20 text-slate-400 font-bold text-[9px] uppercase tracking-wide">Free Tier</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {isOwnerUser ? (
                                <span className="font-extrabold text-violet-400">Unlimited</span>
                              ) : (
                                <div>
                                  <span className="font-bold text-white">{u.paidCredits > 9999 ? "Unlimited" : `${u.paidCredits} Paid`}</span>
                                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">{u.freeUsed} Free Credits Used</span>
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              {isOwnerUser ? (
                                <span className="text-[10px] text-slate-500 font-bold">Immutable System Owner</span>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  {updatingPlanId === u.id ? (
                                    <Loader2 className="h-4 w-4 text-violet-500 animate-spin mr-3" />
                                  ) : (
                                    <select
                                      value={u.plan}
                                      onChange={(e) => handleUpdateUserPlan(u.id, e.target.value as any)}
                                      className="bg-[#08091a] text-slate-300 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-violet-500"
                                    >
                                      <option value="free">Free Tier</option>
                                      <option value="premium">Premium Pro</option>
                                      <option value="promax">Pro Max</option>
                                    </select>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: SUPPORT TICKETS LIST */}
        {activeTab === "tickets" && (
          <div className="space-y-6">
            {ticketsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                <p className="text-xs text-slate-500 font-semibold">Loading tickets list...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl p-20 text-center border border-dashed border-white/5 bg-[#0e0f21]/20 max-w-xl mx-auto w-full select-none">
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                  <Inbox className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">No Tickets Logged</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Help queries posted by users from the support chatbot will load here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* Left ticket lists column */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  
                  {/* Filter Sub-Tabs */}
                  <div className="flex bg-[#0d0e22] border border-white/5 p-1 rounded-xl gap-1 select-none">
                    {(["all", "pending", "replied"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setTicketFilter(tab)}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                          ticketFilter === tab
                            ? "bg-violet-600 text-white shadow-md"
                            : "text-slate-400 hover:text-white"
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
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                            isActive
                              ? "bg-violet-950/10 border-violet-500/35"
                              : "bg-[#0d0e22]/50 border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]">
                              {ticket.userEmail}
                            </span>
                            <Badge className={`text-[8px] font-bold uppercase tracking-wider py-0.5 px-2 ${
                              hasReplied 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                            }`}>
                              {ticket.status}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-slate-300 font-semibold mt-2.5 line-clamp-2 leading-relaxed">
                            {ticket.message}
                          </p>

                          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mt-3 font-semibold">
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
                    <div className="bg-[#0d0e22]/30 border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col h-full justify-between">
                      <div className="space-y-6">
                        
                        {/* Header details info */}
                        <div className="flex items-start justify-between border-b border-white/5 pb-4 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Client Email</span>
                            <h3 className="text-sm font-extrabold text-white mt-0.5">{selectedTicket.userEmail}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5 font-bold">
                              <span>Tier: {selectedTicket.userPlan.toUpperCase()}</span>
                              <span>&bull;</span>
                              <span>Credits: {selectedTicket.userCredits}</span>
                            </div>
                          </div>
                          <Button
                            onClick={handleDeleteTicket}
                            variant="destructive"
                            size="sm"
                            className="h-8 text-[10px] font-bold rounded-lg px-3 bg-red-650 hover:bg-red-500"
                          >
                            Delete Ticket
                          </Button>
                        </div>

                        {/* Message details */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">User Query / Message</span>
                          <div className="bg-[#050614] border border-white/5 p-4 rounded-xl text-xs text-slate-200 leading-relaxed font-medium">
                            {selectedTicket.message}
                          </div>
                        </div>

                        {/* Reply detail if already answered */}
                        {selectedTicket.reply && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-black uppercase tracking-widest">
                              <span>Submitted Reply</span>
                              {selectedTicket.repliedAt && (
                                <span className="font-semibold text-slate-600">
                                  {new Date(selectedTicket.repliedAt).toLocaleDateString()} at {new Date(selectedTicket.repliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <div className="bg-[#050614] border border-emerald-500/10 p-4 rounded-xl text-xs text-slate-300 leading-relaxed font-medium">
                              {selectedTicket.reply}
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Reply form text editor */}
                      <form onSubmit={handleReplySubmit} className="space-y-3 pt-6 border-t border-white/5">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">
                          {selectedTicket.reply ? "Update Answer / Reply" : "Compose Answer"}
                        </span>
                        <Textarea
                          placeholder="Type your response to the user message..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[100px] text-xs border-white/5 bg-[#050614] text-white placeholder:text-slate-700 rounded-xl focus:border-violet-500/50"
                        />
                        <Button
                          type="submit"
                          disabled={submittingReply || !replyText.trim()}
                          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
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
                    <div className="h-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl p-10 text-center select-none text-slate-500 text-xs italic">
                      Select a support ticket from the sidebar to compose a reply.
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
