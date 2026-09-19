"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { WaylineLogo, PremiumButton, InteractiveDotGrid } from "@/components/ui";
import { ArrowLeft, Check, Lock, Mail, User } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync mode with URL search params if changed
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "signup" || urlMode === "login") {
      setMode(urlMode);
    }
  }, [searchParams]);

  // Retrieve callbackUrl or fallback to default dashboard path
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        // 1. Send registration request
        let regRes = await fetch("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        // Fallback to Next.js API route if direct /auth/ is not proxied
        if (regRes.status === 404) {
          regRes = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
        }

        const data = await regRes.json();

        if (!regRes.ok) {
          setError(data.error || "Unable to create account. Please check your details.");
          setLoading(false);
          return;
        }

        // 2. Automatically log the newly registered user in
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setMode("login");
          setError("Account created successfully. Please sign in with your credentials.");
        } else if (result?.ok) {
          router.push(callbackUrl);
        }
      } else {
        // Sign-in mode
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError("Invalid email or password. Please try again.");
        } else if (result?.ok) {
          router.push(callbackUrl);
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-bg-surface border border-border-default rounded-3xl shadow-2xl relative">
      {/* Back to Home link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to homepage</span>
      </Link>

      {/* Brand Header */}
      <div className="flex flex-col items-center text-center gap-2.5 mb-6">
        <WaylineLogo size="lg" showText={true} showTagline={true} />
        <h2 className="text-xl font-bold tracking-tight text-text-primary mt-2">
          {mode === "login" ? "Welcome back" : "Create your Wayline account"}
        </h2>
        <p className="text-xs text-text-secondary">
          {mode === "login"
            ? "Sign in to access your spatial dashboard and API keys"
            : "Get started with self-hostable maps and routing graphs"}
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center bg-bg-base p-1 rounded-xl border border-border-subtle text-xs font-semibold mb-5 select-none">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            mode === "login"
              ? "bg-bg-elevated text-text-primary border border-border-subtle shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError("");
          }}
          className={`flex-1 py-1.5 rounded-lg transition-colors ${
            mode === "signup"
              ? "bg-bg-elevated text-text-primary border border-border-subtle shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error && (
          <p className="text-xs text-center text-status-error bg-status-error/10 border border-status-error/20 py-2 px-3 rounded-xl font-medium">
            {error}
          </p>
        )}

        {mode === "signup" && (
          <div>
            <label className="block text-text-secondary text-xs font-semibold mb-1" htmlFor="name">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={mode === "signup"}
                className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-9 pr-3 text-text-primary placeholder-text-muted/60 focus:border-accent-purple outline-none transition-colors text-xs"
                placeholder="Ada Lovelace"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-text-secondary text-xs font-semibold mb-1" htmlFor="email">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-9 pr-3 text-text-primary placeholder-text-muted/60 focus:border-accent-purple outline-none transition-colors text-xs"
              placeholder="developer@company.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-text-secondary text-xs font-semibold mb-1" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-9 pr-3 text-text-primary placeholder-text-muted/60 focus:border-accent-purple outline-none transition-colors text-xs"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="pt-2">
          <PremiumButton
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="w-full justify-center"
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </PremiumButton>
        </div>
      </form>

      {/* Switch mode footer */}
      <div className="mt-5 text-center text-xs text-text-muted border-t border-border-subtle pt-4">
        {mode === "login" ? (
          <span>
            Don't have an account?{" "}
            <button
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className="text-accent-purple font-semibold hover:underline"
            >
              Sign up free
            </button>
          </span>
        ) : (
          <span>
            Already have an account?{" "}
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="text-accent-purple font-semibold hover:underline"
            >
              Sign in
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-base px-4 py-8 antialiased relative overflow-hidden">
      <InteractiveDotGrid />
      <div className="relative z-10 w-full max-w-md">
        <Suspense
          fallback={
            <div className="w-full max-w-md p-8 bg-bg-surface border border-border-default rounded-3xl shadow-2xl flex flex-col items-center justify-center min-h-[350px]">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-purple border-t-transparent" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}