"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiAuth } from "../../lib/api";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await apiAuth.login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Invalid login credentials. Please try again.";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      // Try login first, or auto-register demo user if not existing
      try {
        await apiAuth.login("demo@clipforge.ai", "DemoPassword123!");
      } catch {
        await apiAuth.register("demo@clipforge.ai", "DemoPassword123!", "Demo Creator");
      }
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMessage("Demo sign-in failed. Please register a new account.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-md">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
          <p className="text-sm text-zinc-400">Sign in to your ClipForge account</p>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-900/50 bg-rose-950/40 p-3.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 py-3 text-sm font-semibold text-white shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
          </div>
        </div>

        {/* Demo Fast Login */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-200 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          Instant Demo Account Access
        </button>

        <p className="text-center text-xs text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-rose-400 hover:text-rose-300 underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
