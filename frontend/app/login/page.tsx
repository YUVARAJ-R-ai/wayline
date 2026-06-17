"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@wayline.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const router = useRouter();

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
      // Redirect to the dashboard on successful login
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-base transition-colors duration-200">
      <form onSubmit={handleSubmit} className="p-8 bg-bg-surface border border-border-subtle rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-text-primary">Sign In</h2>
        {error && <p className="mb-4 text-center text-status-error bg-status-error/10 border border-status-error/20 p-2 rounded">{error}</p>}
        <div className="mb-4">
          <label className="block text-text-secondary text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="shadow appearance-none border border-border-default bg-bg-base rounded w-full py-2 px-3 text-text-primary leading-tight focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple"
          />
        </div>
        <div className="mb-6">
          <label className="block text-text-secondary text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="shadow appearance-none border border-border-default bg-bg-base rounded w-full py-2 px-3 text-text-primary mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-accent-purple hover:opacity-90 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-accent-purple/50 w-full transition-all"
          >
            Sign In
          </button>
        </div>
        <div className="text-center mt-4 text-sm text-text-muted">
            <p>Use: <span className="font-mono text-text-secondary">admin@wayline.com</span></p>
            <p>Password: <span className="font-mono text-text-secondary">password</span></p>
        </div>
      </form>
    </div>
  );
}