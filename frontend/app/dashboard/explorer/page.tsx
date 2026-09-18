"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Layers,
  Search,
  MapPin,
  Upload,
  Copy,
  Check,
  Compass,
  Crosshair,
  Info,
  Loader2,
  FileCode,
  Eye,
  EyeOff,
  Maximize2,
  Navigation,
} from "lucide-react";
import { PremiumButton, Badge, Toast } from "@/components/ui";

// Dynamic import for Leaflet map
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-bg-surface flex flex-col items-center justify-center text-text-muted gap-3 rounded-2xl select-none min-h-[500px]">
      <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
      <span className="text-xs font-mono tracking-wide">Loading Spatial Canvas...</span>
    </div>
  ),
});

interface SpatialPreset {
  name: string;
  coords: [number, number];
  description: string;
}

const PRESETS: SpatialPreset[] = [
  { name: "Chennai Central", coords: [13.0827, 80.2707], description: "Transit Hub & Heritage Zone" },
  { name: "Guindy Tech Hub", coords: [13.0067, 80.2024], description: "Industrial & IT Cluster" },
  { name: "OMR IT Corridor", coords: [12.9249, 80.2279], description: "Expressway & Tech Parks" },
  { name: "Chennai Port", coords: [13.0945, 80.2985], description: "Maritime Logistics Terminal" },
];

