"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Retrieve callbackUrl or fallback to default dashboard path
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else if (result?.ok) {
      // Redirect to the dynamic target URL on successful login
      router.push(callbackUrl);
    }
  };

  return (
    <div className="w-full max-w-sm p-8 bg-bg-surface border border-border-subtle rounded-2xl shadow-glass">
      
      {/* Brand/Header block */}
      <div className="flex flex-col items-center text-center gap-3 mb-8">
        <div className="border border-accent-purple/35 text-accent-purple p-2.5 rounded-xl flex items-center justify-center bg-accent-purple/5 select-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <rect width="18" height="18" x="3" y="3" rx="4" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
            <polygon points="12,9 13.5,12 12,15 10.5,12" fill="currentColor" fillOpacity={0.1} />
            <line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5" />
            <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">Sign in to Wayline</h2>
        <p className="text-sm text-text-secondary font-medium">Navigate smarter with self-hosted map APIs</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="text-sm text-center text-status-error bg-status-error/10 border border-status-error/20 py-2 px-3 rounded-lg font-medium">
            {error}
          </p>
        )}
        
        <div>
          <label className="block text-text-secondary text-sm font-semibold mb-1.5" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-bg-base border border-border-default py-2.5 px-3.5 text-text-primary placeholder-text-muted/60 focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple outline-none transition-all text-sm"
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label className="block text-text-secondary text-sm font-semibold mb-1.5" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl bg-bg-base border border-border-default py-2.5 px-3.5 text-text-primary placeholder-text-muted/60 focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple outline-none transition-all text-sm"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-accent-purple text-btn-primary-text hover:opacity-90 font-semibold py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-purple/30 transition-all text-sm mt-2 flex items-center justify-center shadow-sm select-none"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-base transition-colors duration-200">
      <Suspense fallback={
        <div className="w-full max-w-sm p-8 bg-bg-surface border border-border-subtle rounded-2xl shadow-glass flex flex-col items-center justify-center min-h-[350px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-purple"></div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
