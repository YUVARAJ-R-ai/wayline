"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  MapPin,
  Key,
  Trash2,
  Loader2,
  Navigation,
  Info,
  Layers,
  Code2,
  Copy,
  Check,
  X,
  Zap,
  ArrowUpDown,
  Compass,
  ArrowRight,
  Crosshair,
  Download,
  History,
  Car,
  Footprints,
  Bike,
} from "lucide-react";
import { Badge, PremiumButton, Toast } from "@/components/ui";

// Dynamic import for Leaflet map component (prevents SSR window errors)
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-bg-elevated flex flex-col items-center justify-center text-text-muted gap-3 rounded-2xl select-none min-h-[450px]">
      <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
      <span className="text-xs font-mono tracking-wide">Loading Map Engine...</span>
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
  const [routingProfile, setRoutingProfile] = useState<"car" | "foot" | "bike">("car");
  const [showApiInspector, setShowApiInspector] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);

  // Routing State
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromCoord, setFromCoord] = useState<[number, number] | null>(null);
  const [toCoord, setToCoord] = useState<[number, number] | null>(null);
  const [fromAddress, setFromAddress] = useState<string | null>(null);
  const [toAddress, setToAddress] = useState<string | null>(null);
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

  // Telemetry Inspector
  const [lastApiCall, setLastApiCall] = useState<{
    endpoint: string;
    status: number;
    latencyMs: number;
    response: any;
  }>({
    endpoint: "GET /api/route?from=80.2705,13.0843&to=80.2024,13.0067",
    status: 200,
    latencyMs: 14,
    response: {
      status: "success",
      engine: "osrm-routed",
      message: "Ready for interactive queries",
    },
  });

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
      const updated = [newItem, ...filtered].slice(0, 4);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("wayline_recent_routes", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setRecentRoutes([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("wayline_recent_routes");
    }
    setToastMessage("Recent history cleared");
  };

  const handleSaveApiKey = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("wayline_api_key", apiKey.trim());
      setSaveSuccess(true);
      setToastMessage("API Key saved");
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleClear = () => {
    setFromQuery("");
    setToQuery("");
    setFromCoord(null);
    setToCoord(null);
    setFromAddress(null);
    setToAddress(null);
    setRoutePoints([]);
    setInfo(null);
    setError(null);
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
      fetchRouteDirectly(toCoord, tempCoord);
    }
  };

  // Locate User GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setToastMessage("Geolocation is not supported");
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userCoord: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setFromCoord(userCoord);
        setMapCenter(userCoord);
        setFromQuery(`${userCoord[0].toFixed(4)}, ${userCoord[1].toFixed(4)}`);
        setFromAddress("My Current Location");
        setLocatingUser(false);
        setActiveTab("route");
        setToastMessage("Set current location as start point");

        try {
          const res = await fetch(
            `${apiBaseUrl}/api/reverse-geocode?lat=${userCoord[0]}&lng=${userCoord[1]}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.address) {
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

  // Helper to fetch routing directly with coordinates
  const fetchRouteDirectly = async (start: [number, number], end: [number, number]) => {
    setLoading(true);
    setError(null);

    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      headers["x-api-key"] = apiKey.trim();
    }

    const startPerf = performance.now();
    try {
      const url = `${apiBaseUrl}/api/route?from=${start[1]},${start[0]}&to=${end[1]},${end[0]}`;
      const routeRes = await fetch(url, { headers });
      const latency = Math.round(performance.now() - startPerf);

      if (!routeRes.ok) {
        throw new Error("Could not calculate a route between these coordinates.");
      }

      const responseData = await routeRes.json();
      setLastApiCall({
        endpoint: `GET ${url}`,
        status: routeRes.status,
        latencyMs: latency,
        response: responseData,
      });

      let leafletCoords: Array<[number, number]> = [];
      let distanceKm = 0;
      let durationMin = 0;
      let gotStatsFromBackend = false;

      if (responseData && responseData.routes && responseData.routes[0]) {
        const routeObj = responseData.routes[0];
        const geometryObj = routeObj.geometry;
        if (geometryObj && geometryObj.coordinates) {
          leafletCoords = geometryObj.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        }
        if (typeof routeObj.distance === "number" && typeof routeObj.duration === "number") {
          distanceKm = routeObj.distance / 1000;
          durationMin = Math.round(routeObj.duration / 60);
          gotStatsFromBackend = true;
        }
      } else if (responseData && responseData.coordinates) {
        leafletCoords = responseData.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        if (typeof responseData.distance === "number" && typeof responseData.duration === "number") {
          distanceKm = responseData.distance > 1000 ? responseData.distance / 1000 : responseData.distance;
          durationMin = responseData.duration > 100 ? Math.round(responseData.duration / 60) : Math.round(responseData.duration);
          gotStatsFromBackend = true;
        }
      }

      if (leafletCoords.length > 0) {
        setRoutePoints(leafletCoords);
        if (!gotStatsFromBackend) {
          distanceKm = calculateDistance(leafletCoords);
          const speedMultiplier = routingProfile === "foot" ? 5 : routingProfile === "bike" ? 15 : 45;
          durationMin = Math.max(1, Math.round((distanceKm / speedMultiplier) * 60));
        }
        setInfo({ distance: distanceKm, duration: durationMin, latency });
        setToastMessage(`Route calculated in ${latency}ms`);

        // Save to Recent History
        saveToHistory({
          fromName: fromAddress || `${start[0].toFixed(4)}, ${start[1].toFixed(4)}`,
          toName: toAddress || `${end[0].toFixed(4)}, ${end[1].toFixed(4)}`,
          fromCoord: start,
          toCoord: end,
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

  // Execute geocoding + routing from form inputs
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
      if (!activeFrom || fromQuery !== activeFromAddress) {
        const res = await fetch(`${apiBaseUrl}/api/geocode?q=${encodeURIComponent(fromQuery)}`, { headers });
        if (!res.ok) throw new Error(`Failed to resolve start address`);
        const data = await res.json();
        if (data && typeof data.lat === "number" && typeof data.lng === "number") {
          activeFrom = [data.lat, data.lng];
          activeFromAddress = data.address || fromQuery;
          setFromCoord(activeFrom);
          setFromAddress(activeFromAddress);
          setFromQuery(activeFromAddress || "");
        }
      }

      if (!activeTo || toQuery !== activeToAddress) {
        const res = await fetch(`${apiBaseUrl}/api/geocode?q=${encodeURIComponent(toQuery)}`, { headers });
        if (!res.ok) throw new Error(`Failed to resolve destination address`);
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
        await fetchRouteDirectly(activeFrom, activeTo);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while resolving locations.");
    } finally {
      setLoading(false);
    }
  };

  // Execute Geocoding Search
  const handleSearchLocation = async (queryToSearch?: string) => {
    const q = queryToSearch || searchQuery;
    if (!q.trim()) return;

    setSearchLoading(true);
    const start = performance.now();
    const headers: Record<string, string> = {};
    if (apiKey.trim()) headers["x-api-key"] = apiKey.trim();

    try {
      const url = `${apiBaseUrl}/api/geocode?q=${encodeURIComponent(q.trim())}`;
      const res = await fetch(url, { headers });
      const latency = Math.round(performance.now() - start);
      const data = await res.json();

      setLastApiCall({
        endpoint: `GET ${url}`,
        status: res.status,
        latencyMs: latency,
        response: data,
      });

      if (res.ok && data && typeof data.lat === "number" && typeof data.lng === "number") {
        const loc = {
          lat: data.lat,
          lng: data.lng,
          address: data.address || q,
          latency,
        };
        setSelectedLocation(loc);
        setMapCenter([data.lat, data.lng]);
        setToastMessage(`Resolved: ${data.address || q}`);
      } else {
        setToastMessage("Address not found.");
      }
    } catch (err) {
      console.error(err);
      setToastMessage("Geocode request failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Map Click state machine: Click 1 -> Start, Click 2 -> End, Click 3 -> Clear
  const handleMapClick = async (latlng: { lat: number; lng: number }) => {
    const coord: [number, number] = [latlng.lat, latlng.lng];
    const headers: Record<string, string> = {};
    if (apiKey.trim()) headers["x-api-key"] = apiKey.trim();

    if (!fromCoord) {
      setFromCoord(coord);
      setFromQuery(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setFromAddress("Resolving address...");
      setActiveTab("route");

      try {
        const res = await fetch(
          `${apiBaseUrl}/api/reverse-geocode?lat=${latlng.lat}&lng=${latlng.lng}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          setFromAddress(data.address);
          setFromQuery(data.address);
        } else {
          setFromAddress(`Location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`);
        }
      } catch {
        setFromAddress(`Location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`);
      }
    } else if (!toCoord) {
      setToCoord(coord);
      setToQuery(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setToAddress("Resolving address...");

      let resolvedTo = `Location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`;
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/reverse-geocode?lat=${latlng.lat}&lng=${latlng.lng}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          resolvedTo = data.address;
          setToAddress(resolvedTo);
          setToQuery(resolvedTo);
        } else {
          setToAddress(resolvedTo);
        }
      } catch {
        setToAddress(resolvedTo);
      }

      await fetchRouteDirectly(fromCoord, coord);
    } else {
      handleClear();
    }
  };

  const copyTelemetry = () => {
    navigator.clipboard.writeText(JSON.stringify(lastApiCall.response, null, 2));
    setCopiedResponse(true);
    setToastMessage("JSON response copied");
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-13rem)] min-h-[600px]">
      <Toast
        isOpen={Boolean(toastMessage)}
        message={toastMessage || ""}
        onClose={() => setToastMessage(null)}
      />

      {/* --- LEFT SIDEBAR CONTROL PANEL (4 Cols on LG) --- */}
      <div className="lg:col-span-4 bg-bg-surface border border-border-default rounded-3xl shadow-glass p-5 flex flex-col justify-between overflow-y-auto gap-4 select-none">
        <div className="space-y-4">
          {/* Header & Primary Mode Switcher */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-purple font-bold text-sm">
                <Compass className="h-4 w-4" />
                <span className="text-text-primary">Spatial Console</span>
              </div>
              <Badge variant="neutral" size="sm">
                OSRM Live
              </Badge>
            </div>

            {/* Mode Switcher Pills: Directions vs Geocode */}
            <div className="grid grid-cols-2 gap-1 bg-bg-base p-1 rounded-xl border border-border-subtle text-xs font-semibold">
              <button
                onClick={() => setActiveTab("route")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors ${
                  activeTab === "route"
                    ? "bg-bg-elevated text-text-primary border border-border-subtle shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <Navigation className="w-3.5 h-3.5 text-accent-purple" />
                <span>Directions</span>
              </button>
              <button
                onClick={() => setActiveTab("geocode")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors ${
                  activeTab === "geocode"
                    ? "bg-bg-elevated text-text-primary border border-border-subtle shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <Search className="w-3.5 h-3.5 text-accent-purple" />
                <span>Geocode</span>
              </button>
            </div>

            {/* Clean, Non-Overflowing 3-Grid Profile Switcher */}
            {activeTab === "route" && (
              <div className="grid grid-cols-3 gap-1 bg-bg-base/70 p-1 rounded-xl border border-border-subtle text-xs">
                <button
                  onClick={() => setRoutingProfile("car")}
                  className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition-colors ${
                    routingProfile === "car"
                      ? "bg-bg-elevated text-accent-purple font-semibold border border-border-subtle shadow-sm"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Driving</span>
                </button>
                <button
                  onClick={() => setRoutingProfile("foot")}
                  className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition-colors ${
                    routingProfile === "foot"
                      ? "bg-bg-elevated text-accent-purple font-semibold border border-border-subtle shadow-sm"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Walking</span>
                </button>
                <button
                  onClick={() => setRoutingProfile("bike")}
                  className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition-colors ${
                    routingProfile === "bike"
                      ? "bg-bg-elevated text-accent-purple font-semibold border border-border-subtle shadow-sm"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Bicycle</span>
                </button>
              </div>
            )}
          </div>

          {/* Streamlined API Key Strip */}
          <div className="bg-bg-base/60 p-2.5 rounded-xl border border-border-subtle space-y-1.5">
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
              placeholder="Default session key active (or enter custom key)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-lg bg-bg-surface border border-border-default px-2.5 py-1 text-xs text-text-primary outline-none focus:border-accent-purple font-mono placeholder:text-[11px] placeholder:text-text-muted/60"
            />
          </div>

          {/* TAB A: DIRECTIONS & ROUTING */}
          {activeTab === "route" ? (
            <div className="space-y-3">
              <div className="space-y-2 relative">
                {/* From Input */}
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
                    className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-purple transition-colors"
                  />
                </div>

                {/* Destination Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-text-secondary flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-status-error inline-block" />
                      <span>Destination</span>
                    </label>
                    <button
                      onClick={handleSwapDirections}
                      title="Swap start and destination"
                      className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Swap</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Click map or enter destination..."
                    value={toQuery}
                    onChange={(e) => setToQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGetRoute()}
                    className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-purple transition-colors"
                  />
                </div>
              </div>

              {/* Recent Route History */}
              {recentRoutes.length > 0 && (
                <div className="pt-2 border-t border-border-subtle/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted flex items-center gap-1">
                      <History className="w-3 h-3" /> Recent Queries
                    </span>
                    <button
                      onClick={handleClearHistory}
                      className="text-[10px] text-text-muted hover:text-status-error transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentRoutes.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setFromCoord(r.fromCoord);
                          setToCoord(r.toCoord);
                          setFromAddress(r.fromName);
                          setToAddress(r.toName);
                          setFromQuery(r.fromName);
                          setToQuery(r.toName);
                          fetchRouteDirectly(r.fromCoord, r.toCoord);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg bg-bg-base hover:bg-bg-elevated border border-border-subtle text-[11px] text-text-secondary hover:text-text-primary transition-colors flex items-center justify-between"
                      >
                        <span className="truncate max-w-[210px]">
                          {r.fromName.split(",")[0]} → {r.toName.split(",")[0]}
                        </span>
                        <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-2.5 bg-status-error/10 border border-status-error/20 text-status-error rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}
            </div>
          ) : (
            /* TAB B: GEOCODE SEARCH */
            <div className="space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchLocation();
                }}
                className="space-y-2"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search city, address, or POI..."
                    className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-9 pr-16 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-purple transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-accent-purple text-btn-primary-text text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    {searchLoading ? "..." : "Find"}
                  </button>
                </div>
              </form>

              {/* Resolved Location Box */}
              {selectedLocation && (
                <div className="p-3 bg-bg-base border border-border-subtle rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-accent-purple flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-text-primary leading-snug">
                        {selectedLocation.address}
                      </div>
                      <div className="text-[11px] font-mono text-text-muted mt-0.5">
                        {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lng.toFixed(4)}° E
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-accent-purple font-semibold">
                      {selectedLocation.latency}ms
                    </span>
                    <button
                      onClick={() => {
                        setFromCoord([selectedLocation.lat, selectedLocation.lng]);
                        setFromAddress(selectedLocation.address);
                        setFromQuery(selectedLocation.address);
                        setActiveTab("route");
                        setToastMessage("Start point set from search");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-purple hover:underline"
                    >
                      <span>Route here</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions & Results */}
        <div className="space-y-3 pt-3 border-t border-border-subtle">
          {/* Results Summary */}
          {info && activeTab === "route" && (
            <div className="p-3 bg-bg-base border border-border-subtle rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-accent-purple" />
                  Route Metrics
                </span>
                {info.latency && (
                  <span className="font-mono text-[11px] text-accent-purple font-semibold">
                    {info.latency}ms
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-bg-elevated p-2 rounded-lg border border-border-subtle/50">
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Distance</div>
                  <div className="text-xs font-bold text-text-primary mt-0.5">{info.distance.toFixed(1)} km</div>
                </div>
                <div className="bg-bg-elevated p-2 rounded-lg border border-border-subtle/50">
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Est. Time</div>
                  <div className="text-xs font-bold text-text-primary mt-0.5">~{info.duration} min</div>
                </div>
              </div>

              {/* Export / Share Actions Bar */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <button
                  onClick={handleExportGeoJson}
                  className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors font-semibold"
                  title="Export GeoJSON LineString"
                >
                  <Download className="w-3 h-3" />
                  <span>GeoJSON</span>
                </button>
                <button
                  onClick={handleCopyCoordinates}
                  className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors font-semibold"
                  title="Copy waypoints array"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Coords ({routePoints.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {activeTab === "route" && (
            <div className="flex gap-2">
              <PremiumButton
                variant="primary"
                size="sm"
                loading={loading}
                onClick={handleGetRoute}
                className="flex-1"
                icon={<Navigation className="w-3.5 h-3.5" />}
              >
                Calculate Route
              </PremiumButton>
              <button
                onClick={handleClear}
                disabled={loading || (!fromCoord && !toCoord && !fromQuery && !toQuery)}
                className="bg-bg-elevated hover:bg-bg-base text-text-primary border border-border-default disabled:opacity-50 px-3 rounded-xl text-xs font-bold transition-colors"
                title="Clear all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Street Overlay Toggle */}
          <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
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

      {/* --- RIGHT MAP DISPLAY CANVAS (8 Cols on LG) --- */}
      <div className="lg:col-span-8 bg-bg-surface border border-border-default rounded-3xl shadow-glass overflow-hidden h-full relative">
        <Map
          polyline={activeTab === "route" ? routePoints : []}
          onMapClick={handleMapClick}
          fromPosition={activeTab === "route" ? fromCoord : null}
          toPosition={activeTab === "route" ? toCoord : null}
          fromAddress={fromAddress}
          toAddress={toAddress}
          center={
            activeTab === "geocode" && selectedLocation
              ? [selectedLocation.lat, selectedLocation.lng]
              : fromCoord || mapCenter
          }
          markerPosition={
            activeTab === "geocode" && selectedLocation
              ? [selectedLocation.lat, selectedLocation.lng]
              : null
          }
          markerAddress={selectedLocation?.address}
          showStreets={showStreets}
          apiKey={apiKey}
        />

        {/* Floating Bottom API Inspector Button */}
        <div className="absolute bottom-4 left-4 z-20">
          <button
            onClick={() => setShowApiInspector(!showApiInspector)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-semibold border shadow-lg backdrop-blur-md transition-all ${
              showApiInspector
                ? "bg-accent-purple text-btn-primary-text border-accent-purple"
                : "bg-bg-surface/90 text-text-secondary hover:text-text-primary border-border-default hover:bg-bg-elevated"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>API Telemetry</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-current font-bold">
              {lastApiCall.latencyMs}ms
            </span>
          </button>
        </div>

        {/* API Inspector Drawer Modal */}
        {showApiInspector && (
          <div className="absolute bottom-16 left-4 right-4 sm:right-auto sm:w-[480px] z-30 bg-bg-surface border border-border-default rounded-2xl shadow-2xl p-4 space-y-3 backdrop-blur-md animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-purple animate-pulse" />
                <span className="text-xs font-mono font-bold text-text-primary line-clamp-1">
                  {lastApiCall.endpoint}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyTelemetry}
                  title="Copy JSON response"
                  className="p-1 text-text-muted hover:text-text-primary rounded"
                >
                  {copiedResponse ? (
                    <Check className="w-3.5 h-3.5 text-accent-purple" />
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

            <div className="p-3 bg-bg-base rounded-xl font-mono text-[11px] text-accent-purple overflow-x-auto max-h-48 border border-border-subtle select-all">
              <pre>{JSON.stringify(lastApiCall.response, null, 2)}</pre>
            </div>

            <div className="flex items-center justify-between text-[11px] text-text-muted font-mono pt-1">
              <span>Status: {lastApiCall.status} OK</span>
              <span>Latency: {lastApiCall.latencyMs} ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
