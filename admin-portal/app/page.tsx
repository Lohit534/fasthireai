"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";
import { 
  Loader2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Mail, 
  KeyRound, 
  Sparkles, 
  Users, 
  MessageSquare, 
  Lock, 
  CheckCircle2,
  Activity
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // 1. Listen for auth state transitions (handles incoming OAuth tokens & hash redirects)
    const { data: authListener } = (supabase as any).auth.onAuthStateChange(
      (event: string, session: any) => {
        if (session?.user && isAdminEmail(session.user.email)) {
          window.location.href = "/dashboard";
        }
      }
    );

    // 2. Immediate session evaluation
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user && isAdminEmail(data.session.user.email)) {
        window.location.href = "/dashboard";
        return;
      }
      setChecking(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        if (authError.message?.toLowerCase().includes("invalid login credentials")) {
          throw new Error("Invalid password. If you originally registered via Google or Magic Link, use the options below.");
        }
        throw authError;
      }
      if (!isAdminEmail(data.user?.email)) {
        await supabase.auth.signOut();
        throw new Error("Access restricted: This account does not possess administrator privileges.");
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await (supabase as any).auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError("Please enter your admin email above first.");
      return;
    }
    setError("");
    setMagicLoading(true);
    try {
      const { error: otpError } = await (supabase as any).auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (otpError) throw otpError;
      setMagicSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send magic link.");
    } finally {
      setMagicLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-3">
          <div className="relative mx-auto h-12 w-12 flex items-center justify-center">
            <img src="/logo.png" alt="FastHire Logo" className="h-8 w-8 rounded-lg animate-pulse" />
          </div>
          <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Authenticating Administrative Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#060713] text-slate-100 font-sans selection:bg-violet-500/30">
      
      {/* ── LEFT PANE: Professional Admin Showroom (Desktop Only) ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 lg:p-16 bg-[#090b1c] border-r border-white/8 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[130px] -z-10 pointer-events-none" />
        <div className="absolute bottom-10 right-10 h-[300px] w-[300px] rounded-full bg-indigo-600/10 blur-[120px] -z-10 pointer-events-none" />

        {/* Top: FastHire F Logo & Brand Header */}
        <div className="flex items-center gap-3 select-none">
          <img 
            src="/logo.png" 
            alt="FastHire Logo" 
            className="h-9 w-9 rounded-xl object-cover shadow-lg shadow-violet-500/20 ring-1 ring-white/10" 
          />
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[#c2c1ff] via-[#8b5cf6] to-[#0A84FF] bg-clip-text text-transparent">
              FastHire AI
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
              Admin Workspace
            </span>
          </div>
        </div>

        {/* Middle: Feature highlights and telemetry */}
        <div className="space-y-8 max-w-lg my-auto">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Enterprise Console
            </div>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Control, monitor, and scale FastHire AI in real-time.
            </h2>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              Unified command center for registered users, billing tier modifications, support ticketing workflows, and user feedback telemetry.
            </p>
          </div>

          {/* Feature List Cards */}
          <div className="space-y-3 pt-2">
            {[
              {
                icon: Users,
                title: "User & Subscription Modifier",
                desc: "Search, inspect, and elevate user tiers (Free, Premium Pro, Pro Max, Owner).",
              },
              {
                icon: MessageSquare,
                title: "Support Ticketing Center",
                desc: "Live query response portal directly synchronized with client inboxes.",
              },
              {
                icon: Activity,
                title: "Real-Time Telemetry & Financials",
                desc: "Live revenue metrics, token credits utilization, and platform activity logs.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 text-violet-400 mt-0.5">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: System Status & Security */}
        <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-semibold select-none">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400 text-[11px]">System Status: Operational</span>
          </div>
          <span className="text-[11px] text-slate-500">FastHire Admin v2.0</span>
        </div>
      </div>

      {/* ── RIGHT PANE: Authentication Box ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative">
        <div className="w-full max-w-md space-y-6">

          {/* Mobile Top Header (only visible on mobile) */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-2 select-none">
            <img src="/logo.png" alt="FastHire Logo" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-extrabold text-lg tracking-tight text-white">
              FastHire AI <span className="text-violet-400 text-xs uppercase ml-1 font-black">Admin</span>
            </span>
          </div>

          {/* Sign In Header */}
          <div className="space-y-1.5 text-center lg:text-left">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Administrator Login
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Enter your credentials to access the management portal.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-[#0b0d1e] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
            
            {magicSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Magic Login Link Dispatched</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    A secure sign-in token has been sent to <span className="text-violet-400 font-semibold">{email}</span>. Click the link in your email to authenticate.
                  </p>
                </div>
                <button
                  onClick={() => setMagicSent(false)}
                  className="text-xs text-slate-500 hover:text-slate-300 underline font-semibold pt-2 block mx-auto cursor-pointer"
                >
                  Return to Password Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-violet-400" />
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@fasthire.ai"
                    className="w-full bg-[#060814] text-white border border-white/15 rounded-xl px-4 py-3 text-sm placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium"
                  />
                </div>

                {/* Password input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-violet-400" />
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter administrator password"
                      className="w-full bg-[#060814] text-white border border-white/15 rounded-xl pl-4 pr-11 py-3 text-sm placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3.5 text-xs text-red-400 font-medium leading-relaxed">
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-1"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
                  }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Authenticate to Console
                    </>
                  )}
                </button>

                {/* Alternative login methods */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">or authenticate with</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Google OAuth */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                        <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7 0-1.1.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.8 0 12s.7 3.2 1.9 5.6l3.7-2.9z" />
                        <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16C3.7 19.8 7.5 23 12 23z" />
                      </svg>
                      Google
                    </button>

                    {/* Magic Link */}
                    <button
                      type="button"
                      onClick={handleMagicLink}
                      disabled={magicLoading || loading}
                      className="h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {magicLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5 text-violet-400" />}
                      Magic Link
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>

          <p className="text-center text-[11px] text-slate-500 font-medium">
            Strictly restricted to FastHire AI administrators. Unauthorized access attempts are monitored and logged.
          </p>
        </div>
      </div>

    </div>
  );
}
