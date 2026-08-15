"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";
import { Loader2, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      if (authError) throw authError;
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

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6"
      style={{ background: "radial-gradient(ellipse at 60% 20%, rgba(139,92,246,0.08) 0%, transparent 60%), #060713" }}>
      <div className="w-full max-w-sm space-y-7">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-7 w-7 text-violet-400" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">Admin Portal</h1>
          <p className="text-xs text-slate-500 font-semibold">FastHire AI · Secure Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admin Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-400 font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 4px 24px rgba(139,92,246,0.3)",
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In to Admin"}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-600">
          This portal is restricted to authorized administrators only.<br />
          Unauthorized access attempts are logged.
        </p>
      </div>
    </div>
  );
}
