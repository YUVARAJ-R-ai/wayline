"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Navigation,
  MapPin,
  Car,
  Footprints,
  Bike,
  Bus,
  Search,
  Crosshair,
  ArrowUpDown,
  History,
  Info,
  Layers,
  Trash2,
  Copy,
  Download,
  Key,
  ArrowRight,
  Loader2,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import { PremiumButton, Badge, Toast } from "@/components/ui";

// Dynamically import Leaflet Map to prevent SSR window issues
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-bg-surface flex flex-col items-center justify-center text-text-muted gap-3 rounded-2xl select-none min-h-[500px]">
      <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
      <span className="text-xs font-mono tracking-wide">Initializing Spatial Engine...</span>
    </div>
  ),
});

// Haversine formula to compute total route distance in km from polyline points
function calculateDistance(coords: [number, number][]): number {
  let total = 0;
  const R = 6371;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return total;
}

export type RoutingProfile = "car" | "foot" | "bike" | "bus";

// Dynamic Speed & Duration Calculator
function getDurationForProfile(distanceKm: number, profile: RoutingProfile): number {
  if (profile === "foot") {
    return Math.max(1, Math.round((distanceKm / 4.8) * 60)); // ~4.8 km/h walking
  }
  if (profile === "bike") {
    return Math.max(1, Math.round((distanceKm / 15) * 60)); // ~15 km/h cycling
  }
  if (profile === "bus") {
    return Math.max(2, Math.round((distanceKm / 22) * 60) + 4); // ~22 km/h bus transit + dwell
  }
  return Math.max(1, Math.round((distanceKm / 42) * 60)); // ~42 km/h driving
}

interface CheckpointItem {
  id: string;
  query: string;
  coord: [number, number] | null;
  address: string | null;
}

interface RecentRouteItem {
  id: string;
  fromName: string;
  toName: string;
  fromCoord: [number, number];
  toCoord: [number, number];
  timestamp: number;
}

