"use client";

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents, Polyline } from 'react-leaflet'; 
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';

interface MapProps {
  center?: [number, number];
  markerPosition?: [number, number] | null;
  markerAddress?: string | null;
  polyline?: Array<[number, number]>;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  fromPosition?: [number, number] | null;
  toPosition?: [number, number] | null;
  fromAddress?: string | null;
  toAddress?: string | null;
  showStreets?: boolean;
  apiKey?: string | null;
}

const DEFAULT_CENTER: [number, number] = [13.0843, 80.2705];

// Below this zoom level the GCC street overlay is hidden — 94k streets are far
// too many to render at city scale, so we only fetch the current viewport once
// the user is zoomed in enough for the data to be useful.
const STREET_ZOOM_THRESHOLD = 14;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper to create custom SVG pin icons
const createCustomIcon = (color: string) => {
  if (typeof window === 'undefined') return undefined;
  return L.divIcon({
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" style="width: 32px; height: 32px; filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.3));">
          <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" clip-rule="evenodd" />
        </svg>
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      animate: true,
      duration: 1.5
    });
  }, [center[0], center[1], zoom, map]);
  return null;
}

// Fit map bounds to the polyline route
function FitRouteBounds({ polyline }: { polyline?: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (polyline && polyline.length > 0) {
      const bounds = L.latLngBounds(polyline);
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
        duration: 1.5
      });
    }
  }, [polyline, map]);
  return null;
}

// Capture map click events
function MapClickEvents({ onMapClick }: { onMapClick?: (latlng: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng);
    }
  });
  return null;
}

// Greater Chennai Corporation street overlay. Fetches the streets within the
// current viewport from /api/streets (bbox-filtered) whenever the map moves,
// and only while zoomed in past STREET_ZOOM_THRESHOLD. Manages its own Leaflet
// GeoJSON layer imperatively so it can be replaced cheaply on each pan/zoom.
function StreetOverlay({ show, apiKey }: { show?: boolean; apiKey?: string | null }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  const clearLayer = () => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
  };

  const refresh = async () => {
    if (!show || map.getZoom() < STREET_ZOOM_THRESHOLD) {
      clearLayer();
      return;
    }
    const b = map.getBounds();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const headers: Record<string, string> = {};
    if (apiKey && apiKey.trim()) headers['x-api-key'] = apiKey.trim();

    try {
      const res = await fetch(`${API_BASE_URL}/api/streets?bbox=${bbox}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      clearLayer();
      layerRef.current = L.geoJSON(data, {
        style: { color: '#f59e0b', weight: 1.5, opacity: 0.7 },
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          if (p.name) {
            layer.bindTooltip(
              `<strong>${p.name}</strong>${p.area ? ` · ${p.area}` : ''}${p.ward ? ` · Ward ${p.ward}` : ''}`,
              { sticky: true }
            );
          }
        }
      }).addTo(map);
    } catch {
      // Overlay is best-effort; failures should never break the map.
    }
  };

  useMapEvents({ moveend: refresh, zoomend: refresh });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    refresh();
    return () => clearLayer();
  }, [show, apiKey]);

  return null;
}

export default function Map({
  center = DEFAULT_CENTER,
  markerPosition = DEFAULT_CENTER,
  markerAddress = "Chennai, Tamil Nadu, India",
  polyline,
  onMapClick,
  fromPosition,
  toPosition,
  fromAddress,
  toAddress,
  showStreets,
  apiKey
}: MapProps) {
  const markerRef = useRef<L.Marker>(null);
  const fromMarkerRef = useRef<L.Marker>(null);
  const toMarkerRef = useRef<L.Marker>(null);

  // Auto-open popups on update
  useEffect(() => {
    if (markerPosition && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [markerPosition, markerAddress]);

  useEffect(() => {
    if (fromPosition && fromMarkerRef.current) {
      fromMarkerRef.current.openPopup();
    }
  }, [fromPosition, fromAddress]);

  useEffect(() => {
    if (toPosition && toMarkerRef.current) {
      toMarkerRef.current.openPopup();
    }
  }, [toPosition, toAddress]);

  const greenIcon = createCustomIcon('#2e7d56'); // status-success
  const redIcon = createCustomIcon('#b83a3a');   // status-error

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false} // THIS LINE IS CRITICAL
    >
      <ChangeView center={center} zoom={13} />
      <FitRouteBounds polyline={polyline} />
      <MapClickEvents onMapClick={onMapClick} />
      <StreetOverlay show={showStreets} apiKey={apiKey} />
      <ZoomControl position="bottomright" /> 
      
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Search landing marker */}
      {markerPosition && !fromPosition && !toPosition && (
        <Marker position={markerPosition} ref={markerRef}>
          {markerAddress && (
            <Popup>
              {markerAddress}
            </Popup>
          )}
        </Marker>
      )}

      {/* From marker (green) */}
      {fromPosition && (
        <Marker position={fromPosition} icon={greenIcon} ref={fromMarkerRef}>
          <Popup>
            <span className="font-bold text-status-success">Start</span>
            {fromAddress && <div className="text-xs text-text-secondary mt-1">{fromAddress}</div>}
          </Popup>
        </Marker>
      )}

      {/* To marker (red) */}
      {toPosition && (
        <Marker position={toPosition} icon={redIcon} ref={toMarkerRef}>
          <Popup>
            <span className="font-bold text-status-error">Destination</span>
            {toAddress && <div className="text-xs text-text-secondary mt-1">{toAddress}</div>}
          </Popup>
        </Marker>
      )}

      {/* Polyline Route */}
      {polyline && polyline.length > 0 && (
        <Polyline positions={polyline} color="#3b82f6" weight={4} />
      )}
    </MapContainer>
  );
}