export default function SpatialExplorerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<[number, number]>([13.0843, 80.2705]);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>([13.0843, 80.2705]);
  const [markerAddress, setMarkerAddress] = useState<string | null>("Chennai, Tamil Nadu, India");
  
  // Layer Toggles
  const [showStreets, setShowStreets] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  
  // Selected / Clicked coordinates inspector
  const [inspectedCoord, setInspectedCoord] = useState<[number, number]>([13.0843, 80.2705]);
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom GeoJSON Upload state
  const [customGeoJsonName, setCustomGeoJsonName] = useState<string | null>(null);
  const [customGeoJsonCount, setCustomGeoJsonCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          const newPos: [number, number] = [parseFloat(data.lat), parseFloat(data.lng)];
          setCenter(newPos);
          setMarkerPosition(newPos);
          setMarkerAddress(data.address || searchQuery);
          setInspectedCoord(newPos);
          setToastMessage(`Navigated to: ${data.address || searchQuery}`);
        } else {
          setToastMessage("Location not found. Try a different query.");
        }
      } else {
        setToastMessage("Geocoding service unavailable.");
      }
    } catch {
      setToastMessage("Failed to resolve location.");
    } finally {
      setSearching(false);
    }
  };

  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    const coords: [number, number] = [latlng.lat, latlng.lng];
    setInspectedCoord(coords);
    setMarkerPosition(coords);
    setMarkerAddress(`Lat: ${latlng.lat.toFixed(5)}, Lng: ${latlng.lng.toFixed(5)}`);
  };

  const handleCopyCoord = () => {
    const text = `${inspectedCoord[0].toFixed(5)}, ${inspectedCoord[1].toFixed(5)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoord(true);
    setToastMessage(`Copied: ${text}`);
    setTimeout(() => setCopiedCoord(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const featureCount = parsed.features ? parsed.features.length : 1;
        setCustomGeoJsonName(file.name);
        setCustomGeoJsonCount(featureCount);
        setToastMessage(`Loaded custom layer: ${file.name} (${featureCount} features)`);
      } catch {
        setToastMessage("Invalid GeoJSON file format.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <Toast
        isOpen={Boolean(toastMessage)}
        message={toastMessage || ""}
        onClose={() => setToastMessage(null)}
      />

      {/* Header & Quick Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              Spatial Explorer
            </h2>
            <Badge variant="accent" size="sm">
              GCC Vector Layers Live
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Explore OpenStreetMap vectors, GCC street hierarchies, and inspect spatial coordinates.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, landmark, or PIN..."
              className="w-full rounded-xl bg-bg-surface border border-border-default py-2.5 pl-10 pr-4 text-xs sm:text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
            />
          </div>
          <PremiumButton type="submit" variant="primary" size="md" loading={searching}>
            Explore
          </PremiumButton>
        </form>
      </div>

      {/* Main Grid: 9 Cols Map + 3 Cols Layer Controls & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Map Canvas Container */}
        <div className="lg:col-span-8 xl:col-span-9 bg-bg-surface border border-border-default rounded-3xl overflow-hidden shadow-2xl relative min-h-[580px] h-[640px]">
          <Map
            center={center}
            markerPosition={markerPosition}
            markerAddress={markerAddress}
            onMapClick={handleMapClick}
            showStreets={showStreets}
          />

          {/* Floating Coordinate Pill on Map */}
          <div className="absolute top-4 right-4 z-[400] bg-bg-base/90 backdrop-blur-md border border-border-default px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-3 text-xs font-mono select-none">
            <span className="text-text-muted">Target:</span>
            <span className="text-text-primary font-semibold">
              {inspectedCoord[0].toFixed(4)}° N, {inspectedCoord[1].toFixed(4)}° E
            </span>
            <button
              onClick={handleCopyCoord}
              className="p-1 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
              title="Copy coordinates"
            >
              {copiedCoord ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Layer Controls & Spatial Inspector Panel */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
          
          {/* Layer Switchers Card */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted select-none">
              <Layers className="w-4 h-4 text-accent-purple" />
              <span>Active Layer Stack</span>
            </div>

            <div className="space-y-3 text-xs">
              {/* OSM Base Layer */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-bg-base border border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-status-success" />
                  <div>
                    <span className="font-bold text-text-primary block">OpenStreetMap Base</span>
                    <span className="text-[10px] text-text-muted">Standard Cartography</span>
                  </div>
                </div>
                <Badge variant="success" size="sm">Active</Badge>
              </div>

              {/* GCC Streets Vector Overlay */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-bg-base border border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowStreets(!showStreets)}
                    className="focus:outline-none"
                  >
                    {showStreets ? (
                      <Eye className="w-4 h-4 text-accent-purple" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-text-muted" />
                    )}
                  </button>
                  <div>
                    <span className="font-bold text-text-primary block">GCC Street Network</span>
                    <span className="text-[10px] text-text-muted">94,000+ Streets & Wards</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowStreets(!showStreets)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                    showStreets
                      ? "bg-accent-purple-muted text-accent-purple border-accent-purple/30"
                      : "bg-bg-elevated text-text-muted border-border-subtle"
                  }`}
                >
                  {showStreets ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>

          {/* Custom GeoJSON Dropzone Card */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted select-none">
                <Upload className="w-4 h-4 text-accent-purple" />
                <span>Custom GeoJSON</span>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".geojson,.json"
              className="hidden"
            />

            {!customGeoJsonName ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-default hover:border-accent-purple/60 rounded-xl p-4 text-center cursor-pointer transition-colors bg-bg-base/60 group"
              >
                <FileCode className="w-6 h-6 text-text-muted group-hover:text-accent-purple mx-auto mb-1.5 transition-colors" />
                <span className="text-xs font-semibold text-text-primary block">Upload .geojson file</span>
                <span className="text-[10px] text-text-muted">Visualize custom polygons or points</span>
              </div>
            ) : (
              <div className="p-3 bg-bg-base border border-border-subtle rounded-xl flex items-center justify-between text-xs">
                <div className="overflow-hidden">
                  <span className="font-bold text-text-primary block truncate">{customGeoJsonName}</span>
                  <span className="text-[10px] text-accent-purple">{customGeoJsonCount} features loaded</span>
                </div>
                <button
                  onClick={() => {
                    setCustomGeoJsonName(null);
                    setCustomGeoJsonCount(null);
                    setToastMessage("Custom layer removed");
                  }}
                  className="text-text-muted hover:text-status-error text-xs font-semibold"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Quick Jump Spatial Presets */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-5 shadow-sm space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted select-none">
              Spatial Hub Presets
            </div>
            <div className="space-y-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setCenter(p.coords);
                    setMarkerPosition(p.coords);
                    setMarkerAddress(p.name);
                    setInspectedCoord(p.coords);
                    setToastMessage(`Jumped to ${p.name}`);
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-bg-elevated border border-transparent hover:border-border-subtle transition-all group flex items-start justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-text-primary group-hover:text-accent-purple transition-colors block">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-text-muted">{p.description}</span>
                  </div>
                  <Navigation className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-purple transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
