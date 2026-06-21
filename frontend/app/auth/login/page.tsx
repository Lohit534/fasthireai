"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, KeyRound, Mail, AlertCircle, Briefcase } from "lucide-react";
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-gray-200 bg-white shadow-xl rounded-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-1">
            <Link href="/" className="flex items-center gap-2 group">
              <Briefcase className="h-7 w-7 text-indigo-600" />
              <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                FastHire-AI
              </span>
            </Link>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900">Sign In to Your Account</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Access your resume optimizer dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error Display */}
            {error && (
              <div className="flex items-start gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold text-slate-700 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-semibold text-slate-700 block">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Direct Sign-up Route Link */}
          <p className="mt-4 text-center text-xs text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-bold text-indigo-600 hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
