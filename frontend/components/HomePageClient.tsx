"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Zap,
  Compass,
  Key,
  Server,
  ArrowRight,
  Check,
  Copy,
  Terminal,
  Activity,
  Shield,
  Menu,
  X,
  Code2,
  Navigation,
} from "lucide-react";
import {
  WaylineLogo,
  PremiumButton,
  Badge,
  Toast,
} from "@/components/ui";

export default function HomePageClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "typescript" | "python">("curl");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Interactive Playground State
  const [searchQuery, setSearchQuery] = useState("Chennai, Tamil Nadu");
  const [isSearching, setIsSearching] = useState(false);
  const [demoResult, setDemoResult] = useState<{
    lat: number;
    lng: number;
    address: string;
    latency: number;
  }>({
    lat: 13.0843,
    lng: 80.2705,
    address: "Chennai, Tamil Nadu, India",
    latency: 14,
  });

  const handleDemoSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const start = performance.now();

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      const latency = Math.round(performance.now() - start);

      if (res.ok) {
        const data = await res.json();
        setDemoResult({
          lat: data.lat ?? 13.0843,
          lng: data.lng ?? 80.2705,
          address: data.address ?? searchQuery,
          latency: latency > 0 ? latency : 12,
        });
        setToastMessage(`Geocoded in ${latency}ms`);
      }
    } catch {
      setDemoResult((prev) => ({
        ...prev,
        latency: Math.round(performance.now() - start),
      }));
    } finally {
      setIsSearching(false);
    }
  };

  const codeSnippets = {
    curl: `# 1. Calculate turn-by-turn driving route
curl -X GET "https://api.wayline.dev/api/route?from=80.2522,13.0952&to=80.2700,13.0839" \\
  -H "x-api-key: wlk_prod_99f8c12a"

# 2. Forward Geocode Location
curl -X GET "https://api.wayline.dev/api/geocode?q=Chennai" \\
  -H "x-api-key: wlk_prod_99f8c12a"`,

    typescript: `import { WaylineClient } from "@wayline/sdk";

const wayline = new WaylineClient({
  apiKey: process.env.WAYLINE_API_KEY, // wlk_prod_...
});

// Compute sub-10ms driving route
const route = await wayline.route({
  from: [80.2522, 13.0952],
  to: [80.2700, 13.0839],
  geometries: "geojson",
});

console.log(\`Distance: \${route.distance}km, ETA: \${route.duration}min\`);`,

    python: `from wayline import Wayline

client = Wayline(api_key="wlk_prod_99f8c12a")

# Query route with GeoJSON geometry
route = client.routes.get(
    origin=[80.2522, 13.0952],
    destination=[80.2700, 13.0839]
)

print(f"Distance: {route.distance} km | Duration: {route.duration} min")`,
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippets[activeCodeTab]);
    setCopiedSnippet(true);
    setToastMessage("Code snippet copied to clipboard");
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary selection:bg-accent-purple/30 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Toast Notification */}
      <Toast
        isOpen={Boolean(toastMessage)}
        message={toastMessage || ""}
        onClose={() => setToastMessage(null)}
      />

      {/* --- Sticky Navigation --- */}
      <header className="sticky top-0 z-40 w-full border-b border-border-subtle/80 bg-bg-base/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="focus:outline-none">
            <WaylineLogo size="md" showText={true} />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <a
              href="#features"
              className="hover:text-text-primary transition-colors select-none"
            >
              Capabilities
            </a>
            <a
              href="#api"
              className="hover:text-text-primary transition-colors select-none"
            >
              API Reference
            </a>
            <a
              href="#telemetry"
              className="hover:text-text-primary transition-colors select-none"
            >
              Architecture
            </a>
            <Link
              href="/dashboard"
              className="hover:text-accent-purple transition-colors select-none"
            >
              Dashboard
            </Link>
          </nav>

          {/* Nav Right CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors select-none"
            >
              Sign In
            </Link>
            <Link href="/login">
              <PremiumButton
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Get Started
              </PremiumButton>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-text-secondary hover:text-text-primary focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border-subtle bg-bg-surface px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              Capabilities
            </a>
            <a
              href="#api"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              API Reference
            </a>
            <a
              href="#telemetry"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              Architecture
            </a>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-accent-purple"
            >
              Dashboard
            </Link>
            <div className="pt-2 border-t border-border-subtle flex flex-col gap-2">
              <Link href="/login" className="w-full">
                <PremiumButton variant="secondary" size="md" className="w-full">
                  Sign In
                </PremiumButton>
              </Link>
              <Link href="/login" className="w-full">
                <PremiumButton variant="primary" size="md" className="w-full">
                  Get Started
                </PremiumButton>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-accent-purple/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        {/* Abstract Grid Background Overlay */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#1f243020_1px,transparent_1px),linear-gradient(to_bottom,#1f243020_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center animate-in fade-in duration-300">
            <Badge variant="accent" size="md" icon={<Zap className="w-3.5 h-3.5" />}>
              Wayline Engine v2.0 • Self-Hostable Spatial Infrastructure
            </Badge>
          </div>

          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.08]">
            Geocoding & routing infrastructure{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-purple via-[#34d399] to-accent-blue">
              built for developers.
            </span>
          </h1>

          {/* Supporting Paragraph */}
          <p className="text-base sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed font-normal">
            Sub-millisecond geocoding, turn-by-turn routing, and PostGIS-backed spatial analytics through resilient APIs. Fast, lightweight, and open.
          </p>

          {/* Hero CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/login" className="w-full sm:w-auto">
              <PremiumButton
                variant="primary"
                size="lg"
                className="w-full sm:w-auto font-semibold"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Get Started Free
              </PremiumButton>
            </Link>
            <a href="#playground" className="w-full sm:w-auto">
              <PremiumButton
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                icon={<Terminal className="w-4 h-4" />}
              >
                Try Interactive Demo
              </PremiumButton>
            </a>
          </div>

          {/* --- Interactive Developer Console Widget --- */}
          <div id="playground" className="pt-10 max-w-4xl mx-auto text-left">
            <div className="bg-bg-surface border border-border-default rounded-2xl shadow-2xl overflow-hidden">
              {/* Window Title Bar */}
              <div className="px-4 py-3 bg-bg-elevated/60 border-b border-border-subtle flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-status-error/70" />
                  <div className="w-3 h-3 rounded-full bg-status-warning/70" />
                  <div className="w-3 h-3 rounded-full bg-status-success/70" />
                  <span className="ml-2 font-mono text-xs text-text-muted">
                    wayline-interactive-console
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                  <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                  <span>LATENCY: {demoResult.latency}ms</span>
                </div>
              </div>

              {/* Interactive Search Bar inside Console */}
              <div className="p-4 sm:p-6 border-b border-border-subtle bg-bg-base/40">
                <form onSubmit={handleDemoSearch} className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-text-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter city or coordinates (e.g., Chennai, Paris, 13.08, 80.27)"
                      className="w-full rounded-xl bg-bg-surface border border-border-default py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                    />
                  </div>
                  <PremiumButton
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={isSearching}
                    icon={<Compass className="w-4 h-4" />}
                  >
                    Query Engine
                  </PremiumButton>
                </form>
              </div>

              {/* Live JSON Response Visualization */}
              <div className="p-4 sm:p-6 font-mono text-xs sm:text-sm overflow-x-auto bg-bg-surface space-y-2">
                <div className="text-text-muted">// HTTP 200 OK — Live Geocode & Routing Result</div>
                <pre className="text-accent-purple/90 leading-relaxed select-all">
{`{
  "status": "success",
  "query": "${searchQuery}",
  "resolved_address": "${demoResult.address}",
  "coordinates": {
    "latitude": ${demoResult.lat.toFixed(4)},
    "longitude": ${demoResult.lng.toFixed(4)}
  },
  "routing_capabilities": {
    "engine": "OSRM / Contraction Hierarchies",
    "turn_by_turn": true,
    "vector_overlay": true
  },
  "execution_time_ms": ${demoResult.latency}
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CORE CAPABILITIES / FEATURE GRID --- */}
      <section id="features" className="py-20 border-t border-border-subtle bg-bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3 select-none">
            <Badge variant="accent" size="sm">
              Engine Capabilities
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
              Engineered for speed, built for scale
            </h2>
            <p className="text-sm sm:text-base text-text-secondary">
              Everything you need to power spatial search, routing calculation, and waypoint authorization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-bg-surface border border-border-subtle hover:border-border-default rounded-2xl p-6 transition-all duration-200 hover:-translate-y-[1px] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-accent-purple-muted border border-accent-purple/20 flex items-center justify-center text-accent-purple">
                <Navigation className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Sub-10ms Routing</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                High-performance OSRM graph routing algorithms computing distance, duration, and GeoJSON lines in single-digit milliseconds.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-bg-surface border border-border-subtle hover:border-border-default rounded-2xl p-6 transition-all duration-200 hover:-translate-y-[1px] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Forward & Reverse Geocode</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Search locations by address query or resolve exact coordinates into structured street names and bounding boxes.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-bg-surface border border-border-subtle hover:border-border-default rounded-2xl p-6 transition-all duration-200 hover:-translate-y-[1px] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-status-warning/10 border border-status-warning/20 flex items-center justify-center text-status-warning">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Waypoint Key Governance</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                SHA-256 hashed API keys with prefix tracking, dynamic usage metering, and one-click token revocation.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-bg-surface border border-border-subtle hover:border-border-default rounded-2xl p-6 transition-all duration-200 hover:-translate-y-[1px] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-status-success/10 border border-status-success/20 flex items-center justify-center text-status-success">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary">100% Self-Hostable</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Zero proprietary lock-in. Run your own mapping cluster anywhere via Docker Compose, PostGIS, and OpenStreetMap data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- DEVELOPER API & CODE INTEGRATION SECTION --- */}
      <section id="api" className="py-20 border-t border-border-subtle bg-bg-base">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-5 space-y-6">
              <Badge variant="accent" size="sm">
                Developer Integration
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary leading-tight">
                Integrate geospatial routing in five lines of code
              </h2>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                Simple REST endpoints with standardized GeoJSON payloads. Authenticate with standard <code className="text-accent-purple font-mono text-xs bg-bg-elevated px-1.5 py-0.5 rounded">x-api-key</code> headers and enjoy predictable sub-millisecond execution.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <div className="p-1 rounded-md bg-status-success/10 text-status-success">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Standards-compliant RFC 7946 GeoJSON outputs</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <div className="p-1 rounded-md bg-status-success/10 text-status-success">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Instant waypoint authorization with SHA-256 tokens</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <div className="p-1 rounded-md bg-status-success/10 text-status-success">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>High-concurrency Node.js & OSRM worker pipeline</span>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/dashboard/keys">
                  <PremiumButton variant="secondary" size="md" icon={<Key className="w-4 h-4" />}>
                    Manage API Keys
                  </PremiumButton>
                </Link>
              </div>
            </div>

            {/* Right Tabbed Code Block */}
            <div className="lg:col-span-7 bg-bg-surface border border-border-default rounded-2xl shadow-xl overflow-hidden">
              {/* Tab Header */}
              <div className="px-4 py-3 bg-bg-elevated border-b border-border-subtle flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveCodeTab("curl")}
                    className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
                      activeCodeTab === "curl"
                        ? "bg-bg-surface text-text-primary border border-border-subtle"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setActiveCodeTab("typescript")}
                    className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
                      activeCodeTab === "typescript"
                        ? "bg-bg-surface text-text-primary border border-border-subtle"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setActiveCodeTab("python")}
                    className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
                      activeCodeTab === "python"
                        ? "bg-bg-surface text-text-primary border border-border-subtle"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    Python
                  </button>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors p-1"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-status-success" />
                      <span className="text-status-success font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Content */}
              <div className="p-5 font-mono text-xs sm:text-sm text-text-primary overflow-x-auto bg-bg-base/90 leading-relaxed">
                <pre className="text-text-secondary">
                  <code>{codeSnippets[activeCodeTab]}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TELEMETRY & ARCHITECTURE SECTION --- */}
      <section id="telemetry" className="py-20 border-t border-border-subtle bg-bg-surface/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2 select-none">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Built for resilient production workloads
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">
              Designed from first principles to deliver uncompromised throughput without proprietary lock-in.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-6 bg-bg-surface border border-border-subtle rounded-2xl text-center space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-accent-purple tracking-tight">
                &lt; 18ms
              </div>
              <div className="text-xs font-semibold text-text-primary">P99 Route Latency</div>
              <div className="text-[11px] text-text-muted">OSRM multi-level Dijkstra</div>
            </div>

            <div className="p-6 bg-bg-surface border border-border-subtle rounded-2xl text-center space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-status-success tracking-tight">
                99.99%
              </div>
              <div className="text-xs font-semibold text-text-primary">Engine Availability</div>
              <div className="text-[11px] text-text-muted">Self-healing containers</div>
            </div>

            <div className="p-6 bg-bg-surface border border-border-subtle rounded-2xl text-center space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-accent-blue tracking-tight">
                100%
              </div>
              <div className="text-xs font-semibold text-text-primary">OpenStreetMap Data</div>
              <div className="text-[11px] text-text-muted">No per-tile billing surcharges</div>
            </div>

            <div className="p-6 bg-bg-surface border border-border-subtle rounded-2xl text-center space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                0
              </div>
              <div className="text-xs font-semibold text-text-primary">Vendor Lock-In</div>
              <div className="text-[11px] text-text-muted">Deploy anywhere in minutes</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- BOTTOM CTA --- */}
      <section className="py-20 border-t border-border-subtle bg-bg-base relative overflow-hidden">
        <div className="absolute inset-0 bg-accent-purple/5 pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <WaylineLogo size="lg" showText={false} className="mx-auto" />

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-primary">
            Start building with Wayline today
          </h2>
          <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
            Generate your waypoint API key and integrate production routing, geocoding, and map rendering in minutes.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="w-full sm:w-auto">
              <PremiumButton
                variant="primary"
                size="lg"
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto font-semibold"
              >
                Create Account & Key
              </PremiumButton>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <PremiumButton variant="secondary" size="lg" className="w-full sm:w-auto">
                Open Dashboard
              </PremiumButton>
            </Link>
          </div>
        </div>
      </section>

      {/* --- MINIMALIST DEVELOPER FOOTER --- */}
      <footer className="border-t border-border-subtle bg-bg-surface py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <WaylineLogo size="sm" showText={true} showTagline={true} />

          <div className="flex items-center gap-6 text-xs text-text-muted">
            <Link href="/dashboard" className="hover:text-text-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/keys" className="hover:text-text-primary transition-colors">
              API Keys
            </Link>
            <Link href="/login" className="hover:text-text-primary transition-colors">
              Login
            </Link>
          </div>

          <div className="text-xs text-text-muted select-none">
            © {new Date().getFullYear()} Wayline Geospatial. OpenStreetMap & OSRM native.
          </div>
        </div>
      </footer>
    </div>
  );
}