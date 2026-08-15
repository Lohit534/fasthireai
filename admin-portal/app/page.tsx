"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";
import { Loader2, ShieldAlert, Eye, EyeOff, Mail, KeyRound, ArrowRight } from "lucide-react";

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
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user && isAdminEmail(data.session.user.email)) {
        window.location.href = "/dashboard";
      }
      setChecking(false);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        if (authError.message?.toLowerCase().includes("invalid login credentials")) {
          throw new Error("Invalid password. If you originally signed in with Google or Magic Link, use the options below.");
        }
        throw authError;
      }
      if (!isAdminEmail(data.user?.email)) {
        await supabase.auth.signOut();
        throw new Error("Access denied. Admin accounts only.");
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Login failed.");
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
        <div className="text-center space-y-2">
          <Loader2 className="h-7 w-7 text-violet-500 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Checking admin session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#060713] text-slate-100">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/10">
            <ShieldAlert className="h-7 w-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin System Portal</h1>
          <p className="text-xs text-slate-400 font-semibold">FastHire AI · Restricted System Access</p>
        </div>

        {/* Card Container */}
        <div className="bg-[#0b0d1e] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          
          {magicSent ? (
            <div className="text-center space-y-4 py-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Mail className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Magic Login Link Sent!</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We sent a direct sign-in link to <span className="text-violet-400 font-semibold">{email}</span>. Check your inbox to enter the dashboard.
                </p>
              </div>
              <button
                onClick={() => setMagicSent(false)}
                className="text-xs text-slate-500 hover:text-slate-300 underline font-semibold pt-2"
              >
                Back to Password Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email field */}
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

              {/* Password field */}
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
                    placeholder="Enter your admin password"
                    className="w-full bg-[#060814] text-white border border-white/15 rounded-xl pl-4 pr-11 py-3 text-sm placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Box */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3.5 text-xs text-red-400 font-medium leading-relaxed">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In to Admin Portal"}
              </button>

              {/* Alternative Auth Methods */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">or sign in with</span>
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
                    {magicLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3.5 w-3.5 text-violet-400" />}
                    Magic Link
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>

        <p className="text-center text-[11px] text-slate-500 font-medium">
          Authorized personnel only. All login attempts are recorded.
        </p>
      </div>
    </div>
  );
}
