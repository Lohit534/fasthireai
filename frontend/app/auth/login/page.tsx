"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  Briefcase,
  Check,
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { toast } from "react-hot-toast";

export const dynamic = "force-dynamic";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "auth-code-error") {
      setError("Authentication link expired or invalid. Please try signing in again.");
    }

    if (searchParams.get("sample") !== "true" && localStorage.getItem("fastHire_pendingSample") !== "true") {
      localStorage.removeItem("fastHire_pendingSample");
      localStorage.removeItem("fastHire_sampleResume");
      localStorage.removeItem("fastHire_sampleJD");
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const isSample = searchParams.get("sample") === "true" || localStorage.getItem("fastHire_pendingSample") === "true";
      const nextPath = isSample ? "/dashboard?sample=true" : "/dashboard";

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (authError) {
        throw authError;
      }
    } catch (err: any) {
      const msg = err.message || "Google sign-in failed. Please try again.";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-900 font-sans">
      
      {/* LEFT PANE: Branding Showroom (Desktop Only) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-[#0d6e5a] relative overflow-hidden">
        {/* Tech Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] -z-10 pointer-events-none" />
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-white/5 blur-[100px] -z-10" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 select-none group w-fit transition-transform hover:scale-[1.02]">
          <img src="/logo.png" alt="FastHire Logo" className="h-8 w-8 rounded-xl object-contain drop-shadow-sm" />
          <span className="font-extrabold text-xl tracking-tight text-white">
            FastHire
          </span>
        </Link>

        {/* Headline content */}
        <div className="space-y-6 max-w-lg my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-green-100 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-green-200" />
            <span>AI Resume Tailoring</span>
          </div>

          <h2 className="text-4xl font-black tracking-tight leading-tight text-white">
            Land more interviews starting today.
          </h2>
          <p className="text-sm text-green-100 font-medium leading-relaxed">
            Tailored, ATS-optimised resumes in under 30 seconds — 2 free optimizations every month.
          </p>

          <div className="space-y-4 pt-4 font-semibold text-xs text-green-50">
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 bg-white/15 border border-white/20 text-white rounded-md flex items-center justify-center shrink-0">
                <Check className="h-3 w-3" />
              </span>
              <span>ATS keyword matching for every job</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 bg-white/15 border border-white/20 text-white rounded-md flex items-center justify-center shrink-0">
                <Check className="h-3 w-3" />
              </span>
              <span>Stronger bullet points, real impact</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 bg-white/15 border border-white/20 text-white rounded-md flex items-center justify-center shrink-0">
                <Check className="h-3 w-3" />
              </span>
              <span>Before &amp; after ATS score tracking</span>
            </div>
          </div>
        </div>

        {/* ATS Score preview */}
        <div className="max-w-[340px] bg-white/10 border border-white/20 p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-green-100 font-bold uppercase tracking-wider">ATS Score</span>
            <span className="text-xs text-green-200 font-bold">+57 pts after FastHire</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-red-500/20 border border-red-300/30 text-red-100 p-3 text-center rounded-xl">
              <div className="text-2xl font-black">34</div>
              <div className="text-[10px] uppercase font-bold text-green-100 mt-0.5">Before</div>
            </div>
            <span className="text-white/60 font-black text-lg">&rarr;</span>
            <div className="flex-1 bg-green-500/20 border border-green-300/30 text-white p-3 text-center rounded-xl">
              <div className="text-2xl font-black">91</div>
              <div className="text-[10px] uppercase font-bold text-green-100 mt-0.5">After</div>
            </div>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden bg-white/10">
            <div className="h-full w-[91%] rounded-full" style={{ background: "linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%)" }} />
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Interactive Login Block */}
      <div className="flex flex-col justify-between w-full lg:w-1/2 p-8 md:p-12 min-h-screen relative overflow-hidden bg-[#f8fafc]">
        {/* Tech Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 -z-10 pointer-events-none" />
        
        {/* Top bar */}
        <div className="flex justify-between items-center w-full gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group py-1.5 px-2.5 -ml-2.5 rounded-lg hover:bg-slate-200/60"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-[#0d6e5a]" />
            <span>Back to home</span>
          </Link>
          <p className="text-xs text-slate-500 shrink-0">
            Don&apos;t have an account?{" "}
            <Link
              href={searchParams.get("sample") === "true" ? "/auth/signup?sample=true" : "/auth/signup"}
              className="font-bold text-[#0d6e5a] hover:underline"
            >
              Sign Up Free
            </Link>
          </p>
        </div>

        {/* Center welcome card */}
        <div className="w-full max-w-[400px] mx-auto my-auto space-y-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Sign in with your Google account to access your resumes.
            </p>
          </div>

          {/* Alert Error Box */}
          {error && (
            <div className="flex items-start gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Continue with Google button */}
          <div className="space-y-3 pt-2">
            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 font-bold h-12 flex items-center justify-center gap-3.5 rounded-xl shadow-xs hover:shadow-sm transition-all text-sm group cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#0d6e5a]" />
                  <span>Signing in with Google...</span>
                </>
              ) : (
                <>
                  <div className="h-7 w-7 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <span className="font-bold text-slate-800 tracking-tight">Continue with Google</span>
                </>
              )}
            </Button>
          </div>

          {/* Security guarantee */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-[#0d6e5a] shrink-0" />
              <span>Fast &amp; Secure Authentication</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              FastHire AI uses official Google OAuth 2.0 for instant, verified, and secure account access.
            </p>
            <div className="flex items-center gap-4 pt-1 text-[11px] font-semibold text-slate-500 border-t border-slate-200/60">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-slate-400" />
                256-bit SSL Protected
              </span>
              <span>•</span>
              <span>Instant Access</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 select-none">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-slate-600">Terms of Service</Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0d6e5a]" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