export default function RoutingMap() {
  // Mode: "route" vs "geocode"
  const [activeTab, setActiveTab] = useState<"route" | "geocode">("route");
  const [routingProfile, setRoutingProfile] = useState<RoutingProfile>("car");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  // Routing Origin, Destination, and Checkpoints
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromCoord, setFromCoord] = useState<[number, number] | null>(null);
  const [toCoord, setToCoord] = useState<[number, number] | null>(null);
  const [fromAddress, setFromAddress] = useState<string | null>(null);
  const [toAddress, setToAddress] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>([]);

  const [routePoints, setRoutePoints] = useState<Array<[number, number]>>([]);
  const [info, setInfo] = useState<{ distance: number; duration: number; latency?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recent History
  const [recentRoutes, setRecentRoutes] = useState<RecentRouteItem[]>([]);

  // Geocode Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    latency?: number;
  } | null>(null);

  // Configuration & Overlays
  const [apiKey, setApiKey] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showStreets, setShowStreets] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.0843, 80.2705]);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";

  // Load API Key and Recent Routes from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = window.localStorage.getItem("wayline_api_key") || "";
      setApiKey(savedKey);

      try {
        const savedHistory = window.localStorage.getItem("wayline_recent_routes");
        if (savedHistory) {
          setRecentRoutes(JSON.parse(savedHistory));
        }
      } catch {
        // ignore parse error
      }
    }
  }, []);

  const saveToHistory = (item: Omit<RecentRouteItem, "id" | "timestamp">) => {
    const newItem: RecentRouteItem = {
      ...item,
      id: `${item.fromCoord.join(",")}-${item.toCoord.join(",")}-${Date.now()}`,
      timestamp: Date.now(),
    };

    setRecentRoutes((prev) => {
      const filtered = prev.filter(
        (r) =>
          !(
            r.fromCoord[0] === item.fromCoord[0] &&
            r.fromCoord[1] === item.fromCoord[1] &&
            r.toCoord[0] === item.toCoord[0] &&
            r.toCoord[1] === item.toCoord[1]
          )
      );
      const updated = [newItem, ...filtered].slice(0, 6);
      try {
        window.localStorage.setItem("wayline_recent_routes", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setRecentRoutes([]);
    try {
      window.localStorage.removeItem("wayline_recent_routes");
    } catch {
      // ignore
    }
    setToastMessage("Cleared recent route history");
  };

  const handleSaveApiKey = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("wayline_api_key", apiKey.trim());
      setSaveSuccess(true);
      setToastMessage("API key saved for live requests");
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  // Instant Switch Profile & Recalculate Time on Click
  const handleProfileChange = (newProfile: RoutingProfile) => {
    setRoutingProfile(newProfile);
    if (info && info.distance > 0) {
      const newDuration = getDurationForProfile(info.distance, newProfile);
      setInfo((prev) => (prev ? { ...prev, duration: newDuration } : null));
      const profileName =
        newProfile === "car"
          ? "Driving"
          : newProfile === "foot"
          ? "Walking"
          : newProfile === "bike"
          ? "Bicycle"
          : "Transit / Bus";
      setToastMessage(`${profileName} time: ~${newDuration} min`);
    }
  };

  // Checkpoints management
  const handleAddCheckpoint = () => {
    if (checkpoints.length >= 5) {
      setToastMessage("Maximum 5 intermediate checkpoints reached.");
      return;
    }
    const newCheckpoint: CheckpointItem = {
      id: `cp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      query: "",
      coord: null,
      address: null,
    };
    setCheckpoints((prev) => [...prev, newCheckpoint]);
    setRoutePoints([]);
    setInfo(null);
  };

  const handleRemoveCheckpoint = (id: string) => {
    setCheckpoints((prev) => prev.filter((c) => c.id !== id));
    setRoutePoints([]);
    setInfo(null);
  };

  const handleCheckpointChange = (id: string, value: string) => {
    setCheckpoints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, query: value, coord: null, address: null } : c))
    );
    setRoutePoints([]);
    setInfo(null);
  };

  // Map Click Handler: Set Origin -> Checkpoints -> Destination
  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    const coords: [number, number] = [latlng.lat, latlng.lng];
    const formatted = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;

    // Clear stale route whenever map points change
    setRoutePoints([]);
    setInfo(null);

    if (!fromCoord) {
      setFromCoord(coords);
      setFromAddress(formatted);
      setFromQuery(formatted);
      setToastMessage("Origin set. Click map for destination.");
    } else if (!toCoord) {
      setToCoord(coords);
      setToAddress(formatted);
      setToQuery(formatted);
      setToastMessage("Destination set. Click 'Calculate Route' to navigate.");
    } else {
      // If both were set, start a fresh route selection with new origin
      setFromCoord(coords);
      setFromAddress(formatted);
      setFromQuery(formatted);
      setToCoord(null);
      setToAddress(null);
      setToQuery("");
      setCheckpoints([]);
      setToastMessage("New origin set. Click map for destination.");
    }
  };

  // Swap Origin and Destination
  const handleSwapDirections = () => {
    const tempQ = fromQuery;
    const tempC = fromCoord;
    const tempA = fromAddress;

    setFromQuery(toQuery);
    setFromCoord(toCoord);
    setFromAddress(toAddress);

    setToQuery(tempQ);
    setToCoord(tempC);
    setToAddress(tempA);

    setRoutePoints([]);
    setInfo(null);
    setToastMessage("Swapped Origin and Destination");
  };

  // Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setToastMessage("Geolocation is not supported by your browser.");
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setFromCoord(coords);
        setMapCenter(coords);
        setLocatingUser(false);

        const latLngStr = `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`;
        setFromQuery(latLngStr);
        setFromAddress(latLngStr);
        setToastMessage("Current location detected as origin");

        try {
          const res = await fetch(`/api/geocode?q=${coords[0]},${coords[1]}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              setFromAddress(data.address);
              setFromQuery(data.address);
            }
          }
        } catch {
          // fallback
        }
      },
      (err) => {
        setLocatingUser(false);
        setToastMessage(`GPS: ${err.message}`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Export GeoJSON
  const handleExportGeoJson = () => {
    if (routePoints.length === 0) {
      setToastMessage("No active route to export.");
      return;
    }

    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: `${fromAddress || "Start"} to ${toAddress || "Destination"}`,
            distanceKm: info?.distance,
            durationMin: info?.duration,
            profile: routingProfile,
            checkpoints: checkpoints.map((c) => c.address || c.query),
            engine: "Wayline OSRM Graph",
            createdAt: new Date().toISOString(),
          },
          geometry: {
            type: "LineString",
            coordinates: routePoints.map((c) => [c[1], c[0]]),
          },
        },
      ],
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wayline-route-${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMessage("Exported GeoJSON");
  };

  // Copy Route Coordinates
  const handleCopyCoordinates = () => {
    if (routePoints.length === 0) {
      setToastMessage("No route coordinates.");
      return;
    }
    navigator.clipboard.writeText(JSON.stringify(routePoints));
    setToastMessage(`Copied ${routePoints.length} waypoints`);
  };

  // Multi-waypoint routing executor
  const fetchRouteMulti = async (points: Array<[number, number]>) => {
    if (points.length < 2) return;
    setLoading(true);
    setError(null);

    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      headers["x-api-key"] = apiKey.trim();
    }

    const startPerf = performance.now();
    try {
      let combinedPolyline: Array<[number, number]> = [];
      let totalDistanceKm = 0;
      let lastResp: any = null;
      let lastStatus = 200;

      // Calculate each leg between sequential stops
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        const url = `${apiBaseUrl}/api/route?from=${start[1]},${start[0]}&to=${end[1]},${end[0]}`;
        const routeRes = await fetch(url, { headers });
        lastStatus = routeRes.status;

        if (!routeRes.ok) {
          throw new Error(`Could not calculate route leg #${i + 1}.`);
        }

        const responseData = await routeRes.json();
        lastResp = responseData;

        let legCoords: Array<[number, number]> = [];
        if (responseData && responseData.routes && responseData.routes[0]) {
          const routeObj = responseData.routes[0];
          if (routeObj.geometry && routeObj.geometry.coordinates) {
            legCoords = routeObj.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          }
          if (typeof routeObj.distance === "number") {
            totalDistanceKm += routeObj.distance / 1000;
          }
        } else if (responseData && responseData.coordinates) {
          legCoords = responseData.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          if (typeof responseData.distance === "number") {
            totalDistanceKm += responseData.distance > 1000 ? responseData.distance / 1000 : responseData.distance;
          }
        }

        if (legCoords.length > 0) {
          combinedPolyline = combinedPolyline.concat(legCoords);
        }
      }

      const latency = Math.round(performance.now() - startPerf);

      if (combinedPolyline.length > 0) {
        setRoutePoints(combinedPolyline);
        if (totalDistanceKm === 0) {
          totalDistanceKm = calculateDistance(combinedPolyline);
        }
        const durationMin = getDurationForProfile(totalDistanceKm, routingProfile);

        setInfo({ distance: totalDistanceKm, duration: durationMin, latency });
        setToastMessage(`Route calculated in ${latency}ms`);

        // Save to Recent History
        saveToHistory({
          fromName: fromAddress || `${points[0][0].toFixed(4)}, ${points[0][1].toFixed(4)}`,
          toName: toAddress || `${points[points.length - 1][0].toFixed(4)}, ${points[points.length - 1][1].toFixed(4)}`,
          fromCoord: points[0],
          toCoord: points[points.length - 1],
        });
      } else {
        throw new Error("Route geometry not found in response.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Route calculation error.");
    } finally {
      setLoading(false);
    }
  };

  // Resolve all inputs (Origin + Checkpoints + Destination) and calculate route
  const handleGetRoute = async () => {
    if (!fromQuery.trim() || !toQuery.trim()) {
      setError("Please enter both starting and destination addresses.");
      return;
    }

    setLoading(true);
    setError(null);

    let activeFrom = fromCoord;
    let activeTo = toCoord;
    let activeFromAddress = fromAddress;
    let activeToAddress = toAddress;

    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      headers["x-api-key"] = apiKey.trim();
    }

    try {
      // 1. Resolve Origin
      if (!activeFrom || fromQuery !== activeFromAddress) {
        const res = await fetch(`${apiBaseUrl}/api/geocode?q=${encodeURIComponent(fromQuery)}`, { headers });
        if (!res.ok) throw new Error("Failed to resolve start address");
        const data = await res.json();
        if (data && typeof data.lat === "number" && typeof data.lng === "number") {
          activeFrom = [data.lat, data.lng];
          activeFromAddress = data.address || fromQuery;
          setFromCoord(activeFrom);
          setFromAddress(activeFromAddress);
          setFromQuery(activeFromAddress || "");
        }
      }

      // 2. Resolve intermediate checkpoints
      const resolvedCheckpoints: CheckpointItem[] = [];
      for (const cp of checkpoints) {
        if (cp.query.trim()) {
          let cpCoord = cp.coord;
          let cpAddress = cp.address;
          if (!cpCoord || cp.query !== cpAddress) {
            const res = await fetch(`${apiBaseUrl}/api/geocode?q=${encodeURIComponent(cp.query)}`, { headers });
            if (res.ok) {
              const data = await res.json();
              if (data && typeof data.lat === "number" && typeof data.lng === "number") {
                cpCoord = [data.lat, data.lng];
                cpAddress = data.address || cp.query;
              }
            }
          }
          resolvedCheckpoints.push({ ...cp, coord: cpCoord, address: cpAddress });
        }
      }
      setCheckpoints(resolvedCheckpoints);

      // 3. Resolve Destination
      if (!activeTo || toQuery !== activeToAddress) {
        const res = await fetch(`${apiBaseUrl}/api/geocode?q=${encodeURIComponent(toQuery)}`, { headers });
        if (!res.ok) throw new Error("Failed to resolve destination address");
        const data = await res.json();
        if (data && typeof data.lat === "number" && typeof data.lng === "number") {
          activeTo = [data.lat, data.lng];
          activeToAddress = data.address || toQuery;
          setToCoord(activeTo);
          setToAddress(activeToAddress);
          setToQuery(activeToAddress || "");
        }
      }

      if (activeFrom && activeTo) {
        const validCpCoords = resolvedCheckpoints
          .map((c) => c.coord)
          .filter(Boolean) as [number, number][];
        await fetchRouteMulti([activeFrom, ...validCpCoords, activeTo]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while resolving locations.");
      setLoading(false);
    }
  };

  // Geocode Search Single Query
  const handleSearchLocation = async (queryText?: string) => {
    const q = queryText || searchQuery;
    if (!q.trim()) return;

    setSearchLoading(true);
    const startPerf = performance.now();

    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      headers["x-api-key"] = apiKey.trim();
    }

    try {
      const url = `${apiBaseUrl}/api/geocode?q=${encodeURIComponent(q.trim())}`;
      const res = await fetch(url, { headers });
      const latency = Math.round(performance.now() - startPerf);

      if (!res.ok) throw new Error("Location not found");
      const data = await res.json();

      if (data && typeof data.lat === "number" && typeof data.lng === "number") {
        const coords: [number, number] = [data.lat, data.lng];
        setSelectedLocation({
          lat: data.lat,
          lng: data.lng,
          address: data.address || q,
          latency,
        });
        setMapCenter(coords);
        setToastMessage(`Located: ${data.address || q}`);
      } else {
        throw new Error("No coordinates returned.");
      }
    } catch (err: any) {
      setToastMessage(err.message || "Search error");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClear = () => {
    setFromCoord(null);
    setToCoord(null);
    setFromAddress(null);
    setToAddress(null);
    setFromQuery("");
    setToQuery("");
    setCheckpoints([]);
    setRoutePoints([]);
    setInfo(null);
    setError(null);
    setSelectedLocation(null);
    setToastMessage("Routing canvas reset");
  };

  return (
    <div className="flex flex-col gap-4 select-none animate-in fade-in duration-150">
      <Toast
        isOpen={Boolean(toastMessage)}
        message={toastMessage || ""}
        onClose={() => setToastMessage(null)}
      />

      {/* Main Sandbox Grid: 1 Col Left, 2 Cols Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (1 Col): Route Box + GCC Box + History */}
        <div className="space-y-4">
          
          {/* 1. Route & Navigation Box */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-4 shadow-sm space-y-4">
            
            {/* Header & Mode Switcher */}
            <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-accent-purple" />
                Route & Navigation Engine
              </span>
              <span className="text-[10px] text-text-muted font-mono">
                OSRM Gateway
              </span>
            </div>

            {/* Profile Switcher: Driving, Walking, Bicycle, Transit/Bus */}
            <div className="grid grid-cols-4 gap-1 bg-bg-base/70 p-1 rounded-xl border border-border-subtle text-xs">
              <button
                type="button"
                onClick={() => handleProfileChange("car")}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors ${
                  routingProfile === "car"
                    ? "bg-bg-elevated text-accent-purple font-semibold border border-border-subtle shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
                title="Driving profile (~42 km/h)"
              >
                <Car className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[11px]">Driving</span>
              </button>
              <button
                type="button"
                onClick={() => handleProfileChange("foot")}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors ${
                  routingProfile === "foot"
                    ? "bg-bg-elevated text-accent-purple font-semibold border border-border-subtle shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
                title="Walking profile (~4.8 km/h)"
              >
                <Footprints className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[11px]">Walking</span>
              </button>
              <button
                type="button"
                onClick={() => handleProfileChange("bike")}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors ${
                  routingProfile === "bike"
                    ? "bg-bg-elevated text-accent-purple font-semibold border border-border-subtle shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
                title="Bicycle profile (~15 km/h)"
              >
                <Bike className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[11px]">Bicycle</span>
              </button>
              <button
                type="button"
                onClick={() => handleProfileChange("bus")}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors ${
                  routingProfile === "bus"
                    ? "bg-bg-elevated text-accent-purple font-semibold border border-border-subtle shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
                title="Bus & Transit profile (~22 km/h + dwell)"
              >
                <Bus className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[11px]">Bus</span>
              </button>
            </div>
          </div>

          {/* DIRECTIONS & ROUTING WITH MULTI-STOP CHECKPOINTS */}
          <div className="space-y-3">
            <div className="space-y-2 relative">
                
                {/* 1. Origin Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-text-secondary flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-status-success inline-block" />
                      <span>Origin</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      disabled={locatingUser}
                      className="text-[10px] text-accent-purple hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Crosshair className={`w-3 h-3 ${locatingUser ? "animate-spin" : ""}`} />
                      <span>{locatingUser ? "Locating..." : "Locate Me"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Click map or enter start..."
                    value={fromQuery}
                    onChange={(e) => setFromQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGetRoute()}
                    className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors"
                  />
                </div>

                {/* 2. Dynamic Intermediate Checkpoints */}
                {checkpoints.map((cp, idx) => (
                  <div key={cp.id} className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="font-semibold text-status-warning flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-status-warning inline-block" />
                        <span>Stop #{idx + 1}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveCheckpoint(cp.id)}
                        className="text-[10px] text-text-muted hover:text-status-error flex items-center gap-0.5"
                        title="Remove checkpoint"
                      >
                        <X className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder={`Enter Stop #${idx + 1} address or location...`}
                      value={cp.query}
                      onChange={(e) => handleCheckpointChange(cp.id, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGetRoute()}
                      className="w-full rounded-xl bg-bg-base border border-status-warning/40 py-2 px-3 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-status-warning transition-colors"
                    />
                  </div>
                ))}

                {/* Add Checkpoint Button */}
                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={handleAddCheckpoint}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-purple hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Checkpoint ({checkpoints.length}/5)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSwapDirections}
                    title="Swap start and destination"
                    className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1 font-medium"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Swap Ends</span>
                  </button>
                </div>

                {/* 3. Destination Input */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-text-secondary flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-status-error inline-block" />
                      <span>Destination</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Click map or enter destination..."
                    value={toQuery}
                    onChange={(e) => setToQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGetRoute()}
                    className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors"
                  />
                </div>
              </div>

              {/* Primary Actions Inside Control Panel */}
              <div className="flex items-center gap-2 pt-1">
                <PremiumButton
                  variant="primary"
                  size="sm"
                  loading={loading}
                  onClick={handleGetRoute}
                  className="flex-1 justify-center py-2 text-xs"
                  icon={<Navigation className="w-3.5 h-3.5" />}
                >
                  Calculate Route
                </PremiumButton>
                <button
                  onClick={handleClear}
                  disabled={loading || (!fromCoord && !toCoord && !fromQuery && !toQuery)}
                  className="bg-bg-base hover:bg-bg-elevated text-text-primary border border-border-default disabled:opacity-40 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
                  title="Clear all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Streamlined API Key Strip */}
              <div className="bg-bg-base/50 p-2.5 rounded-xl border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Key className="h-3 w-3 text-text-muted" />
                    <span>API Key Override</span>
                  </span>
                  <button
                    onClick={handleSaveApiKey}
                    className="text-[10px] text-accent-purple hover:underline font-semibold"
                  >
                    {saveSuccess ? "Saved" : "Save"}
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Default session key active (or custom key)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-lg bg-bg-surface border border-border-default px-2.5 py-1 text-xs text-text-primary outline-none focus:border-accent-purple font-mono placeholder:text-[10px] placeholder:text-text-muted/60"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-status-error/10 border border-status-error/20 text-status-error rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* GCC Official Road Network GIS Layer Card */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-accent-purple/15 text-accent-purple">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary">GCC Road Network</h4>
                  <p className="text-[10px] text-text-muted">111,641 Polylines · WGS84</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !showStreets;
                  setShowStreets(next);
                  setToastMessage(next ? "GCC Road Network Overlay: Active" : "GCC Road Network: Hidden");
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  showStreets
                    ? "bg-accent-purple text-btn-primary-text border-accent-purple shadow-sm ring-2 ring-accent-purple/20"
                    : "bg-bg-base text-text-muted border-border-subtle hover:text-text-primary"
                }`}
              >
                {showStreets ? "LAYER ON" : "LAYER OFF"}
              </button>
            </div>

            {/* Road Hierarchy Symbology Legend */}
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted flex items-center justify-between">
                <span>Vector Symbology</span>
                <span className="text-accent-purple font-mono">QGIS Matched</span>
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-bg-base border border-border-subtle text-text-secondary">
                  <span className="w-2.5 h-1 rounded-full bg-[#f59e0b] flex-shrink-0" />
                  <span className="truncate">Trunk / Motorway</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-bg-base border border-border-subtle text-text-secondary">
                  <span className="w-2.5 h-1 rounded-full bg-[#38bdf8] flex-shrink-0" />
                  <span className="truncate">Primary Roads</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-bg-base border border-border-subtle text-text-secondary">
                  <span className="w-2.5 h-1 rounded-full bg-[#22c55e] flex-shrink-0" />
                  <span className="truncate">Secondary Avenues</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-bg-base border border-border-subtle text-text-secondary">
                  <span className="w-2.5 h-1 rounded-full bg-[#e11d48] flex-shrink-0" />
                  <span className="truncate">Local / Residential</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Queries / Route History Card */}
          {recentRoutes.length > 0 && (
            <div className="bg-bg-surface border border-border-default rounded-2xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted flex items-center gap-1">
                  <History className="w-3 h-3 text-accent-purple" /> Recent Queries
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-[10px] text-text-muted hover:text-status-error transition-colors font-medium"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1.5">
                {recentRoutes.slice(0, 4).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setFromCoord(r.fromCoord);
                      setToCoord(r.toCoord);
                      setFromAddress(r.fromName);
                      setToAddress(r.toName);
                      setFromQuery(r.fromName);
                      setToQuery(r.toName);
                      setCheckpoints([]);
                      fetchRouteMulti([r.fromCoord, r.toCoord]);
                    }}
                    className="w-full text-left p-2 rounded-xl bg-bg-base hover:bg-bg-elevated border border-border-subtle text-[11px] text-text-secondary hover:text-text-primary transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate max-w-[210px] group-hover:text-accent-purple transition-colors">
                      {r.fromName.split(",")[0]} → {r.toName.split(",")[0]}
                    </span>
                    <ArrowRight className="w-3 h-3 text-text-muted group-hover:text-accent-purple group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Map Canvas & Live Inspector (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Map Container with Ambient Highlight */}
          <div className="h-[560px] w-full rounded-2xl overflow-hidden border border-border-default/90 ring-1 ring-accent-purple/20 shadow-xl shadow-black/10 relative bg-bg-surface">
            <Map
              center={mapCenter}
              markerPosition={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : null}
              markerAddress={selectedLocation?.address}
              fromPosition={fromCoord}
              toPosition={toCoord}
              fromAddress={fromAddress}
              toAddress={toAddress}
              checkpoints={checkpoints
                .filter((c) => c.coord !== null)
                .map((c) => ({ lat: c.coord![0], lng: c.coord![1], label: c.address || c.query }))}
              polyline={routePoints}
              onMapClick={handleMapClick}
              showStreets={showStreets}
              apiKey={apiKey}
            />

            {/* Top Left Floating Status Indicator */}
            <div className="absolute top-3.5 left-3.5 z-[400] flex items-center gap-2 pointer-events-auto select-none">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-surface/90 backdrop-blur-md border border-border-default/80 text-[11px] font-semibold text-text-primary shadow-sm">
                <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                <span>
                  {routingProfile === "car"
                    ? "Driving Network"
                    : routingProfile === "foot"
                    ? "Pedestrian Paths"
                    : routingProfile === "bike"
                    ? "Cycling Grid"
                    : "Transit / Bus"}
                </span>
                {showStreets && (
                  <span className="text-[10px] text-accent-purple bg-accent-purple-muted px-1.5 py-0.5 rounded font-mono">
                    Vectors Active
                  </span>
                )}
              </div>
            </div>

            {/* Floating Quick Action & Status Controls */}
            <div className="absolute top-3.5 right-3.5 z-[400] flex items-center gap-2 pointer-events-auto">
              <button
                onClick={handleClear}
                disabled={!fromCoord && !toCoord && !fromQuery && !toQuery && !selectedLocation && routePoints.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-default text-xs font-semibold bg-bg-surface/90 text-text-secondary hover:text-status-error hover:border-status-error/40 disabled:opacity-40 backdrop-blur-md transition-all shadow-sm"
                title="Clear all points, route, and search pins from the map"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Map</span>
              </button>
              <button
                onClick={() => setMapCenter([13.0843, 80.2705])}
                className="px-3 py-1.5 rounded-xl border border-border-default text-xs font-semibold bg-bg-surface/90 text-text-secondary hover:text-text-primary backdrop-blur-md transition-all shadow-sm"
                title="Reset map view to Chennai center"
              >
                Reset View
              </button>
            </div>

            {/* Bottom Floating Coordinate Bar */}
            <div className="absolute bottom-3.5 left-3.5 z-[400] hidden sm:flex items-center gap-2 pointer-events-none select-none">
              <div className="px-2.5 py-1 rounded-lg bg-bg-surface/85 backdrop-blur-md border border-border-subtle text-[10px] font-mono text-text-muted shadow-sm">
                Click map to select Origin / Destination
              </div>
            </div>
          </div>

          {/* Results Summary Bar */}
          {info && (
            <div className="p-4 bg-bg-surface border border-border-default rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-accent-purple" />
                  Route Summary
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="accent" size="sm">
                    {routingProfile === "car"
                      ? "Driving"
                      : routingProfile === "foot"
                      ? "Walking"
                      : routingProfile === "bike"
                      ? "Bicycle"
                      : "Transit / Bus"}
                  </Badge>
                  {info.latency && (
                    <span className="font-mono text-[11px] text-text-muted font-medium">
                      Calculated in {info.latency}ms
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <div className="bg-bg-base p-2.5 rounded-xl border border-border-subtle">
                  <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Distance</div>
                  <div className="text-sm font-bold text-text-primary mt-0.5">{info.distance.toFixed(1)} km</div>
                </div>
                <div className="bg-bg-base p-2.5 rounded-xl border border-border-subtle">
                  <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Est. Time</div>
                  <div className="text-sm font-bold text-accent-purple mt-0.5">~{info.duration} min</div>
                </div>
                <div className="bg-bg-base p-2.5 rounded-xl border border-border-subtle">
                  <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Waypoints</div>
                  <div className="text-sm font-bold text-text-primary mt-0.5">
                    {checkpoints.filter((c) => c.coord !== null).length + 2} Stops
                  </div>
                </div>
              </div>

              {/* Export / Share Actions Bar */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <button
                  onClick={handleExportGeoJson}
                  className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors font-semibold"
                  title="Export GeoJSON LineString"
                >
                  <Download className="w-3 h-3 text-accent-purple" />
                  <span>Export GeoJSON</span>
                </button>
                <button
                  onClick={handleCopyCoordinates}
                  className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors font-semibold"
                  title="Copy waypoints array"
                >
                  <Copy className="w-3 h-3 text-accent-purple" />
                  <span>Copy Coords ({routePoints.length})</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
