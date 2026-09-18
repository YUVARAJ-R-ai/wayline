"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search,
  Navigation,
  Compass,
  MapPin,
  ArrowRight,
  RotateCcw,
  Zap,
  Code2,
  Copy,
  Check,
  X,
  Layers,
  Layers2,
  ArrowUpDown,
} from "lucide-react";
import {
  WaylineLogo,
  PremiumButton,
  Badge,
  Toast,
} from "@/components/ui";

// Dynamically import Leaflet Map to avoid SSR window issues
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent-purple border-t-transparent animate-spin" />
        <span className="text-xs text-text-muted font-mono">Loading Wayline Map Engine...</span>
      </div>
    </div>
  ),
});

export default function HomePageClient() {
  // Navigation / Tab mode
  const [activeMode, setActiveMode] = useState<"search" | "route">("search");
  const [showApiInspector, setShowApiInspector] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.0843, 80.2705]);
  const [showStreets, setShowStreets] = useState(false);

  // Geocoding / Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    latency?: number;
  } | null>({
    lat: 13.0843,
    lng: 80.2705,
    address: "Chennai, Tamil Nadu, India",
    latency: 14,
  });

  // Routing state
  const [fromCoord, setFromCoord] = useState<[number, number] | null>(null);
  const [toCoord, setToCoord] = useState<[number, number] | null>(null);
  const [fromAddress, setFromAddress] = useState<string | null>(null);
  const [toAddress, setToAddress] = useState<string | null>(null);
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [routePoints, setRoutePoints] = useState<Array<[number, number]>>([]);
  const [routeStats, setRouteStats] = useState<{
    distanceKm: number;
    durationMin: number;
    latency?: number;
  } | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Last executed raw API telemetry
  const [lastApiCall, setLastApiCall] = useState<{
    endpoint: string;
    status: number;
    latencyMs: number;
    response: any;
  }>({
    endpoint: "GET /api/geocode?q=chennai",
    status: 200,
    latencyMs: 14,
    response: {
      status: "success",
      address: "Chennai, Tamil Nadu, India",
      lat: 13.0843,
      lng: 80.2705,
    },
  });

  // Execute Geocoding Search
  const handleSearch = async (queryToSearch?: string) => {
    const q = queryToSearch || searchQuery;
    if (!q.trim()) return;

    setSearchLoading(true);
    const start = performance.now();

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
      const latency = Math.round(performance.now() - start);
      const data = await res.json();

      setLastApiCall({
        endpoint: `GET /api/geocode?q=${encodeURIComponent(q.trim())}`,
        status: res.status,
        latencyMs: latency,
        response: data,
      });

      if (res.ok && data && typeof data.lat === "number" && typeof data.lng === "number") {
        const newLocation = {
          lat: data.lat,
          lng: data.lng,
          address: data.address || q,
          latency,
        };
        setSelectedLocation(newLocation);
        setMapCenter([data.lat, data.lng]);
        setToastMessage(`Found: ${data.address || q}`);
      } else {
        setToastMessage("Location not found. Try a different search.");
      }
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to connect to geocoding engine.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Execute Route Calculation
  const handleCalculateRoute = async (
    startCoord?: [number, number],
    endCoord?: [number, number]
  ) => {
    const start = startCoord || fromCoord;
    const end = endCoord || toCoord;

    if (!start || !end) {
      setRoutingError("Please select both start and destination points.");
      return;
    }

    setRoutingLoading(true);
    setRoutingError(null);
    const startPerf = performance.now();

    try {
      const url = `/api/route?from=${start[1]},${start[0]}&to=${end[1]},${end[0]}`;
      const res = await fetch(url);
      const latency = Math.round(performance.now() - startPerf);
      const data = await res.json();

      setLastApiCall({
        endpoint: `GET ${url}`,
        status: res.status,
        latencyMs: latency,
        response: data,
      });

      if (!res.ok) {
        throw new Error("Could not calculate a driving route between these coordinates.");
      }

      let leafletCoords: Array<[number, number]> = [];
      let distanceKm = 0;
      let durationMin = 0;

      if (data && data.coordinates) {
        leafletCoords = data.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        // Approximate distance if not in response
        const totalDist = leafletCoords.reduce((acc, curr, idx) => {
          if (idx === 0) return 0;
          const prev = leafletCoords[idx - 1];
          const dLat = (curr[0] - prev[0]) * 111;
          const dLng = (curr[1] - prev[1]) * 111 * Math.cos((curr[0] * Math.PI) / 180);
          return acc + Math.sqrt(dLat * dLat + dLng * dLng);
        }, 0);

        distanceKm = Math.round(totalDist * 10) / 10;
        durationMin = Math.max(1, Math.round((distanceKm / 40) * 60));
      } else if (data && data.routes && data.routes[0]) {
        const route = data.routes[0];
        if (route.geometry && route.geometry.coordinates) {
          leafletCoords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        }
        distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        durationMin = Math.round(route.duration / 60);
      }

      if (leafletCoords.length > 0) {
        setRoutePoints(leafletCoords);
        setRouteStats({
          distanceKm: distanceKm || 4.2,
          durationMin: durationMin || 8,
          latency,
        });
        setToastMessage(`Route calculated in ${latency}ms`);
      } else {
        throw new Error("No route geometry returned.");
      }
    } catch (err: any) {
      console.error(err);
      setRoutingError(err.message || "Failed to calculate route.");
    } finally {
      setRoutingLoading(false);
    }
  };

  // Map Click Handler: Click 1 -> Start, Click 2 -> Destination & Auto Route, Click 3 -> Reset
  const handleMapClick = async (latlng: { lat: number; lng: number }) => {
    const coord: [number, number] = [latlng.lat, latlng.lng];

    if (!fromCoord || (fromCoord && toCoord)) {
      // Step 1: Set Start Point
      setFromCoord(coord);
      setToCoord(null);
      setRoutePoints([]);
      setRouteStats(null);
      setFromQuery(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setFromAddress("Resolving address...");
      setActiveMode("route");

      try {
        const res = await fetch(`/api/reverse-geocode?lat=${latlng.lat}&lng=${latlng.lng}`);
        if (res.ok) {
          const data = await res.json();
          setFromAddress(data.address || `Location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`);
          setFromQuery(data.address || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
        }
      } catch {
        setFromAddress(`Location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`);
      }
    } else if (!toCoord) {
      // Step 2: Set Destination Point & Auto Calculate Route
      setToCoord(coord);
      setToQuery(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setToAddress("Resolving address...");

      let destAddress = `Location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`;
      try {
        const res = await fetch(`/api/reverse-geocode?lat=${latlng.lat}&lng=${latlng.lng}`);
        if (res.ok) {
          const data = await res.json();
          destAddress = data.address || destAddress;
          setToAddress(destAddress);
          setToQuery(destAddress);
        }
      } catch {
        setToAddress(destAddress);
      }

      // Automatically trigger route calculation
      handleCalculateRoute(fromCoord, coord);
    }
  };

  const handleClearRoute = () => {
    setFromCoord(null);
    setToCoord(null);
    setFromAddress(null);
    setToAddress(null);
    setFromQuery("");
    setToQuery("");
    setRoutePoints([]);
    setRouteStats(null);
    setRoutingError(null);
    setSelectedLocation(null);
  };

  const handleSwapDirections = () => {
    const tempCoord = fromCoord;
    const tempAddress = fromAddress;
    const tempQuery = fromQuery;

    setFromCoord(toCoord);
    setFromAddress(toAddress);
    setFromQuery(toQuery);

    setToCoord(tempCoord);
    setToAddress(tempAddress);
    setToQuery(tempQuery);

    if (toCoord && tempCoord) {
      handleCalculateRoute(toCoord, tempCoord);
    }
  };

  const handleCopyTelemetry = () => {
    navigator.clipboard.writeText(JSON.stringify(lastApiCall.response, null, 2));
    setCopiedText(true);
    setToastMessage("API response copied");
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-base font-sans antialiased text-text-primary select-none">
      {/* Toast Notification */}
      <Toast
        isOpen={Boolean(toastMessage)}
        message={toastMessage || ""}
        onClose={() => setToastMessage(null)}
      />

      {/* --- 1. FULL-SCREEN INTERACTIVE MAP VIEWPORT --- */}
      <div className="absolute inset-0 z-0">
        <Map
          center={mapCenter}
          markerPosition={
            activeMode === "search" && selectedLocation
              ? [selectedLocation.lat, selectedLocation.lng]
              : null
          }
          markerAddress={selectedLocation?.address}
          fromPosition={fromCoord}
          toPosition={toCoord}
          fromAddress={fromAddress}
          toAddress={toAddress}
          polyline={routePoints}
          onMapClick={handleMapClick}
          showStreets={showStreets}
        />
      </div>

      {/* --- 2. FLOATING TOP HEADER / NAVBAR --- */}
      <header className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex items-center justify-between">
        {/* Left Brand Badge */}
        <div className="pointer-events-auto flex items-center gap-3 bg-bg-surface/90 border border-border-default/80 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-lg">
          <Link href="/" className="focus:outline-none flex items-center gap-2">
            <WaylineLogo size="sm" showText={true} />
          </Link>
          <div className="hidden sm:block h-4 w-[1px] bg-border-subtle" />
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary font-medium">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            <span>OSRM Engine Live</span>
          </div>
        </div>

        {/* Right Nav Links & Actions */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-bg-surface/90 border border-border-default/80 backdrop-blur-md rounded-2xl p-1.5 shadow-lg">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-xl hover:bg-bg-elevated transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/keys"
            className="hidden sm:block px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-xl hover:bg-bg-elevated transition-colors"
          >
            API Keys
          </Link>
          <Link href="/login">
            <PremiumButton variant="primary" size="sm">
              Sign In
            </PremiumButton>
          </Link>
        </div>
      </header>

      {/* --- 3. FLOATING MAIN CONTROL ISLAND (LEFT PANEL) --- */}
      <div className="absolute top-20 left-4 z-20 w-[calc(100%-2rem)] sm:w-96 flex flex-col gap-3 pointer-events-auto max-h-[calc(100vh-6.5rem)] overflow-y-auto">
        <div className="bg-bg-surface/95 border border-border-default rounded-2xl shadow-2xl backdrop-blur-md p-4 sm:p-5 space-y-4">
          {/* Mode Switcher: Search vs Directions */}
          <div className="flex items-center bg-bg-base/80 p-1 rounded-xl border border-border-subtle text-xs font-semibold">
            <button
              onClick={() => setActiveMode("search")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeMode === "search"
                  ? "bg-bg-surface text-text-primary shadow-sm border border-border-subtle"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Location</span>
            </button>
            <button
              onClick={() => setActiveMode("route")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeMode === "route"
                  ? "bg-bg-surface text-accent-purple shadow-sm border border-border-subtle"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Directions</span>
            </button>
          </div>

          {/* TAB A: SEARCH LOCATION */}
          {activeMode === "search" && (
            <div className="space-y-3.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="relative"
              >
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city, address, or landmark..."
                  className="w-full rounded-xl bg-bg-base border border-border-default py-2.5 pl-10 pr-20 text-xs sm:text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="absolute right-1.5 top-1.5 px-3 py-1 bg-accent-purple text-btn-primary-text text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  {searchLoading ? "..." : "Go"}
                </button>
              </form>

              {/* Popular City Quick-Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-text-muted">Popular:</span>
                {["Chennai", "Paris", "London", "New York"].map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setSearchQuery(city);
                      handleSearch(city);
                    }}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-bg-elevated hover:bg-bg-base border border-border-subtle text-text-secondary transition-colors"
                  >
                    {city}
                  </button>
                ))}
              </div>

              {/* Resolved Location Card */}
              {selectedLocation && (
                <div className="p-3.5 bg-bg-base/80 border border-border-subtle rounded-xl space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-accent-purple-muted border border-accent-purple/20 text-accent-purple flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-text-primary line-clamp-2 leading-snug">
                        {selectedLocation.address}
                      </h4>
                      <p className="text-[11px] font-mono text-text-muted mt-0.5">
                        {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lng.toFixed(4)}° E
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-xs">
                    {selectedLocation.latency && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-status-success font-semibold">
                        <Zap className="w-3 h-3" /> {selectedLocation.latency}ms
                      </span>
                    )}

                    <button
                      onClick={() => {
                        setFromCoord([selectedLocation.lat, selectedLocation.lng]);
                        setFromAddress(selectedLocation.address);
                        setFromQuery(selectedLocation.address);
                        setActiveMode("route");
                        setToastMessage("Set as Start location. Click map for destination.");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent-purple hover:underline"
                    >
                      <span>Route from here</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB B: DIRECTIONS & ROUTING */}
          {activeMode === "route" && (
            <div className="space-y-3">
              {/* Origin / Destination Inputs */}
              <div className="space-y-2 relative">
                {/* From Input */}
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-success flex-shrink-0" />
                  <input
                    type="text"
                    value={fromQuery}
                    onChange={(e) => setFromQuery(e.target.value)}
                    placeholder="Click map or type start point..."
                    className="flex-1 rounded-xl bg-bg-base border border-border-default py-1.5 px-3 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple transition-all"
                  />
                </div>

                {/* To Input */}
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-error flex-shrink-0" />
                  <input
                    type="text"
                    value={toQuery}
                    onChange={(e) => setToQuery(e.target.value)}
                    placeholder="Click map or type destination..."
                    className="flex-1 rounded-xl bg-bg-base border border-border-default py-1.5 px-3 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple transition-all"
                  />
                </div>

                {/* Swap button */}
                <button
                  onClick={handleSwapDirections}
                  title="Swap start & destination"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-bg-elevated hover:bg-bg-surface border border-border-subtle rounded-md text-text-muted hover:text-text-primary transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <PremiumButton
                  variant="primary"
                  size="sm"
                  loading={routingLoading}
                  onClick={() => handleCalculateRoute()}
                  className="flex-1"
                  icon={<Navigation className="w-3.5 h-3.5" />}
                >
                  Calculate Route
                </PremiumButton>

                {(fromCoord || toCoord || routePoints.length > 0) && (
                  <button
                    onClick={handleClearRoute}
                    title="Reset points"
                    className="p-2 bg-bg-elevated hover:bg-status-error/10 hover:text-status-error border border-border-subtle rounded-xl text-text-muted transition-colors text-xs flex items-center justify-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {routingError && (
                <div className="p-2.5 bg-status-error/10 border border-status-error/20 text-status-error rounded-xl text-xs font-medium">
                  {routingError}
                </div>
              )}

              {/* Interactive Clicking Helper Note */}
              {!routeStats && !routingError && (
                <div className="p-2.5 bg-bg-elevated/50 border border-border-subtle rounded-xl text-[11px] text-text-muted flex items-center gap-2">
                  <Compass className="w-4 h-4 text-accent-purple flex-shrink-0" />
                  <span>
                    Tip: Click directly on the map to set <strong>Start (1st click)</strong> and{" "}
                    <strong>Destination (2nd click)</strong>.
                  </span>
                </div>
              )}

              {/* Calculated Route Results Card */}
              {routeStats && (
                <div className="p-3.5 bg-bg-base/90 border border-border-subtle rounded-xl space-y-2 animate-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-text-primary">
                        {routeStats.durationMin} mins
                      </div>
                      <div className="text-xs text-text-secondary font-medium">
                        {routeStats.distanceKm} km driving distance
                      </div>
                    </div>

                    <Badge variant="success" size="sm">
                      FASTEST ROUTE
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <span>Engine: OSRM Graph</span>
                    {routeStats.latency && (
                      <span className="text-status-success font-semibold">
                        ⚡ {routeStats.latency}ms
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Street Overlay Toggle */}
          <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-text-muted" />
              <span>Street Grid Overlay</span>
            </span>
            <button
              onClick={() => setShowStreets(!showStreets)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors ${
                showStreets
                  ? "bg-accent-purple text-btn-primary-text border-transparent"
                  : "bg-bg-elevated text-text-muted border-border-subtle hover:text-text-primary"
              }`}
            >
              {showStreets ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>

      {/* --- 4. FLOATING BOTTOM DEVELOPER API INSPECTOR PILL --- */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
        <button
          onClick={() => setShowApiInspector(!showApiInspector)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-semibold border shadow-lg backdrop-blur-md transition-all ${
            showApiInspector
              ? "bg-accent-purple text-btn-primary-text border-accent-purple shadow-accent-purple/20"
              : "bg-bg-surface/90 text-text-secondary hover:text-text-primary border-border-default hover:bg-bg-elevated"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>API Inspector</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-current font-bold">
            {lastApiCall.latencyMs}ms
          </span>
        </button>
      </div>

      {/* --- 5. COLLAPSIBLE API INSPECTOR DRAWER --- */}
      {showApiInspector && (
        <div className="absolute bottom-16 left-4 right-4 sm:right-auto sm:w-[480px] z-30 bg-bg-surface border border-border-default rounded-2xl shadow-2xl p-4 space-y-3 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-success" />
              <span className="text-xs font-mono font-bold text-text-primary">
                {lastApiCall.endpoint}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTelemetry}
                title="Copy JSON response"
                className="p-1 text-text-muted hover:text-text-primary rounded"
              >
                {copiedText ? (
                  <Check className="w-3.5 h-3.5 text-status-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => setShowApiInspector(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-bg-base rounded-xl font-mono text-[11px] text-accent-purple/90 overflow-x-auto max-h-48 border border-border-subtle select-all">
            <pre>{JSON.stringify(lastApiCall.response, null, 2)}</pre>
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted font-mono pt-1">
            <span>Status: {lastApiCall.status} OK</span>
            <span>Latency: {lastApiCall.latencyMs} ms</span>
          </div>
        </div>
      )}
    </div>
  );
}