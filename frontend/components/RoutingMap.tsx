"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Key, Trash2, Loader2, Navigation, Info } from "lucide-react";

// Dynamic import for Leaflet map component (prevents SSR window errors)
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-bg-elevated flex flex-col items-center justify-center text-text-muted gap-3 rounded-2xl select-none">
      <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
      <span className="text-sm font-semibold tracking-wide">Loading Map Component...</span>
    </div>
  ),
});

// Haversine formula to compute total route distance in km from polyline points
function calculateDistance(coords: [number, number][]): number {
  let total = 0;
  const R = 6371; // Earth's radius in km
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

export default function RoutingMap() {
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromCoord, setFromCoord] = useState<[number, number] | null>(null);
  const [toCoord, setToCoord] = useState<[number, number] | null>(null);
  const [fromAddress, setFromAddress] = useState<string | null>(null);
  const [toAddress, setToAddress] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<Array<[number, number]>>([]);
  const [info, setInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Load API Key from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = window.localStorage.getItem("wayline_api_key") || "";
      setApiKey(savedKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("wayline_api_key", apiKey.trim());
      setSaveSuccess(true);
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
  };

  // Helper to fetch routing directly with coordinates
  const fetchRouteDirectly = async (start: [number, number], end: [number, number]) => {
    setLoading(true);
    setError(null);

    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      headers["x-api-key"] = apiKey.trim();
    }

    try {
      const routeRes = await fetch(
        `${apiBaseUrl}/api/route?from=${start[1]},${start[0]}&to=${end[1]},${end[0]}`,
        { headers }
      );
      if (!routeRes.ok) {
        throw new Error("Could not calculate a driving route between these points.");
      }

      const geom = await routeRes.json();
      if (geom && geom.coordinates) {
        // Reverse OSRM [lng, lat] coordinate pairs to [lat, lng] for Leaflet
        const leafletCoords = geom.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        setRoutePoints(leafletCoords);

        const distance = calculateDistance(leafletCoords);
        const duration = Math.round((distance / 45) * 60); // 45 km/h driving speed approximation
        setInfo({ distance, duration });
      } else {
        throw new Error("Route geometry not found in response.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during routing.");
    } finally {
      setLoading(false);
    }
  };

  // Execute geocoding + routing from form inputs
  const handleGetRoute = async () => {
    if (!fromQuery.trim() || !toQuery.trim()) {
      setError("Please specify both starting and destination addresses.");
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
      // 1. Geocode From address if not already resolved by click/previous search
      if (!activeFrom || fromQuery !== activeFromAddress) {
        const res = await fetch(`${apiBaseUrl}/api/geocode?q=${encodeURIComponent(fromQuery)}`, { headers });
        if (!res.ok) {
          throw new Error(`Failed to resolve starting address: ${res.statusText}`);
        }
        const data = await res.json();
        if (data && typeof data.lat === "number" && typeof data.lng === "number") {
          activeFrom = [data.lat, data.lng];
          activeFromAddress = data.address || fromQuery;
          setFromCoord(activeFrom);
          setFromAddress(activeFromAddress);
          setFromQuery(activeFromAddress || "");
        } else {
          throw new Error("Invalid start location data returned from geocoder.");
        }
      }

      // 2. Geocode To address if not already resolved
      if (!activeTo || toQuery !== activeToAddress) {
        const res = await fetch(`${apiBaseUrl}/api/geocode?q=${encodeURIComponent(toQuery)}`, { headers });
        if (!res.ok) {
          throw new Error(`Failed to resolve destination address: ${res.statusText}`);
        }
        const data = await res.json();
        if (data && typeof data.lat === "number" && typeof data.lng === "number") {
          activeTo = [data.lat, data.lng];
          activeToAddress = data.address || toQuery;
          setToCoord(activeTo);
          setToAddress(activeToAddress);
          setToQuery(activeToAddress || "");
        } else {
          throw new Error("Invalid destination location data returned from geocoder.");
        }
      }

      // 3. Fetch Route
      await fetchRouteDirectly(activeFrom, activeTo);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while geocoding or routing.");
    } finally {
      setLoading(false);
    }
  };

  // Map Click state machine: Click 1 -> Start, Click 2 -> End, Click 3 -> Clear
  const handleMapClick = async (latlng: { lat: number; lng: number }) => {
    const coord: [number, number] = [latlng.lat, latlng.lng];
    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      headers["x-api-key"] = apiKey.trim();
    }

    if (!fromCoord) {
      setFromCoord(coord);
      setFromQuery(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      setFromAddress("Fetching address...");
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
          setFromAddress(`Coordinate: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
        }
      } catch (err) {
        setFromAddress(`Coordinate: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      }
    } else if (!toCoord) {
      setToCoord(coord);
      setToQuery(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      setToAddress("Fetching address...");

      let resolvedToAddress = `Coordinate: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/reverse-geocode?lat=${latlng.lat}&lng=${latlng.lng}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          resolvedToAddress = data.address;
          setToAddress(resolvedToAddress);
          setToQuery(resolvedToAddress);
        } else {
          setToAddress(resolvedToAddress);
        }
      } catch (err) {
        setToAddress(resolvedToAddress);
      }

      // Proactively fetch route as we now have both coords
      await fetchRouteDirectly(fromCoord, coord);
    } else {
      handleClear();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)] min-h-[550px]">
      
      {/* Sidebar Control Panel (1 Column) */}
      <div className="lg:col-span-1 bg-bg-surface border border-border-subtle rounded-2xl shadow-glass p-6 flex flex-col justify-between overflow-y-auto gap-5">
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-accent-purple select-none">
            <Navigation className="h-5 w-5" />
            <h3 className="font-bold text-lg text-text-primary tracking-tight">Route Planner</h3>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed select-none">
            Plan navigation paths by typing addresses or directly clicking on the interactive map on the right.
          </p>

          <hr className="border-border-subtle/50" />

          {/* API Key Panel */}
          <div className="space-y-2 select-none">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
              <Key className="h-3.5 w-3.5 text-text-muted" />
              <span>Dashboard API Key</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter API Key (wlk_...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 rounded-xl bg-bg-base border border-border-default px-3 py-2 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent-purple/30 transition-all font-mono"
              />
              <button
                onClick={handleSaveApiKey}
                className="bg-accent-purple text-btn-primary-text hover:opacity-90 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                {saveSuccess ? "Saved!" : "Save"}
              </button>
            </div>
            {!apiKey.trim() && (
              <p className="text-[10px] text-status-warning font-semibold">
                ⚠️ No API Key configured. Requests rely on development bypass rules.
              </p>
            )}
          </div>

          <hr className="border-border-subtle/50" />

          {/* Form inputs */}
          <div className="space-y-3">
            
            {/* Start location */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary flex items-center gap-1 select-none">
                <span className="w-2 h-2 rounded-full bg-status-success inline-block"></span>
                Start Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type starting address..."
                  value={fromQuery}
                  onChange={(e) => setFromQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGetRoute();
                  }}
                  className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-9 pr-3 text-xs text-text-primary placeholder-text-muted/70 outline-none focus:ring-1 focus:ring-accent-purple/30 transition-all"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
              </div>
            </div>

            {/* Destination location */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary flex items-center gap-1 select-none">
                <span className="w-2 h-2 rounded-full bg-status-error inline-block"></span>
                Destination Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type destination address..."
                  value={toQuery}
                  onChange={(e) => setToQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGetRoute();
                  }}
                  className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-9 pr-3 text-xs text-text-primary placeholder-text-muted/70 outline-none focus:ring-1 focus:ring-accent-purple/30 transition-all"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
              </div>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="p-3 bg-status-error/10 border border-status-error/20 text-status-error rounded-xl text-xs font-medium">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions & Results */}
        <div className="space-y-4">
          
          {/* Results Summary */}
          {info && (
            <div className="p-4 bg-bg-elevated border border-border-subtle rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-2 select-none">
                <Info className="h-3.5 w-3.5 text-accent-purple" />
                <span>Route Information</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center select-none">
                <div className="bg-bg-base p-2.5 rounded-xl border border-border-subtle/50">
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Distance</div>
                  <div className="text-sm font-extrabold text-text-primary mt-0.5">{info.distance.toFixed(1)} km</div>
                </div>
                <div className="bg-bg-base p-2.5 rounded-xl border border-border-subtle/50">
                  <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Est. Duration</div>
                  <div className="text-sm font-extrabold text-text-primary mt-0.5">~{info.duration} min</div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleGetRoute}
              disabled={loading || !fromQuery.trim() || !toQuery.trim()}
              className="flex-1 bg-accent-purple text-btn-primary-text hover:opacity-90 disabled:opacity-50 py-2.5 px-4 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Calculating...
                </>
              ) : (
                "Get Route"
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={loading || (!fromCoord && !toCoord && !fromQuery && !toQuery)}
              className="bg-bg-elevated hover:bg-bg-base text-text-primary border border-border-default disabled:opacity-50 p-2.5 rounded-xl text-xs font-bold transition-all"
              title="Clear all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-3 bg-accent-purple-muted border border-accent-purple/10 rounded-xl flex gap-2 select-none">
            <span className="text-xs">💡</span>
            <p className="text-[10px] text-text-secondary leading-relaxed">
              <strong>Interactive Clicking</strong>: 1st click on the map sets the start, 2nd sets the destination, and 3rd clears it.
            </p>
          </div>
        </div>

      </div>

      {/* Map Display Panel (2 Columns) */}
      <div className="lg:col-span-2 bg-bg-surface border border-border-subtle rounded-2xl shadow-glass overflow-hidden h-full relative">
        <Map
          polyline={routePoints}
          onMapClick={handleMapClick}
          fromPosition={fromCoord}
          toPosition={toCoord}
          fromAddress={fromAddress}
          toAddress={toAddress}
          center={fromCoord || [13.0843, 80.2705]}
        />
      </div>

    </div>
  );
}
