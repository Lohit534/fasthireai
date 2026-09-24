"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  LogOut,
  ChevronDown,
  ChevronRight,
  Compass,
  History,
  CreditCard,
  HelpCircle,
  MessageSquare,
  Lock,
  FileText,
  Sparkles,
  DollarSign,
  Gift,
  Menu,
  X,
  PenLine,
  Zap,
} from "lucide-react";
import { CreditInfo } from "@/types";
import { toast } from "react-hot-toast";
import SupportChatbot from "@/components/SupportChatbot";

import FeedbackToast from "@/components/FeedbackToast";
import FeedbackBanner from "@/components/FeedbackBanner";
import { ReferralModal } from "@/components/ReferralModal";
import { DemoVideoModal } from "@/components/DemoVideoModal";
import { DataPreferencesModal } from "@/components/DataPreferencesModal";
import UpgradePaywallModal from "@/components/UpgradePaywallModal";
import { useUpgradeModalStore } from "@/store/useUpgradeModalStore";

interface NavbarProps {
  refreshKey?: number;
  hideNav?: boolean;
}

export default function Navbar({ refreshKey = 0, hideNav = false }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isDataPreferencesOpen, setIsDataPreferencesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleOpenDemo = () => setIsDemoModalOpen(true);
    const handleOpenDataPref = () => setIsDataPreferencesOpen(true);
    window.addEventListener("open-demo-video", handleOpenDemo);
    window.addEventListener("open-data-preferences", handleOpenDataPref);
    return () => {
      window.removeEventListener("open-demo-video", handleOpenDemo);
      window.removeEventListener("open-data-preferences", handleOpenDataPref);
    };
  }, []);

  // Sync auth state
  useEffect(() => {
    async function getSessionUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUser(data.user);
        }
      } catch (err) {
        // Ignore fallback
      }
    }
    getSessionUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch credits
  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    // Immediately load cached plan from localStorage to avoid UI flash
    const cachedPlan = localStorage.getItem(`fastHire_plan_${userId}`);
    if (cachedPlan === "premium" || cachedPlan === "promax" || cachedPlan === "owner") {
      const isOwnerCached = cachedPlan === "owner";
      const isProMaxCached = cachedPlan === "promax";
      setCredits((prev) => prev || {
        isOwner: isOwnerCached,
        paidCredits: isOwnerCached ? 999999 : (isProMaxCached ? 90 : 20),
        freeRemaining: isOwnerCached ? 999999 : (isProMaxCached ? 90 : 20),
        freeUsed: 0,
        resetAt: new Date().toISOString(),
        planId: cachedPlan,
      });
    }

    async function fetchCredits() {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data);
          if (userId) {
            if (data.isOwner) {
              localStorage.setItem(`fastHire_plan_${userId}`, "owner");
            } else if (data.planId === "promax" && !data.isFirst50) {
              localStorage.setItem(`fastHire_plan_${userId}`, "promax");
            } else if (data.planId === "premium" || data.isFirst50) {
              localStorage.setItem(`fastHire_plan_${userId}`, "premium");
            } else {
              localStorage.setItem(`fastHire_plan_${userId}`, "free");
            }
          }
        }
      } catch (err) {
        // Silently catch
      }
    }
    fetchCredits();
  }, [user, refreshKey]);

  // Click outside listener for profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    useResumeStore.getState().reset();
    setIsDropdownOpen(false);
    toast.success("Signed out successfully.");
    router.push("/");
    router.refresh();
  };

  // Nav links definitions
  const links = [
    { label: "Optimize", href: "/dashboard", icon: <Compass className="h-4 w-4" /> },
    { label: "Resumes", href: "/dashboard/resumes", icon: <FileText className="h-4 w-4" /> },
    { label: "Job Tracker", href: "/dashboard/job-tracker", icon: <Briefcase className="h-4 w-4" /> },
    { label: "History", href: "/dashboard/history", icon: <History className="h-4 w-4" /> },
    { label: "Pricing", href: "/dashboard/pricing", icon: <DollarSign className="h-4 w-4" /> },
    { label: "Billing", href: "/dashboard/billing", icon: <CreditCard className="h-4 w-4" /> },
  ];

  // Calculations for credit percentage and plan
  const isOwner = credits?.isOwner;
  const isProMax = !isOwner && credits?.planId === "promax" && !credits?.isFirst50;
  const isPremium = !isOwner && !isProMax && (credits?.planId === "premium" || credits?.isFirst50 || (credits?.paidCredits ?? 0) > 0);
  const totalFree = isOwner ? 9999 : (isProMax ? 90 : (isPremium ? 20 : 2));
  const freeRemaining = isOwner 
    ? 9999 
    : Math.min(totalFree, credits?.freeRemaining ?? totalFree);
  const freeUsed = credits?.freeUsed ?? 0;
  const usedPercent = Math.min(100, Math.max(0, Math.round((freeUsed / totalFree) * 100)));

  const planLabel = isOwner
    ? "Owner Unlimited"
    : isProMax
    ? "Pro Max"
    : isPremium
    ? "Premium Pro"
    : "Free Career Tier";

  const creditsDisplay = isOwner
    ? "Unlimited"
    : `${freeRemaining} left`;

  // Calculate dynamic days left until credit reset (30 days cycle logic)
  const getDaysLeft = () => {
    if (!credits?.resetAt) return 30;
    const resetDate = new Date(credits.resetAt);
    const diffTime = resetDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 30;
  };
  const daysLeft = getDaysLeft();

  return (
    <>
      <nav className="border-b border-slate-200 bg-white text-slate-800 sticky top-0 z-50 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Left: Brand logo */}
          <div className="flex items-center gap-7">
            <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group select-none">
              <img src="/logo.png" alt="FastHire Logo" className="h-8 w-8 rounded-xl object-contain drop-shadow-xs group-hover:scale-105 transition-transform" />
              <span className="font-heading font-extrabold text-lg tracking-tight text-slate-900">
                FastHire AI
              </span>
            </Link>

            {/* Desktop Navigation Tabs — hidden when showing result page */}
            {user && !hideNav && (
              <div className="hidden md:flex items-center gap-1 h-16">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className={`relative flex items-center h-full px-3 text-sm font-semibold transition-colors select-none ${
                        isActive 
                          ? "text-slate-900 font-bold" 
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {link.label}
                      {isActive && (
                        <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#0d6e5a] rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Section Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <>
                {/* Profile Button with dots around the circle representing credits */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-label="Open profile menu"
                    className="relative p-1 rounded-full hover:scale-105 transition-all focus:outline-none cursor-pointer group flex items-center justify-center"
                  >
                    {/* Dotted credits ring around circular avatar */}
                    <div className="relative flex items-center justify-center">
                      <svg className="w-10 h-10 -rotate-90 pointer-events-none select-none" viewBox="0 0 44 44">
                        {Array.from({ length: 16 }).map((_, i) => {
                          const totalDots = 16;
                          const maxVal = isOwner ? totalDots : totalFree;
                          const currentVal = isOwner ? totalDots : freeRemaining;
                          const filledDots = isOwner ? totalDots : Math.round((Math.min(currentVal, maxVal) / maxVal) * totalDots);
                          const angle = (i * 360) / totalDots;
                          const rad = (angle * Math.PI) / 180;
                          const cx = 22 + 18 * Math.cos(rad);
                          const cy = 22 + 18 * Math.sin(rad);
                          const isActive = i < filledDots;
                          return (
                            <circle
                              key={i}
                              cx={cx}
                              cy={cy}
                              r={isActive ? "2.2" : "1.4"}
                              fill={isActive ? "#0d6e5a" : "#cbd5e1"}
                              className="transition-colors duration-150"
                            />
                          );
                        })}
                      </svg>
                      {/* Centered Avatar Circle */}
                      <div className="absolute inset-0 m-auto h-7 w-7 rounded-full bg-emerald-50 border border-[#0d6e5a]/30 flex items-center justify-center text-[#0d6e5a] font-black text-xs shadow-xs select-none">
                        {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                      </div>
                    </div>
                  </button>

                  {/* PROFILE DROPDOWN MENU (Compact Resized White & Brand Teal Theme) */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-[260px] sm:w-[275px] bg-white text-slate-800 border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2.5 select-none animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                      
                      {/* 1. User Header */}
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                        <div className="h-8 w-8 rounded-full bg-emerald-50 border-2 border-[#0d6e5a] ring-2 ring-[#0d6e5a]/25 flex items-center justify-center text-[#0d6e5a] font-black text-xs shrink-0">
                          {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate max-w-full">
                            {user.user_metadata?.full_name || (user.email ? user.email.split("@")[0] : "User")}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1 mt-0.5">
                            <span>{planLabel}</span>
                            {isOwner && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase px-1 py-0.2 rounded border border-amber-200">
                                Owner
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. Credits Box (White & Teal) */}
                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-2">
                        {/* Header: Credits ⓘ and X left > */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                            <span>Credits</span>
                            <HelpCircle className="h-3 w-3 text-slate-400" />
                          </div>
                          <Link
                            href="/dashboard/billing"
                            onClick={() => setIsDropdownOpen(false)}
                            className="text-xs font-black text-[#0d6e5a] hover:text-[#094d3f] flex items-center gap-0.5 transition-colors"
                          >
                            <span>{creditsDisplay}</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>

                        {/* Credit progress dots in website teal */}
                        <div className="flex items-center gap-0.5 w-full overflow-hidden py-0.5">
                          {Array.from({ length: 24 }).map((_, i) => {
                            const maxVal = isOwner ? 24 : totalFree;
                            const currentVal = isOwner ? 24 : freeRemaining;
                            const filledCount = Math.round((Math.min(currentVal, maxVal) / maxVal) * 24);
                            const isActive = isOwner || i < filledCount;
                            return (
                              <span
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-all ${
                                  isActive
                                    ? "bg-[#0d6e5a] shadow-[0_0_3px_rgba(13,110,90,0.6)]"
                                    : "bg-slate-200"
                                }`}
                              />
                            );
                          })}
                        </div>

                        {/* Action Rows: Only show upgrades if NOT on Pro Max and NOT Owner */}
                        {!isProMax && !isOwner ? (
                          <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                            {/* Action Row 1: Top-up credits / Upgrade to Pro */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="h-5 w-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                                  <Sparkles className="h-3 w-3 text-[#0d6e5a]" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-800 truncate">
                                  {isPremium ? "Refill Pro (20/mo)" : "Upgrade Pro (20/mo)"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  useUpgradeModalStore.getState().openModal({
                                    badge: "PRO",
                                    title: "Upgrade to Premium Pro",
                                    description: "Get 20 AI resume optimizations/month, unlimited PDF & DOCX downloads, and priority features.",
                                  });
                                }}
                                className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs transition-all cursor-pointer shrink-0"
                              >
                                Get
                              </button>
                            </div>

                            {/* Action Row 2: Pro Max / 90 Optimizations */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="h-5 w-5 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
                                  <Zap className="h-3 w-3 text-[#0d6e5a]" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-800 truncate">
                                  Pro Max (90/mo)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  useUpgradeModalStore.getState().openModal({
                                    badge: "PRO",
                                    title: "Upgrade to Pro Max",
                                    description: "Unlock 90 AI optimizations every month, priority ATS scoring, and high-performance resume analysis.",
                                  });
                                }}
                                className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs transition-all cursor-pointer shrink-0"
                              >
                                Get
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/80 text-[11px] font-bold text-[#0d6e5a]">
                            <Zap className="h-3.5 w-3.5 text-[#0d6e5a]" />
                            <span>Pro Max Plan Active &bull; 90 / mo</span>
                          </div>
                        )}
                      </div>

                      {/* 3. Navigation Links List */}
                      <div className="space-y-0.5 pt-0.5">
                        <Link 
                          href="/dashboard" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
                        >
                          <Compass className="h-3.5 w-3.5 text-slate-400" />
                          <span>Optimize Resume</span>
                        </Link>
                        <Link 
                          href="/dashboard/resumes" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span>My Resumes</span>
                        </Link>
                        <Link 
                          href="/dashboard/job-tracker" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
                        >
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          <span>Job Tracker</span>
                        </Link>
                        <Link 
                          href="/dashboard/pricing" 
                          onClick={() => setIsDropdownOpen(false)} 
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
                        >
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                          <span>Pricing Plans</span>
                        </Link>
                        <Link 
                          href="/dashboard/billing" 
                          onClick={() => setIsDropdownOpen(false)} 
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
                        >
                          <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                          <span>Billing &amp; Usage</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => { setIsDropdownOpen(false); setIsReferralOpen(true); }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Gift className="h-3.5 w-3.5 text-slate-400" />
                            <span>Refer a Friend</span>
                          </div>
                          <span className="bg-emerald-50 border border-emerald-200 text-[#0d6e5a] text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full">
                            New
                          </span>
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-slate-100" />

                      {/* 4. Secondary actions */}
                      <div className="space-y-0.5">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            window.dispatchEvent(new CustomEvent("open-support-chatbot", { detail: { mode: "help-center" } }));
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
                        >
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                          <span>Help &amp; Support</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsFeedbackOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                          <span>Feedback</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsDataPreferencesOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
                        >
                          <Lock className="h-3.5 w-3.5 text-slate-400" />
                          <span>Data Preferences</span>
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-slate-100" />

                      {/* 5. Sign Out */}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5 text-rose-500" />
                        <span>Sign Out</span>
                      </button>

                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 select-none">
                <Link href="/dashboard/pricing" className="hidden sm:block text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
                  Pricing
                </Link>
                <Link href="/auth/login">
                  <Button size="sm" className="bg-[#0d6e5a] hover:bg-[#0a5a49] text-white font-bold h-8 text-[11px] rounded-lg px-5 shadow-sm">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      </nav>

      {/* Mobile Bottom Navigation Bar — hidden on result page */}
      {user && !hideNav && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 flex items-center justify-around px-2 py-3 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <Link href="/dashboard" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/dashboard' ? 'text-[#0d6e5a]' : 'text-slate-400 hover:text-slate-600'}`}>
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px] font-bold">Optimize</span>
          </Link>
          <Link href="/dashboard/resumes" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/dashboard/resumes' ? 'text-[#0d6e5a]' : 'text-slate-400 hover:text-slate-600'}`}>
            <FileText className="h-5 w-5" />
            <span className="text-[10px] font-bold">Resumes</span>
          </Link>
          <Link href="/dashboard/job-tracker" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/dashboard/job-tracker' ? 'text-[#0d6e5a]' : 'text-slate-400 hover:text-slate-600'}`}>
            <Briefcase className="h-5 w-5" />
            <span className="text-[10px] font-bold">Tracker</span>
          </Link>
          <Link href="/dashboard/history" className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/dashboard/history' ? 'text-[#0d6e5a]' : 'text-slate-400 hover:text-slate-600'}`}>
            <History className="h-5 w-5" />
            <span className="text-[10px] font-bold">History</span>
          </Link>
        </div>
      )}
      {user && <FeedbackBanner onOpenFeedback={() => setIsFeedbackOpen(true)} />}
      {/* Unified Help Center, Support Tickets & 24/7 AI Chatbot */}
      {user && <SupportChatbot />}
      <FeedbackToast isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} userEmail={user?.email} />
      <ReferralModal isOpen={isReferralOpen} onClose={() => setIsReferralOpen(false)} />
      <DemoVideoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
      <DataPreferencesModal isOpen={isDataPreferencesOpen} onClose={() => setIsDataPreferencesOpen(false)} />
      <UpgradePaywallModal />
    </>
  );
}
