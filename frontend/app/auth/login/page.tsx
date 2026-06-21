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

          {/* Separator */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-semibold">Or continue with</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full border-gray-200 hover:bg-gray-50 text-slate-700 font-bold flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.29c1.92,-1.77 3.03,-4.38 3.03,-7.39c0,-0.71 -0.06,-1.42 -0.18,-2.09Z" fill="#4285f4" />
                <path d="M12,20.57c2.31,0 4.25,-0.77 5.67,-2.09l-3.29,-2.58c-0.91,0.61 -2.08,0.97 -3.38,0.97c-2.6,0 -4.8,-1.76 -5.59,-4.13H1.97v2.66c1.46,2.9 4.47,4.82 8.03,4.82Z" fill="#34a853" />
                <path d="M6.41,12.74c-0.2,-0.61 -0.31,-1.27 -0.31,-1.94c0,-0.67 0.11,-1.33 0.31,-1.94V6.2H1.97C1.29,7.56 0.9,9.09 0.9,10.7c0,1.61 0.39,3.14 1.07,4.5H6.41Z" fill="#fbbc05" />
                <path d="M12,6.13c1.26,0 2.39,0.43 3.28,1.28l2.46,-2.46c-1.48,-1.38 -3.42,-2.22 -5.74,-2.22c-3.56,0 -6.57,1.92 -8.03,4.82l4.44,3.45c0.79,-2.37 2.99,-4.13 5.59,-4.13Z" fill="#ea4335" />
              </g>
            </svg>
            Sign in with Google
          </Button>

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
