"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, KeyRound, Mail, AlertCircle, Briefcase, Check, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      toast.success("Successfully logged in!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      toast.error(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) {
        throw authError;
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
      toast.error(err.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#060713] text-slate-100 font-sans selection:bg-violet-500/30">
      
      {/* LEFT PANE: Branding Showroom (Desktop Only) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-slate-950/60 border-r border-white/5 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px] -z-10" />

        {/* Logo */}
        <div className="flex items-center gap-2 select-none">
          <Briefcase className="h-6 w-6 text-violet-500" />
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            FastHire
          </span>
        </div>

        {/* Headline content */}
        <div className="space-y-6 max-w-lg my-auto">
          <h2 className="text-4xl font-black tracking-tight leading-tight text-white">
            Land more interviews starting today.
          </h2>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Tailored, ATS-optimised resumes in under 30 seconds — 2 free every month.
          </p>

          <div className="space-y-4 pt-4 font-semibold text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 bg-violet-950/50 border border-violet-800/30 text-violet-400 rounded-md flex items-center justify-center shrink-0">
                <Check className="h-3 w-3" />
              </span>
              <span>ATS keyword matching for every job</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 bg-violet-950/50 border border-violet-800/30 text-violet-400 rounded-md flex items-center justify-center shrink-0">
                <Check className="h-3 w-3" />
              </span>
              <span>Stronger bullet points, real impact</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 bg-violet-950/50 border border-violet-800/30 text-violet-400 rounded-md flex items-center justify-center shrink-0">
                <Check className="h-3 w-3" />
              </span>
              <span>Before & after ATS score tracking</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 bg-violet-950/50 border border-violet-800/30 text-violet-400 rounded-md flex items-center justify-center shrink-0">
                <Check className="h-3 w-3" />
              </span>
              <span>PDF & DOCX export, ready to send</span>
            </div>
          </div>
        </div>

        {/* Mock scorecard gauge */}
        <div className="max-w-[340px] bg-slate-900/50 border border-white/5 p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>ATS Score</span>
            <span className="text-violet-400">+57 pts after FastHire</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 bg-red-500/10 border border-red-500/20 text-red-400 p-2 text-center rounded-lg">
              <div className="text-lg font-black">34</div>
              <div className="text-[9px] uppercase font-bold text-slate-500">Before</div>
            </div>
            <span className="text-slate-600 font-black">→</span>
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2 text-center rounded-lg">
              <div className="text-lg font-black">91</div>
              <div className="text-[9px] uppercase font-bold text-slate-500">After</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Interactive Login Block */}
      <div className="flex flex-col justify-between w-full lg:w-1/2 p-8 md:p-12 min-h-screen">
        
        {/* Top bar */}
        <div className="flex justify-between items-center lg:justify-end">
          <Link href="/" className="lg:hidden flex items-center gap-1.5 font-bold text-xs text-slate-400 hover:text-white">
            <Briefcase className="h-4 w-4 text-violet-500" />
            <span>FastHire</span>
          </Link>
          <p className="text-xs text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-bold text-violet-400 hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        {/* Center welcome card */}
        <div className="w-full max-w-[390px] mx-auto my-auto space-y-6">
          <div className="space-y-1">
            <h1 className="text-2.5xl font-black tracking-tight text-white">Welcome back</h1>
            <p className="text-xs text-slate-400 font-semibold">Sign in to start improving your resume</p>
          </div>

          {/* Alert Error Box */}
          {error && (
            <div className="flex items-start gap-2 p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Continue with Google button */}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-[#161726]/80 hover:bg-[#1f2038] border border-white/10 text-white font-bold h-11 flex items-center justify-center gap-2.5 rounded-xl shadow-lg shadow-black/20"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.29c1.92,-1.77 3.03,-4.38 3.03,-7.39c0,-0.71 -0.06,-1.42 -0.18,-2.09Z" fill="#4285f4" />
                <path d="M12,20.57c2.31,0 4.25,-0.77 5.67,-2.09l-3.29,-2.58c-0.91,0.61 -2.08,0.97 -3.38,0.97c-2.6,0 -4.8,-1.76 -5.59,-4.13H1.97v2.66c1.46,2.9 4.47,4.82 8.03,4.82Z" fill="#34a853" />
                <path d="M6.41,12.74c-0.2,-0.61 -0.31,-1.27 -0.31,-1.94c0,-0.67 0.11,-1.33 0.31,-1.94V6.2H1.97C1.29,7.56 0.9,9.09 0.9,10.7c0,1.61 0.39,3.14 1.07,4.5H6.41Z" fill="#fbbc05" />
                <path d="M12,6.13c1.26,0 2.39,0.43 3.28,1.28l2.46,-2.46c-1.48,-1.38 -3.42,-2.22 -5.74,-2.22c-3.56,0 -6.57,1.92 -8.03,4.82l4.44,3.45c0.79,-2.37 2.99,-4.13 5.59,-4.13Z" fill="#ea4335" />
              </g>
            </svg>
            Continue with Google
          </Button>

          {/* Under Google Details checklist */}
          <div className="space-y-2 pt-2 border-t border-white/5 text-[11px] font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>ATS keyword matching for any job</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Stronger bullet points with real impact</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Before & after score — see the improvement</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>PDF & DOCX download, ready to send</span>
            </div>
          </div>

          {/* Separator / Or sign in with email */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="bg-[#060713] px-2.5 text-slate-500 font-bold uppercase tracking-wider">Or email login</span>
            </div>
          </div>

          {/* Fallback Email Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-11 h-10 border-white/5 bg-[#0b0c1b] text-white focus:border-violet-500 focus:ring-violet-500 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-11 h-10 border-white/5 bg-[#0b0c1b] text-white focus:border-violet-500 focus:ring-violet-500 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold h-10 rounded-xl shadow-lg shadow-violet-600/15"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3 pt-6 border-t border-white/5">
          <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto leading-relaxed">
            By signing in you agree to our <Link href="/terms" className="underline hover:text-white">Terms</Link> &amp; <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>.
          </p>
          <Link href="/" className="inline-flex items-center text-xs text-slate-500 hover:text-white font-bold transition-colors">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to home
          </Link>
        </div>

      </div>
    </div>
  );
}
