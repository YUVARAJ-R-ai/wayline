"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Navigation,
  Search,
  MapPin,
  ArrowRight,
  Zap,
  Code2,
  Copy,
  Check,
  Shield,
  Server,
  Cpu,
  Layers,
  Terminal,
  ExternalLink,
  ChevronRight,
  Compass,
  Radio,
  LogIn,
  UserPlus,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  WaylineLogo,
  PremiumButton,
  Badge,
  Toast,
  InteractiveDotGrid,
} from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function HomePageClient() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "typescript" | "python" | "go">("curl");
  const [activeHeroTab, setActiveHeroTab] = useState<"route" | "geocode" | "telemetry">("route");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setToastMessage(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sampleCodes = {
    curl: `curl -X GET "https://api.wayline.dev/api/route\\
  ?from=80.2705,13.0843\\
  &to=80.2024,13.0067" \\
  -H "Authorization: Bearer wlk_live_8f92a10b"`,
    typescript: `import { WaylineClient } from "@wayline/sdk";

const wayline = new WaylineClient({
  apiKey: process.env.WAYLINE_API_KEY,
});

// Calculate optimal vehicle route with turn geometry
const route = await wayline.routing.calculate({
  origin: [80.2705, 13.0843],
  destination: [80.2024, 13.0067],
  mode: "driving",
});

console.log(\`Distance: \${route.distanceKm} km, Duration: \${route.durationMinutes} min\`);`,
    python: `from wayline import WaylineClient

client = WaylineClient(api_key="wlk_live_8f92a10b")

# Query route geometry and turn-by-turn guidance
route = client.routing.calculate(
    origin=(80.2705, 13.0843),
    destination=(80.2024, 13.0067),
    steps=True
)

print(f"Calculated in {route.latency_ms}ms with {len(route.waypoints)} waypoints")`,
    go: `package main

import (
    "fmt"
    "github.com/wayline/wayline-go"
)

func main() {
    client := wayline.NewClient("wlk_live_8f92a10b")
    route, err := client.Routing.Calculate(wayline.RouteParams{
        From: "80.2705,13.0843",
        To:   "80.2024,13.0067",
    })
    if err != nil {
        panic(err)
    }
    fmt.Printf("Distance: %.1f km, Duration: %d min\\n", route.DistanceKm, route.DurationMin)
}`,
  };

  return (
    <div className="min-h-screen bg-bg-base font-sans text-text-primary antialiased selection:bg-accent-purple/20 selection:text-text-primary relative overflow-x-hidden">
      {/* Toast Notification */}
      <Toast
        isOpen={Boolean(toastMessage)}
        message={toastMessage || ""}
        onClose={() => setToastMessage(null)}
      />

      {/* Interactive Cursor-Sensitive Dot Grid (Dark & Light) */}
      <InteractiveDotGrid />

      {/* --- 1. STICKY TOP NAVIGATION --- */}
      <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-bg-base/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 focus:outline-none">
              <WaylineLogo size="md" showText={true} />
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-text-secondary">
            <a href="#capabilities" className="hover:text-text-primary transition-colors">
              Capabilities
            </a>
            <a href="#architecture" className="hover:text-text-primary transition-colors">
              Architecture
            </a>
            <a href="#api" className="hover:text-text-primary transition-colors">
              API Reference
            </a>
          </nav>

          {/* Action Buttons: Theme Toggle, Log In & Sign Up */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login?mode=login"
              className="text-xs font-semibold text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg hover:bg-bg-elevated transition-colors"
            >
              Log In
            </Link>
            <Link href="/login?mode=signup">
              <PremiumButton variant="primary" size="sm">
                Sign Up
              </PremiumButton>
            </Link>
          </div>
        </div>
      </header>

      {/* --- 2. HERO SECTION --- */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
        {/* Earthy Radial Gradients */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-accent-purple/[0.08] rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8 space-y-8">
          {/* Main Headline */}
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-text-primary max-w-4xl mx-auto leading-[1.12]">
            Spatial infrastructure engineered for{" "}
            <span className="text-brand-stone">developers.</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-text-secondary leading-relaxed">
            Sub-10ms routing graphs, contraction hierarchies, and real-time geocoding.
            Deploy on your own infrastructure via Docker or scale with our high-throughput API endpoints.
          </p>

          {/* Non-redundant CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link href="/login?mode=signup">
              <PremiumButton variant="primary" size="md" icon={<ArrowRight className="w-4 h-4" />}>
                Start Building Free
              </PremiumButton>
            </Link>
            <a href="#api">
              <PremiumButton variant="secondary" size="md" icon={<Code2 className="w-4 h-4" />}>
                Explore API Docs
              </PremiumButton>
            </a>
          </div>
        </div>
      </section>

      {/* --- 3. DEVELOPER PREVIEW / INTERACTIVE ARCHITECTURE SHOWCASE --- */}
      <section className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl border border-border-default bg-bg-surface shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Terminal Window Header */}
          <div className="flex items-center justify-between border-b border-border-subtle bg-bg-base/80 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-status-error/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-status-warning/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-status-success/80" />
              <span className="ml-2 font-mono text-xs text-text-muted">wayline-spatial-daemon v1.0</span>
            </div>

            {/* Tab switchers */}
            <div className="flex items-center bg-bg-surface p-1 rounded-xl border border-border-subtle text-xs font-semibold">
              <button
                onClick={() => setActiveHeroTab("route")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeHeroTab === "route"
                    ? "bg-bg-elevated text-text-primary border border-border-subtle shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Routing Graph
              </button>
              <button
                onClick={() => setActiveHeroTab("geocode")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeHeroTab === "geocode"
                    ? "bg-bg-elevated text-text-primary border border-border-subtle shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Geocoding
              </button>
              <button
                onClick={() => setActiveHeroTab("telemetry")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeHeroTab === "telemetry"
                    ? "bg-bg-elevated text-text-primary border border-border-subtle shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Telemetry
              </button>
            </div>
          </div>

          {/* Console Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {activeHeroTab === "route" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono text-accent-purple uppercase tracking-wider font-semibold">
                      OSRM Contraction Hierarchy
                    </span>
                    <h3 className="text-lg font-bold text-text-primary mt-1">
                      Chennai Central Station → Guindy Tech Hub
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="success" size="sm">
                      ⚡ 12ms Latency
                    </Badge>
                    <span className="font-mono text-xs text-text-muted">200 OK</span>
                  </div>
                </div>

                {/* Visual Route Pipeline Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-bg-base border border-border-subtle space-y-1.5">
                    <div className="text-text-muted text-[11px]">Calculated Distance</div>
                    <div className="text-lg font-bold text-text-primary">11.4 km</div>
                    <div className="text-[10px] text-text-secondary">Urban corridor routing</div>
                  </div>
                  <div className="p-4 rounded-xl bg-bg-base border border-border-subtle space-y-1.5">
                    <div className="text-text-muted text-[11px]">Estimated Duration</div>
                    <div className="text-lg font-bold text-text-primary">18 mins</div>
                    <div className="text-[10px] text-text-secondary">Driving profile with traffic weights</div>
                  </div>
                  <div className="p-4 rounded-xl bg-bg-base border border-border-subtle space-y-1.5">
                    <div className="text-text-muted text-[11px]">Route Coordinates</div>
                    <div className="text-lg font-bold text-text-primary">32 Waypoints</div>
                    <div className="text-[10px] text-text-secondary">GeoJSON LineString output</div>
                  </div>
                </div>
              </div>
            )}

            {activeHeroTab === "geocode" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-accent-purple uppercase tracking-wider font-semibold">
                      Address Resolution Normalizer
                    </span>
                    <h3 className="text-lg font-bold text-text-primary mt-1">
                      Query: "Chennai Corporation, Rippon Building"
                    </h3>
                  </div>
                  <Badge variant="neutral" size="sm">
                    OSM Index
                  </Badge>
                </div>

                <div className="p-4 rounded-xl bg-bg-base border border-border-subtle font-mono text-xs space-y-2.5 text-text-secondary">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Resolved Coordinates:</span>
                    <span className="text-text-primary font-bold">13.0837° N, 80.2702° E</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Precision Type:</span>
                    <span className="text-accent-purple font-semibold">Building Polygon Centroid</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Resolution Latency:</span>
                    <span className="text-status-success font-semibold">9ms</span>
                  </div>
                </div>
              </div>
            )}

            {activeHeroTab === "telemetry" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-accent-purple uppercase tracking-wider font-semibold">
                      Key Telemetry & Quota Metrics
                    </span>
                    <h3 className="text-lg font-bold text-text-primary mt-1">
                      Active Key: wlk_prod_8f92...
                    </h3>
                  </div>
                  <Badge variant="success" size="sm">
                    Live Tracing
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs text-center">
                  <div className="p-3 bg-bg-base border border-border-subtle rounded-xl">
                    <div className="text-[10px] text-text-muted uppercase">Today's Calls</div>
                    <div className="text-base font-bold text-text-primary mt-1">1,420</div>
                  </div>
                  <div className="p-3 bg-bg-base border border-border-subtle rounded-xl">
                    <div className="text-[10px] text-text-muted uppercase">Median Latency</div>
                    <div className="text-base font-bold text-accent-purple mt-1">14ms</div>
                  </div>
                  <div className="p-3 bg-bg-base border border-border-subtle rounded-xl">
                    <div className="text-[10px] text-text-muted uppercase">Success Rate</div>
                    <div className="text-base font-bold text-text-primary mt-1">99.98%</div>
                  </div>
                  <div className="p-3 bg-bg-base border border-border-subtle rounded-xl">
                    <div className="text-[10px] text-text-muted uppercase">Rate Limit</div>
                    <div className="text-base font-bold text-text-primary mt-1">500 req/s</div>
                  </div>
                </div>
              </div>
            )}

            {/* Console Prompt Strip */}
            <div className="pt-3 flex items-center justify-between border-t border-border-subtle text-xs">
              <span className="text-text-secondary">
                Ready to integrate spatial endpoints into your workflow?
              </span>
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center gap-1 font-semibold text-accent-purple hover:underline"
              >
                <span>Create free account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- 4. CORE CAPABILITIES (4 HIGH CRAFT CARDS) --- */}
      <section id="capabilities" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="neutral" size="sm">
            Core Engine Capabilities
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Engineered for low latency and zero lock-in.
          </h2>
          <p className="text-sm text-text-secondary">
            Built from scratch on top of open geospatial primitives and OSRM graph algorithms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-3 hover:border-border-strong transition-all hover:shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">Sub-10ms Routing</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Pre-computed contraction hierarchies calculate turn-by-turn vehicle itineraries in single-digit milliseconds.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-3 hover:border-border-strong transition-all hover:shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">Accurate Geocoding</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Forward and reverse address resolution with typo tolerance, street interpolation, and automatic OSM fallback.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-3 hover:border-border-strong transition-all hover:shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">100% Self-Hostable</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Run standalone via Docker on your own cloud or on-premise servers. No external telemetry or vendor tracking.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-3 hover:border-border-strong transition-all hover:shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">API Key Telemetry</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Granular access tokens, rate-limit throttling, domain origins, and exact real-time call tracking per key.
            </p>
          </div>
        </div>
      </section>

      {/* --- 5. DEVELOPER CODE / SDK SECTION --- */}
      <section id="api" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="rounded-3xl border border-border-default bg-bg-surface p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Integrate in minutes</h3>
              <p className="text-xs text-text-secondary mt-1">
                Standard REST endpoints compatible with standard HTTP libraries across any programming language.
              </p>
            </div>

            {/* Language Tab Buttons */}
            <div className="flex items-center gap-1.5 bg-bg-base p-1 rounded-xl border border-border-subtle text-xs font-mono">
              <button
                onClick={() => setActiveCodeTab("curl")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeCodeTab === "curl"
                    ? "bg-bg-elevated text-text-primary border border-border-subtle"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveCodeTab("typescript")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeCodeTab === "typescript"
                    ? "bg-bg-elevated text-text-primary border border-border-subtle"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                TypeScript
              </button>
              <button
                onClick={() => setActiveCodeTab("python")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeCodeTab === "python"
                    ? "bg-bg-elevated text-text-primary border border-border-subtle"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setActiveCodeTab("go")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeCodeTab === "go"
                    ? "bg-bg-elevated text-text-primary border border-border-subtle"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Go
              </button>
            </div>
          </div>

          {/* Code Window */}
          <div className="mt-5 relative rounded-2xl bg-bg-base border border-border-subtle p-4 sm:p-5 font-mono text-xs text-text-primary overflow-x-auto">
            <button
              onClick={() => copyToClipboard(sampleCodes[activeCodeTab], activeCodeTab)}
              className="absolute right-4 top-4 p-1.5 rounded-lg bg-bg-elevated hover:bg-bg-surface text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
              title="Copy code"
            >
              {copiedCode === activeCodeTab ? (
                <Check className="w-4 h-4 text-accent-purple" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <pre className="leading-relaxed text-[12px] text-text-primary">
              {sampleCodes[activeCodeTab]}
            </pre>
          </div>
        </div>
      </section>

      {/* --- 6. ARCHITECTURE BENCHMARK STATS --- */}
      <section id="architecture" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 border-t border-border-subtle">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-3xl font-extrabold text-accent-purple font-mono">&lt; 10ms</div>
            <div className="text-xs text-text-secondary font-medium">Average Route Latency</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-extrabold text-text-primary font-mono">10,000+</div>
            <div className="text-xs text-text-secondary font-medium">Req / Sec Throughput</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-extrabold text-text-primary font-mono">100%</div>
            <div className="text-xs text-text-secondary font-medium">OpenStreetMap Data</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-extrabold text-accent-purple font-mono">0</div>
            <div className="text-xs text-text-secondary font-medium">External Telemetry Calls</div>
          </div>
        </div>
      </section>

      {/* --- 7. BOTTOM CALL TO ACTION --- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl border border-border-default bg-bg-surface p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              Start building with Wayline today.
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Create an account to generate API keys, test interactive endpoints in your sandbox, or clone the repository to self-host.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link href="/login?mode=signup">
                <PremiumButton variant="primary" size="md" icon={<UserPlus className="w-4 h-4" />}>
                  Get Started Free
                </PremiumButton>
              </Link>
              <Link href="/login?mode=login">
                <PremiumButton variant="secondary" size="md" icon={<LogIn className="w-4 h-4" />}>
                  Sign In to Account
                </PremiumButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- BRAND SUB-CONCEPTS STRIP --- */}
      <section className="border-y border-border-subtle bg-bg-surface/50 py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-around gap-6 text-xs font-mono font-semibold tracking-widest text-brand-stone uppercase select-none">
          <span>Geocoding</span>
          <span className="text-border-strong">·</span>
          <span>Routing</span>
          <span className="text-border-strong">·</span>
          <span>Analytics</span>
          <span className="text-border-strong">·</span>
          <span>Engine API</span>
        </div>
      </section>

      {/* --- 8. MINIMALIST BRAND FOOTER --- */}
      <footer className="border-t border-border-subtle bg-bg-base py-12 text-xs text-text-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-border-subtle/60">
            <div className="flex items-center gap-3">
              <WaylineLogo size="sm" showText={true} showTagline={true} />
            </div>

            <div className="flex items-center gap-6">
              <Link href="/login?mode=login" className="hover:text-text-primary transition-colors">
                Log In
              </Link>
              <Link href="/login?mode=signup" className="hover:text-text-primary transition-colors">
                Sign Up
              </Link>
              <a
                href="https://github.com/YUVARAJ-R-ai/wayline"
                target="_blank"
                rel="noreferrer"
                className="hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Bottom brand pillars row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-text-muted">
            <div className="font-mono tracking-wider uppercase text-brand-stone">
              Territory · Technology · People
            </div>
            <div>
              Built for a more connected world · Routes for real progress
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}