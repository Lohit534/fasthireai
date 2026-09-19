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
} from "lucide-react";
import { CreditInfo } from "@/types";
import { toast } from "react-hot-toast";
import SupportChatbot from "@/components/SupportChatbot";
import AdminChat from "@/components/AdminChat";
import FeedbackToast from "@/components/FeedbackToast";
import FeedbackBanner from "@/components/FeedbackBanner";
import { ReferralModal } from "@/components/ReferralModal";
import { DemoVideoModal } from "@/components/DemoVideoModal";
import { DataPreferencesModal } from "@/components/DataPreferencesModal";

interface NavbarProps {
  refreshKey?: number;
}

export default function Navbar({ refreshKey = 0 }: NavbarProps) {
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
      setCredits((prev) => prev || { isOwner: cachedPlan === "owner", paidCredits: cachedPlan === "promax" ? 999999 : 20, freeRemaining: 20, freeUsed: 0, resetAt: new Date().toISOString(), planId: cachedPlan });
    }

    async function fetchCredits() {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data);
          if (userId) {
            if (data.isFirst50 || (data.paidCredits > 0 && data.paidCredits <= 900000)) {
              localStorage.setItem(`fastHire_plan_${userId}`, "premium");
            } else if (data.paidCredits > 900000) {
              localStorage.setItem(`fastHire_plan_${userId}`, "promax");
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

  // Calculations for credit percentage
  const freeRemaining = credits?.freeRemaining ?? 1;
  const freeUsed = credits?.freeUsed ?? 1;
  const totalFree = credits?.isFirst50 ? 15 : 2;
  const usedPercent = Math.min(100, Math.max(0, Math.round((freeUsed / totalFree) * 100)));
  const isPremium = credits?.isFirst50 || (credits?.paidCredits ?? 0) > 0;

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

            {/* Desktop Navigation Tabs */}
            {user && (
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
                {/* Refer a Friend — desktop only */}
                <button
                  onClick={() => setIsReferralOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-all"
                >
                  <Gift className="h-3.5 w-3.5" />
                  <span>Refer a Friend</span>
                </button>

                {/* Upgrade Button — desktop only */}
                {!(credits?.paidCredits && credits.paidCredits > 900000) && (
                  <Link href="/dashboard/pricing" className="hidden sm:block">
                    <button className="btn-primary-gradient h-8 px-4 text-xs font-semibold rounded-lg shadow-md">
                      Upgrade
                    </button>
                  </Link>
                )}

                {/* Profile dropdown — desktop only */}
                <div className="hidden sm:block relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-label="Open profile menu"
                    className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
                  >
                    <div className="h-7 w-7 rounded-full bg-[#0d6e5a] border border-[#0d6e5a]/20 flex items-center justify-center text-white font-black text-xs select-none">
                      {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  </button>

                  {/* PROFILE DROPDOWN MENU DRAWER (Image 4) */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-[240px] bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 space-y-1.5 select-none animate-in fade-in slide-in-from-top-1 duration-150">
                      
                      {/* User title/credits summary */}
                       <div className="px-2.5 py-2 border-b border-slate-100">
                        <div className="text-sm font-bold text-slate-900 truncate max-w-full">
                          {user.email}
                        </div>
                        <div className="text-xs text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">
                          {isPremium ? "Premium" : "Free"} &bull; {freeRemaining} left
                        </div>
                      </div>

                      {/* Main links list */}
                      <div className="space-y-0.5">
                        <Link 
                          href="/dashboard" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                          <Compass className="h-4 w-4 text-slate-400" />
                          Optimize Resume
                        </Link>
                        <Link 
                          href="/dashboard/resumes" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-slate-400" />
                          My Resumes
                        </Link>
                        <Link 
                          href="/dashboard/job-tracker" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                          <Briefcase className="h-4 w-4 text-slate-400" />
                          Job Tracker
                        </Link>
                        <Link href="/dashboard/pricing" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          Pricing
                        </Link>
                        <Link href="/dashboard/billing" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                          <CreditCard className="h-4 w-4 text-slate-400" />
                          Billing &amp; Usage
                        </Link>
                        {/* Refer a Friend in dropdown */}
                        <button
                          onClick={() => { setIsDropdownOpen(false); setIsReferralOpen(true); }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors text-left"
                        >
                          <Gift className="h-4 w-4" />
                          Refer a Friend
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-slate-100" />

                      {/* Secondary list */}
                      <div className="space-y-0.5">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            window.dispatchEvent(new CustomEvent("open-support-chatbot", { detail: { mode: "help-center" } }));
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                        >
                          <HelpCircle className="h-4 w-4 text-slate-400" />
                          Help &amp; Support
                        </button>
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsFeedbackOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                        >
                          <MessageSquare className="h-4 w-4 text-slate-400" />
                          Feedback
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsDataPreferencesOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                        >
                          <Lock className="h-4 w-4 text-slate-400" />
                          Data Preferences
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-slate-100" />

                      {/* Exit door sign out */}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>

                    </div>
                  )}
                </div>

                {/* Mobile: Hamburger button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                  className="sm:hidden flex items-center justify-center h-9 w-9 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {isMobileMenuOpen
                    ? <X className="h-5 w-5 text-slate-700" />
                    : <Menu className="h-5 w-5 text-slate-700" />
                  }
                </button>
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

      {/* ── MOBILE FULL-SCREEN MENU ── */}
      {user && isMobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 top-16 z-40 bg-white overflow-y-auto">
          <div className="px-4 py-4 space-y-1">
            {/* User strip */}
            <div className="flex items-center gap-3 px-3 py-3 mb-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="h-9 w-9 rounded-full bg-[#0d6e5a] flex items-center justify-center text-white font-black text-sm shrink-0">
                {user.email ? user.email.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user.email}</p>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  {credits?.isFirst50 || (credits?.paidCredits ?? 0) > 0 ? "Premium" : "Free"} &bull; {credits?.freeRemaining ?? 0} left
                </p>
              </div>
            </div>

            {/* Nav links */}
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? "bg-[#0d6e5a]/10 text-[#0d6e5a] font-bold" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={isActive ? "text-[#0d6e5a]" : "text-slate-400"}>{link.icon}</span>
                  {link.label}
                  {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-[#0d6e5a]" />}
                </Link>
              );
            })}

            <div className="border-t border-slate-100 my-2" />

            {/* Refer a Friend — prominent in mobile */}
            <button
              onClick={() => { setIsMobileMenuOpen(false); setIsReferralOpen(true); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors"
            >
              <Gift className="h-4 w-4 shrink-0" />
              Refer a Friend &amp; Earn Rewards
            </button>

            {/* Upgrade if not Pro Max */}
            {!(credits?.paidCredits && credits.paidCredits > 900000) && (
              <Link
                href="/dashboard/pricing"
                className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-white bg-[#0d6e5a] hover:bg-[#0a5a49] transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade Your Plan
              </Link>
            )}

            <div className="border-t border-slate-100 my-2" />

            <button
              onClick={() => { setIsMobileMenuOpen(false); window.dispatchEvent(new CustomEvent("open-support-chatbot", { detail: { mode: "help-center" } })); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
              Help &amp; Support
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); setIsFeedbackOpen(true); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-slate-400 shrink-0" />
              Feedback
            </button>
            <button
              type="button"
              onClick={() => { setIsMobileMenuOpen(false); setIsDataPreferencesOpen(true); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Lock className="h-4 w-4 text-slate-400 shrink-0" />
              Data Preferences
            </button>

            <div className="border-t border-slate-100 my-2" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
            <div className="h-8" />
          </div>
        </div>
      )}
      </nav>
      {user && <FeedbackBanner onOpenFeedback={() => setIsFeedbackOpen(true)} />}
      {/* Unified Help Center, Support Tickets & 24/7 AI Chatbot */}
      {user && <SupportChatbot />}
      <FeedbackToast isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} userEmail={user?.email} />
      <ReferralModal isOpen={isReferralOpen} onClose={() => setIsReferralOpen(false)} />
      <DemoVideoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
      <DataPreferencesModal isOpen={isDataPreferencesOpen} onClose={() => setIsDataPreferencesOpen(false)} />
    </>
  );
}
