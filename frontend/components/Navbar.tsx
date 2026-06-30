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
  Plus,
  Compass,
  History,
  CreditCard,
  HelpCircle,
  MessageSquare,
  Lock,
  FileText,
  User as UserIcon,
  Sparkles,
  DollarSign,
  TrendingUp,
  Settings,
  Users,
  ShieldCheck
} from "lucide-react";
import { CreditInfo } from "@/types";
import { toast } from "react-hot-toast";
import SupportChatbot from "@/components/SupportChatbot";
import FeedbackModal from "@/components/FeedbackModal";

interface NavbarProps {
  refreshKey?: number;
}

export default function Navbar({ refreshKey = 0 }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    async function fetchCredits() {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data);
          if (data.isFirst50 && userId) {
            localStorage.setItem(`fastHire_plan_${userId}`, "premium");
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
    { label: "Optimize", href: "/dashboard" },
    { label: "Resumes", href: "/dashboard/resumes" },
    { label: "Job Tracker", href: "/dashboard/job-tracker" },
    { label: "History", href: "/dashboard/history" },
    ...(credits?.isOwner ? [{ label: "Admin Messages", href: "/dashboard/admin/messages" }] : []),
    { label: "Pricing", href: "/dashboard/pricing" },
    { label: "Billing", href: "/dashboard/billing" },
  ];

  // Calculations for credit percentage
  const freeRemaining = credits?.freeRemaining ?? 1;
  const freeUsed = credits?.freeUsed ?? 1;
  const totalFree = 2;
  const usedPercent = Math.min(100, Math.max(0, Math.round((freeUsed / totalFree) * 100)));

  return (
    <>
      <nav className="border-b border-white/5 bg-[#060713]/80 text-slate-100 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          
          {/* Left: Brand logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group select-none">
              <img src="/logo.png" alt="FastHire Logo" className="h-5 w-5 rounded-full object-cover group-hover:scale-105 transition-transform" />
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                FastHire
              </span>
            </Link>

            {/* Desktop Navigation Tabs */}
            {user && (
              <div className="hidden md:flex items-center gap-1.5 h-14">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className={`relative flex items-center h-full px-3 text-xs font-bold transition-colors select-none ${
                        isActive 
                          ? "text-white" 
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {link.label}
                      {isActive && (
                        <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-violet-500 rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Section Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Credit usage pill widget */}
                <div className="hidden sm:flex items-center gap-2.5 bg-[#15172b]/50 border border-white/5 px-3 py-1.5 rounded-full select-none text-[11px] font-semibold text-slate-400">
                  {credits?.isOwner ? (
                    <span className="text-violet-400 font-extrabold uppercase tracking-wide">Owner Account &bull; Unlimited</span>
                  ) : (
                    <>
                      <div className="h-2 w-14 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500" 
                          style={{ width: `${usedPercent}%` }}
                        />
                      </div>
                      <span>{usedPercent}% used - resets 10d left</span>
                    </>
                  )}
                </div>

                {/* Upgrade Button */}
                <Link href="/dashboard/pricing">
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold h-8 text-[11px] rounded-full px-4 shadow-lg shadow-violet-600/10"
                  >
                    Upgrade
                  </Button>
                </Link>

                {/* Profile circular avatar dropdown container */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-1.5 p-1 rounded-full hover:bg-white/5 transition-colors focus:outline-none"
                  >
                    <div className="h-7 w-7 rounded-full bg-violet-600 border border-violet-500/30 flex items-center justify-center text-white font-black text-xs select-none">
                      {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>

                  {/* PROFILE DROPDOWN MENU DRAWER (Image 4) */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-[240px] bg-[#0c0d1b] border border-white/10 rounded-2xl shadow-2xl p-2.5 space-y-1.5 select-none animate-in fade-in slide-in-from-top-1 duration-150">
                      
                      {/* User title/credits summary */}
                       <div className="px-2.5 py-2 border-b border-white/5">
                        <div className="text-xs font-bold text-white truncate max-w-full">
                          {user.email}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">
                          {credits?.isOwner ? "Owner (Unlimited)" : `Free • ${freeRemaining} left`}
                        </div>
                      </div>

                      {/* Main links list */}
                      <div className="space-y-0.5">
                        {credits?.isOwner && (
                          <Link 
                            href="/dashboard/admin/messages" 
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
                          >
                            <ShieldCheck className="h-4 w-4 text-violet-400" />
                            Admin Messages
                          </Link>
                        )}
                        <Link 
                          href="/dashboard" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Compass className="h-4 w-4 text-slate-400" />
                          Optimize Resume
                        </Link>
                        <Link 
                          href="/dashboard/resumes" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-slate-400" />
                          My Resumes
                        </Link>
                        <Link 
                          href="/dashboard/job-tracker" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Briefcase className="h-4 w-4 text-slate-400" />
                          Job Tracker
                        </Link>
                        <Link 
                          href="/dashboard/pricing" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Sparkles className="h-4 w-4 text-slate-400" />
                          Pro Max Plan
                        </Link>
                        <Link 
                          href="/dashboard/pricing" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          Pricing
                        </Link>
                        <Link 
                          href="/dashboard/billing" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <CreditCard className="h-4 w-4 text-slate-400" />
                          Billing &amp; Usage
                        </Link>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-white/5" />

                      {/* Secondary list */}
                      <div className="space-y-0.5">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            window.dispatchEvent(new CustomEvent("open-support-chatbot", { detail: { mode: "ai" } }));
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                        >
                          <HelpCircle className="h-4 w-4 text-slate-400" />
                          Help &amp; Support
                        </button>
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsFeedbackOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                        >
                          <MessageSquare className="h-4 w-4 text-slate-400" />
                          Feedback
                        </button>
                        <Link
                          href="/privacy"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Lock className="h-4 w-4 text-slate-400" />
                          Data Preferences
                        </Link>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-white/5" />

                      {/* Exit door sign out */}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>

                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 select-none">
                <Link href="/dashboard/pricing" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
                  Pricing
                </Link>
                <Link href="/auth/login">
                  <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold h-8 text-[11px] rounded-full px-5 shadow-lg shadow-violet-600/10">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
      </nav>
      {user && <SupportChatbot />}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} userEmail={user?.email} />
    </>
  );
}
