"use client";

import React, { useState, useRef } from "react";
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
  Download,
  Trash2,
  Sparkles,
  Table as TableIcon,
  Globe,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { PremiumButton, Badge, Toast } from "@/components/ui";
import { CustomSpatialFeature, CustomSpatialPolygon } from "@/components/Map";

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

const SAMPLE_CSV_GEOCODED = `name,latitude,longitude,category,city
Wayline Central Hub,13.0827,80.2707,HQ,Chennai
Guindy Dispatch Depot,13.0067,80.2024,Logistics,Chennai
OMR Tech Fulfillment,12.9249,80.2279,Warehouse,Chennai
Marina Coastal Sensor,13.0500,80.2824,IoT Node,Chennai
T. Nagar Retail Point,13.0418,80.2341,Store,Chennai
Anna Nagar Distribution,13.0850,80.2100,Depot,Chennai`;

const SAMPLE_CSV_ADDRESSES = `location_name,address,city
Express Avenue,Express Avenue Royapettah,Chennai
Phoenix Marketcity,Velachery Main Road,Chennai
Chennai Airport,Meenambakkam,Chennai
IIT Madras Research Park,Kanagam Road Taramani,Chennai`;

export default function SpatialExplorerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<[number, number]>([13.0843, 80.2705]);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>([13.0843, 80.2705]);
  const [markerAddress, setMarkerAddress] = useState<string | null>("Chennai, Tamil Nadu, India");
  
  // Layer Toggles
  const [showStreets, setShowStreets] = useState(true);
  const [pinColor, setPinColor] = useState<"sage" | "ochre" | "teal">("sage");
  
  // Selected / Clicked coordinates inspector
  const [inspectedCoord, setInspectedCoord] = useState<[number, number]>([13.0843, 80.2705]);
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Uploaded Layer State (CSV or GeoJSON)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<"csv" | "geojson" | null>(null);
  const [parsedFeatures, setParsedFeatures] = useState<CustomSpatialFeature[]>([]);
  const [parsedPolygons, setParsedPolygons] = useState<CustomSpatialPolygon[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [pendingAddressRows, setPendingAddressRows] = useState<Record<string, string>[]>([]);
  const [isGeocodingBatch, setIsGeocodingBatch] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "table">("map");

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

  // Helper to parse simple CSV text into array of object records
  const parseCSVText = (csvContent: string): Record<string, string>[] => {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic CSV regex to handle commas inside quoted strings
      const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        let val = values[idx] || "";
        val = val.trim().replace(/^["']|["']$/g, "");
        rowObj[h] = val;
      });
      rows.push(rowObj);
    }
    return rows;
  };

  // Process CSV rows into spatial features
  const processCSVData = (rows: Record<string, string>[], fileName: string) => {
    if (rows.length === 0) {
      setToastMessage("CSV file contains no data rows.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const lowerHeaders = headers.map((h) => h.toLowerCase());

    // Coordinate column detection heuristics
    const latIdx = lowerHeaders.findIndex((h) =>
      ["lat", "latitude", "lat_deg", "y", "geo_lat", "coord_lat", "start_lat"].includes(h)
    );
    const lngIdx = lowerHeaders.findIndex((h) =>
      ["lng", "lon", "long", "longitude", "lon_deg", "x", "geo_lon", "coord_lng", "start_lng"].includes(h)
    );

    // Label / Name heuristics
    const nameIdx = lowerHeaders.findIndex((h) =>
      ["name", "label", "title", "store_name", "location_name", "store_id", "id", "place"].includes(h)
    );

    // Address heuristics
    const addressIdx = lowerHeaders.findIndex((h) =>
      ["address", "full_address", "location", "street", "query"].includes(h)
    );

    const latKey = latIdx !== -1 ? headers[latIdx] : null;
    const lngKey = lngIdx !== -1 ? headers[lngIdx] : null;
    const nameKey = nameIdx !== -1 ? headers[nameIdx] : null;
    const addressKey = addressIdx !== -1 ? headers[addressIdx] : null;

    setRawRows(rows);
    setUploadedFileName(fileName);
    setUploadedFileType("csv");

    if (latKey && lngKey) {
      // Extract valid coordinate features
      const validFeatures: CustomSpatialFeature[] = [];
      const withoutCoords: Record<string, string>[] = [];

      rows.forEach((row, i) => {
        const lat = parseFloat(row[latKey]);
        const lng = parseFloat(row[lngKey]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          validFeatures.push({
            lat,
            lng,
            label: nameKey ? row[nameKey] : `Point #${i + 1}`,
            properties: row,
            color: pinColor,
          });
        } else {
          withoutCoords.push(row);
        }
      });

      setParsedFeatures(validFeatures);
      setParsedPolygons([]);
      setPendingAddressRows(withoutCoords);

      if (validFeatures.length > 0) {
        setCenter([validFeatures[0].lat, validFeatures[0].lng]);
        setToastMessage(`Mapped ${validFeatures.length} points from ${fileName}`);
      } else {
        setToastMessage("Found coordinate columns, but values were invalid.");
      }
    } else if (addressKey) {
      // CSV has addresses but no coordinates -> Ready for Batch Geocoding
      setParsedFeatures([]);
      setParsedPolygons([]);
      setPendingAddressRows(rows);
      setToastMessage(`Detected ${rows.length} addresses. Click 'Batch Geocode' to map them.`);
    } else {
      setToastMessage("Could not auto-detect coordinate or address columns in CSV.");
    }
  };

  // Process GeoJSON content
  const processGeoJSONData = (content: string, fileName: string) => {
    try {
      const parsed = JSON.parse(content);
      setUploadedFileName(fileName);
      setUploadedFileType("geojson");

      const features: CustomSpatialFeature[] = [];
      const polygons: CustomSpatialPolygon[] = [];

      const rawFeatureList = parsed.type === "FeatureCollection" ? parsed.features : [parsed];

      rawFeatureList.forEach((f: any, idx: number) => {
        const geom = f.geometry || f;
        const props = f.properties || {};

        if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
          features.push({
            lat: geom.coordinates[1],
            lng: geom.coordinates[0],
            label: props.name || props.title || `Point #${idx + 1}`,
            properties: props,
            color: pinColor,
          });
        } else if (geom.type === "Polygon" && Array.isArray(geom.coordinates)) {
          // Leaflet Polygon expects [lat, lng] array
          const coords = geom.coordinates[0].map((pt: [number, number]) => [pt[1], pt[0]] as [number, number]);
          polygons.push({
            coordinates: coords,
            label: props.name || `Boundary #${idx + 1}`,
            color: "#436352",
          });
        }
      });

      setParsedFeatures(features);
      setParsedPolygons(polygons);
      setPendingAddressRows([]);

      if (features.length > 0) {
        setCenter([features[0].lat, features[0].lng]);
      } else if (polygons.length > 0 && polygons[0].coordinates.length > 0) {
        setCenter(polygons[0].coordinates[0]);
      }

      setToastMessage(`Loaded GeoJSON: ${fileName} (${features.length} points, ${polygons.length} polygons)`);
    } catch {
      setToastMessage("Invalid GeoJSON format.");
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.type === "text/csv") {
        const rows = parseCSVText(content);
        processCSVData(rows, file.name);
      } else {
        processGeoJSONData(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Batch Geocoding of unmapped addresses via /api/geocode
  const handleBatchGeocode = async () => {
    if (pendingAddressRows.length === 0 || isGeocodingBatch) return;

    setIsGeocodingBatch(true);
    setGeocodingProgress({ current: 0, total: pendingAddressRows.length });

    const updatedFeatures: CustomSpatialFeature[] = [...parsedFeatures];
    const headers = Object.keys(pendingAddressRows[0]);
    const lowerHeaders = headers.map((h) => h.toLowerCase());
    const addressIdx = lowerHeaders.findIndex((h) =>
      ["address", "full_address", "location", "street", "query", "location_name"].includes(h)
    );
    const cityIdx = lowerHeaders.findIndex((h) => ["city", "state", "region"].includes(h));
    const nameIdx = lowerHeaders.findIndex((h) =>
      ["name", "label", "title", "location_name", "store_name"].includes(h)
    );

    const addressKey = addressIdx !== -1 ? headers[addressIdx] : headers[0];
    const cityKey = cityIdx !== -1 ? headers[cityIdx] : null;
    const nameKey = nameIdx !== -1 ? headers[nameIdx] : null;

    let successCount = 0;

    for (let i = 0; i < pendingAddressRows.length; i++) {
      const row = pendingAddressRows[i];
      let query = row[addressKey] || "";
      if (cityKey && row[cityKey]) query += `, ${row[cityKey]}`;

      if (query.trim()) {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
          if (res.ok) {
            const data = await res.json();
            if (data.lat && data.lng) {
              const lat = parseFloat(data.lat);
              const lng = parseFloat(data.lng);
              updatedFeatures.push({
                lat,
                lng,
                label: nameKey ? row[nameKey] : query,
                properties: { ...row, resolved_address: data.address || query },
                color: pinColor,
              });
              successCount++;
            }
          }
        } catch {
          // ignore single failed record
        }
      }
      setGeocodingProgress({ current: i + 1, total: pendingAddressRows.length });
    }

    setParsedFeatures(updatedFeatures);
    setPendingAddressRows([]);
    setIsGeocodingBatch(false);
    setGeocodingProgress(null);

    if (updatedFeatures.length > 0) {
      setCenter([updatedFeatures[0].lat, updatedFeatures[0].lng]);
      setToastMessage(`Batch geocoding completed: ${successCount} addresses mapped!`);
    } else {
      setToastMessage("Batch geocoding finished, but no coordinates were resolved.");
    }
  };

  // Export Integrated Spatial Layer as GeoJSON
  const handleExportGeoJSON = () => {
    if (parsedFeatures.length === 0 && parsedPolygons.length === 0) return;

    const geoJsonFeatures = [
      ...parsedFeatures.map((f) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [f.lng, f.lat],
        },
        properties: f.properties || { name: f.label },
      })),
      ...parsedPolygons.map((p) => ({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [p.coordinates.map((c) => [c[1], c[0]])],
        },
        properties: { name: p.label || "Boundary" },
      })),
    ];

    const featureCollection = {
      type: "FeatureCollection",
      name: uploadedFileName?.replace(/\.[^/.]+$/, "") || "wayline-export",
      features: geoJsonFeatures,
    };

    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${uploadedFileName?.replace(/\.[^/.]+$/, "") || "wayline-dataset"}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage("Exported GeoJSON dataset successfully!");
  };

  const handleClearUploaded = () => {
    setUploadedFileName(null);
    setUploadedFileType(null);
    setParsedFeatures([]);
    setParsedPolygons([]);
    setRawRows([]);
    setPendingAddressRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setToastMessage("Cleared custom layer.");
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="space-y-6 animate-in fade-in duration-150 relative"
    >
      {/* Full-Screen Drag & Drop Overlay for Files */}
      {isDragging && (
        <div className="fixed inset-0 z-[999] bg-bg-base/85 backdrop-blur-md border-4 border-dashed border-accent-purple flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150 shadow-2xl">
          <div className="p-8 rounded-3xl bg-bg-surface border border-border-default shadow-xl flex flex-col items-center text-center max-w-md mx-4">
            <FileSpreadsheet className="w-16 h-16 text-accent-purple mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-text-primary">Drop Spatial Dataset Here</h3>
            <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
              Drop any <span className="font-mono text-accent-purple font-semibold">.csv</span>, <span className="font-mono text-accent-purple font-semibold">.tsv</span>, or <span className="font-mono text-accent-purple font-semibold">.geojson</span> file to auto-parse coordinates and batch geocode addresses.
            </p>
          </div>
        </div>
      )}

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
              Vector & CSV Integration Live
            </Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Full-canvas GIS visualizer, CSV batch geocoding, and GeoJSON layer inspector.
          </p>
        </div>

        {/* Global Coordinate & Location Search Form */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search place, coordinates, or address..."
              className="w-full bg-bg-surface border border-border-default rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors shadow-sm"
            />
          </div>
          <PremiumButton variant="primary" size="sm" type="submit" disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Locate"}
          </PremiumButton>
        </form>
      </div>

      {/* Main Canvas & Spatial Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left GIS Control & Dataset Panel (1 Col) */}
        <div className="space-y-5 lg:col-span-1">
          
          {/* CSV & GeoJSON Dropzone Card */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-accent-purple" />
                Upload Spatial Dataset
              </span>
              {uploadedFileName && (
                <button
                  onClick={handleClearUploaded}
                  className="text-text-muted hover:text-status-error text-[10px] font-semibold flex items-center gap-1 transition-colors"
                  title="Clear dataset"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Drag & Drop Area */}
            <label
              htmlFor="spatial-file-upload"
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all group select-none ${
                isDragging
                  ? "border-accent-purple bg-accent-purple/15 scale-[1.02] shadow-md shadow-accent-purple/10"
                  : "border-border-default hover:border-accent-purple/50 bg-bg-base/50"
              }`}
            >
              <FileSpreadsheet className={`w-8 h-8 text-accent-purple mb-2 transition-transform ${isDragging ? "animate-bounce scale-110" : "group-hover:scale-110"}`} />
              <span className="text-xs font-bold text-text-primary">
                {isDragging ? "Drop CSV or GeoJSON now" : uploadedFileName || "Drag & Drop CSV / GeoJSON"}
              </span>
              <span className="text-[10px] text-text-muted mt-0.5">
                .csv (auto geocoded) · .geojson · .json
              </span>
              <input
                ref={fileInputRef}
                id="spatial-file-upload"
                type="file"
                accept=".geojson,.json,.csv,.tsv,text/csv,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Quick Sample Dataset Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Try Sample CSV:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => processCSVData(parseCSVText(SAMPLE_CSV_GEOCODED), "chennai-hubs.csv")}
                  className="text-left text-[10px] font-medium p-2 bg-bg-base hover:bg-bg-elevated border border-border-subtle rounded-lg text-text-secondary transition-colors"
                >
                  With Geocodes
                </button>
                <button
                  type="button"
                  onClick={() => processCSVData(parseCSVText(SAMPLE_CSV_ADDRESSES), "addresses-unmapped.csv")}
                  className="text-left text-[10px] font-medium p-2 bg-bg-base hover:bg-bg-elevated border border-border-subtle rounded-lg text-text-secondary transition-colors"
                >
                  Address Batch
                </button>
              </div>
            </div>

            {/* Batch Geocode Trigger Banner (if unmapped addresses exist) */}
            {pendingAddressRows.length > 0 && (
              <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                  <Sparkles className="w-3.5 h-3.5 text-accent-purple animate-pulse" />
                  <span>{pendingAddressRows.length} Addresses Ready</span>
                </div>
                <p className="text-[10px] text-text-muted leading-tight">
                  Auto-resolve coordinates using the Wayline geocoding engine.
                </p>
                <PremiumButton
                  variant="primary"
                  size="sm"
                  onClick={handleBatchGeocode}
                  disabled={isGeocodingBatch}
                  className="w-full justify-center text-xs py-1.5"
                >
                  {isGeocodingBatch ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {geocodingProgress ? `${geocodingProgress.current}/${geocodingProgress.total}` : "Resolving..."}
                    </span>
                  ) : (
                    "Batch Geocode All"
                  )}
                </PremiumButton>
              </div>
            )}

            {/* Active Dataset Summary & Export Action */}
            {(parsedFeatures.length > 0 || parsedPolygons.length > 0) && (
              <div className="pt-2 border-t border-border-subtle space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Mapped Points:</span>
                  <span className="font-mono font-bold text-accent-purple">{parsedFeatures.length}</span>
                </div>
                {parsedPolygons.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Polygons:</span>
                    <span className="font-mono font-bold text-accent-purple">{parsedPolygons.length}</span>
                  </div>
                )}

                {/* Marker Color Selector */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Pin Theme:</span>
                  <div className="flex items-center gap-1.5">
                    {(["sage", "ochre", "teal"] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setPinColor(c);
                          setParsedFeatures((prev) => prev.map((f) => ({ ...f, color: c })));
                        }}
                        className={`w-4 h-4 rounded-full border transition-transform ${
                          c === "sage" ? "bg-[#436352]" : c === "ochre" ? "bg-[#C7944B]" : "bg-[#2D7A78]"
                        } ${pinColor === c ? "scale-125 border-white shadow-sm" : "border-transparent opacity-70"}`}
                        title={`Select ${c} markers`}
                      />
                    ))}
                  </div>
                </div>

                {/* Export GeoJSON Action */}
                <button
                  type="button"
                  onClick={handleExportGeoJSON}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 bg-bg-elevated hover:bg-border-default border border-border-subtle rounded-xl text-text-primary transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-accent-purple" />
                  Export Integrated GeoJSON
                </button>
              </div>
            )}
          </div>

          {/* GCC Official Road Network GIS Layer Card */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-4 shadow-sm space-y-3 select-none">
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
                  setToastMessage(next ? "GCC Road Network: Visible" : "GCC Road Network: Hidden");
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
                  <span className="truncate">Trunk / Highway</span>
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

        </div>

        {/* Right Map Canvas & Dataset Table (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* View Toggle Bar & Live Coordinate Inspector */}
          <div className="bg-bg-surface border border-border-default rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
            
            {/* Map vs Table View Selector */}
            <div className="flex items-center gap-1 bg-bg-base p-1 rounded-xl border border-border-subtle">
              <button
                type="button"
                onClick={() => setActiveTab("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "map"
                    ? "bg-bg-elevated text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-accent-purple" />
                GIS Canvas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "table"
                    ? "bg-bg-elevated text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5 text-accent-purple" />
                Data Inspector ({parsedFeatures.length || rawRows.length})
              </button>
            </div>

            {/* Real-time Click Inspector Badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-bg-base border border-border-subtle px-3 py-1.5 rounded-xl font-mono text-xs">
                <MapPin className="w-3.5 h-3.5 text-accent-purple flex-shrink-0" />
                <span className="text-text-primary">
                  {inspectedCoord[0].toFixed(5)}, {inspectedCoord[1].toFixed(5)}
                </span>
              </div>
              <button
                onClick={handleCopyCoord}
                className="p-2 rounded-xl border border-border-default bg-bg-surface hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors shadow-sm"
                title="Copy Coordinates"
              >
                {copiedCoord ? <Check className="w-4 h-4 text-status-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Tab 1: GIS Map Canvas */}
          {activeTab === "map" ? (
            <div className="h-[620px] w-full rounded-2xl overflow-hidden border border-border-default/90 ring-1 ring-accent-purple/20 shadow-xl shadow-black/10 relative bg-bg-surface">
              <Map
                center={center}
                markerPosition={markerPosition}
                markerAddress={markerAddress}
                onMapClick={handleMapClick}
                showStreets={showStreets}
                customFeatures={parsedFeatures}
                customPolygons={parsedPolygons}
              />

              {/* Floating Top Left Dataset Status */}
              <div className="absolute top-3.5 left-3.5 z-[400] flex items-center gap-2 pointer-events-auto select-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-surface/90 backdrop-blur-md border border-border-default/80 text-[11px] font-semibold text-text-primary shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                  <span>
                    {parsedFeatures.length > 0
                      ? `${parsedFeatures.length} Custom Features Rendered`
                      : "Interactive GIS Canvas"}
                  </span>
                  {showStreets && (
                    <span className="text-[10px] text-accent-purple bg-accent-purple-muted px-1.5 py-0.5 rounded font-mono">
                      Vector Streets
                    </span>
                  )}
                </div>
              </div>

              {/* Floating Top Right Controls */}
              <div className="absolute top-3.5 right-3.5 z-[400] flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => {
                    setMarkerPosition(null);
                    setMarkerAddress(null);
                    setParsedFeatures([]);
                    setParsedPolygons([]);
                    setRawRows([]);
                    setPendingAddressRows([]);
                    setUploadedFileName(null);
                    setToastMessage("Map canvas cleared");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-default text-xs font-semibold bg-bg-surface/90 text-text-secondary hover:text-status-error hover:border-status-error/40 backdrop-blur-md transition-all shadow-sm"
                  title="Clear all markers and loaded layers from map"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCenter([13.0843, 80.2705])}
                  className="px-2.5 py-1.5 rounded-xl border border-border-default text-xs font-semibold bg-bg-surface/90 text-text-secondary hover:text-text-primary backdrop-blur-md transition-all shadow-sm"
                  title="Reset viewport to default center"
                >
                  Reset Center
                </button>
              </div>

              {/* Floating Bottom Left Coordinate Ticker */}
              <div className="absolute bottom-3.5 left-3.5 z-[400] hidden sm:flex items-center gap-2 pointer-events-none select-none">
                <div className="px-2.5 py-1 rounded-lg bg-bg-surface/85 backdrop-blur-md border border-border-subtle text-[10px] font-mono text-text-muted shadow-sm">
                  Click map to inspect coordinates or drop CSV file anywhere
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Interactive Data Table Inspector */
            <div className="bg-bg-surface border border-border-default rounded-2xl p-4 shadow-sm h-[600px] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Dataset Inspector: {uploadedFileName || "No File Loaded"}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {parsedFeatures.length} mapped points · {pendingAddressRows.length} unmapped addresses
                  </p>
                </div>
                {parsedFeatures.length > 0 && (
                  <PremiumButton variant="primary" size="sm" onClick={handleExportGeoJSON}>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export GeoJSON
                  </PremiumButton>
                )}
              </div>

              <div className="flex-1 overflow-auto mt-3">
                {rawRows.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-bg-base sticky top-0 border-b border-border-default select-none text-text-secondary">
                      <tr>
                        <th className="p-2.5 font-bold">#</th>
                        {Object.keys(rawRows[0]).map((col) => (
                          <th key={col} className="p-2.5 font-bold uppercase tracking-wider text-[10px]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-text-primary">
                      {rawRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-bg-elevated/50 transition-colors">
                          <td className="p-2.5 font-mono text-text-muted">{idx + 1}</td>
                          {Object.values(row).map((val, cIdx) => (
                            <td key={cIdx} className="p-2.5 font-mono text-[11px] truncate max-w-[180px]">
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-text-muted gap-2">
                    <FileSpreadsheet className="w-10 h-10 text-border-strong stroke-[1.5]" />
                    <p className="text-xs">No dataset loaded yet.</p>
                    <p className="text-[11px] text-text-muted">
                      Upload a CSV or GeoJSON file in the left panel to inspect rows.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
