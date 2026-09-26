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
  Sparkles
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
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-white/5 blur-[100px] -z-10" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 select-none">
          <img src="/logo.png" alt="FastHire Logo" className="h-8 w-8 rounded-xl object-contain drop-shadow-sm" />
          <span className="font-extrabold text-xl tracking-tight text-white">
            FastHire
          </span>
        </div>

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
      <div className="flex flex-col justify-between w-full lg:w-1/2 p-8 md:p-12 min-h-screen">
        
        {/* Top bar */}
        <div className="flex justify-between items-center lg:justify-end">
          <Link href="/" className="lg:hidden flex items-center gap-1.5 font-bold text-xs text-slate-500 hover:text-slate-900">
            <Briefcase className="h-4 w-4 text-[#0d6e5a]" />
            <span>FastHire</span>
          </Link>
          <p className="text-xs text-slate-500">
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
              className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 font-bold h-12 flex items-center justify-center gap-3 rounded-xl shadow-sm transition-all hover:shadow text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#0d6e5a]" />
                  <span>Signing in with Google...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.29c1.92,-1.77 3.03,-4.38 3.03,-7.39c0,-0.71 -0.06,-1.42 -0.18,-2.09Z" fill="#4285f4" />
                      <path d="M12,20.57c2.31,0 4.25,-0.77 5.67,-2.09l-3.29,-2.58c-0.91,0.61 -2.08,0.97 -3.38,0.97c-2.6,0 -4.8,-1.76 -5.59,-4.13H1.97v2.66c1.46,2.9 4.47,4.82 8.03,4.82Z" fill="#34a853" />
                      <path d="M6.41,12.74c-0.2,-0.61 -0.31,-1.27 -0.31,-1.94c0,-0.67 0.11,-1.33 0.31,-1.94V6.2H1.97C1.29,7.56 0.9,9.09 0.9,10.7c0,1.61 0.39,3.14 1.07,4.5H6.41Z" fill="#fbbc05" />
                      <path d="M12,6.13c1.26,0 2.39,0.43 3.28,1.28l2.46,-2.46c-1.48,-1.38 -3.42,-2.22 -5.74,-2.22c-3.56,0 -6.57,1.92 -8.03,4.82l4.44,3.45c0.79,-2.37 2.99,-4.13 5.59,-4.13Z" fill="#ea4335" />
                    </g>
                  </svg>
                  <span>Continue with Google</span>
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
              FastHire AI uses official Google OAuth 2.0. We never see or store your Google password.
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
