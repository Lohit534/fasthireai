"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, KeyRound, Mail, User, AlertCircle, CheckCircle2, Briefcase } from "lucide-react";
import { toast } from "react-hot-toast";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      setSuccess(true);
      toast.success("Registration successful!");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
      toast.error(err.message || "Registration failed.");
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
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900">Create an Account</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Sign up for 2 free optimizations every month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 text-center py-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-slate-950">Verify Your Email Address</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                We have sent an verification email to <span className="font-semibold text-slate-800">{email}</span>. Please click the confirmation link to enable your credits.
              </p>
              <div className="pt-2">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full border-gray-200 text-slate-700">
                    Return to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Error Box */}
              {error && (
                <div className="flex items-start gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Name Field */}
              <div className="space-y-1">
                <label htmlFor="name" className="text-xs font-semibold text-slate-700 block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="pl-10 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

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
                  Password (Min. 6 chars)
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
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          )}

          {!success && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-bold text-indigo-600 hover:underline">
                Sign In
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
