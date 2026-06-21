"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import CreditBadge from "./CreditBadge";
import { Button } from "@/components/ui/button";
import { Menu, X, Briefcase, LogOut, Key } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Get current session
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      setRefreshKey((prev: number) => prev + 1); // Trigger credits badge reload on auth state changes
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-950 text-slate-100 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo & Tagline */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <Briefcase className="h-6 w-6 text-indigo-500 group-hover:text-emerald-500 transition-colors" />
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                FastHire-AI
              </span>
            </Link>
            <span className="hidden md:inline-block text-xs text-slate-400 border-l border-slate-800 pl-3">
              From overlooked to shortlisted — in 30 seconds.
            </span>
          </div>

          {/* Right: Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-4">
                <CreditBadge refreshKey={refreshKey} />
                <span className="text-sm text-slate-300 max-w-[150px] truncate">
                  {user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
            {!user && (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-900">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {user && <CreditBadge refreshKey={refreshKey} />}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-2 pb-4 space-y-3">
          {user ? (
            <div className="space-y-3">
              <div className="text-sm text-slate-400 px-3 truncate">{user.email}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleSignOut();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full border-slate-800 text-slate-300">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full bg-indigo-600 text-white">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
