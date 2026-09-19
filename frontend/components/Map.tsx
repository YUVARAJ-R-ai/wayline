"use client";

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents, Polyline, Polygon } from 'react-leaflet'; 
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';

export interface CustomSpatialFeature {
  lat: number;
  lng: number;
  label?: string;
  properties?: Record<string, any>;
  color?: string;
}

export interface CustomSpatialPolygon {
  coordinates: Array<[number, number]>;
  label?: string;
  color?: string;
}

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
  customFeatures?: CustomSpatialFeature[];
  customPolygons?: CustomSpatialPolygon[];
  checkpoints?: Array<{ lat: number; lng: number; label?: string }>;
}

const DEFAULT_CENTER: [number, number] = [13.0843, 80.2705];
const STREET_ZOOM_THRESHOLD = 9;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

// Fit map bounds to polyline route
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

// Fit map bounds to custom uploaded features
function FitFeaturesBounds({ features }: { features?: CustomSpatialFeature[] }) {
  const map = useMap();
  useEffect(() => {
    if (features && features.length > 0) {
      const coords = features.map((f) => [f.lat, f.lng] as [number, number]);
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
        duration: 1.2,
      });
    }
  }, [features, map]);
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

function StreetOverlay({ show, apiKey }: { show?: boolean; apiKey?: string | null }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  const clearLayer = () => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
  };

  const getStreetStyle = (feature: any) => {
    const fclass = feature?.properties?.fclass || feature?.properties?.highway;
    const currentZoom = map.getZoom();
    const isZoomedOut = currentZoom < 12;

    if (fclass === 'motorway' || fclass === 'trunk') {
      return { color: '#f59e0b', weight: isZoomedOut ? 2.2 : 3.2, opacity: 0.95 }; // Amber
    }
    if (fclass === 'primary' || fclass === 'primary_link') {
      return { color: '#38bdf8', weight: isZoomedOut ? 1.8 : 2.6, opacity: 0.9 }; // Cyan
    }
    if (fclass === 'secondary' || fclass === 'secondary_link') {
      return { color: '#22c55e', weight: isZoomedOut ? 1.4 : 2.0, opacity: 0.85 }; // Emerald
    }
    if (fclass === 'tertiary' || fclass === 'tertiary_link') {
      return { color: '#a78bfa', weight: isZoomedOut ? 1.1 : 1.6, opacity: 0.8 }; // Purple
    }
    // Residential, service, living street, unclassified
    return { color: '#e11d48', weight: isZoomedOut ? 0.9 : 1.3, opacity: 0.7 };
  };

  const refresh = async () => {
    if (!show || map.getZoom() < STREET_ZOOM_THRESHOLD) {
      clearLayer();
      return;
    }
    const b = map.getBounds();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const zoom = Math.round(map.getZoom() * 10) / 10;
    const headers: Record<string, string> = {};
    if (apiKey && apiKey.trim()) headers['x-api-key'] = apiKey.trim();

    try {
      const res = await fetch(`${API_BASE_URL}/api/streets?bbox=${bbox}&zoom=${zoom}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      clearLayer();
      if (!data || !Array.isArray(data.features) || data.features.length === 0) return;

      layerRef.current = L.geoJSON(data, {
        style: (feature) => getStreetStyle(feature),
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          const name = p.name || `${(p.fclass || 'street').replace('_', ' ')}`;
          const tag = p.ref ? ` [${p.ref}]` : '';
          const meta = [
            p.fclass ? `Class: ${p.fclass.replace('_', ' ')}` : '',
            p.maxspeed ? `Speed: ${p.maxspeed}` : '',
            p.osm_id ? `OSM: ${p.osm_id}` : ''
          ]
            .filter(Boolean)
            .join(' · ');

          layer.bindTooltip(
            `<div style="font-family: inherit; font-size: 11px; padding: 2px 4px;">
              <strong style="color: #f59e0b;">${name}${tag}</strong>
              ${meta ? `<div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">${meta}</div>` : ''}
            </div>`,
            { sticky: true, className: 'wayline-map-tooltip' }
          );

          layer.on({
            mouseover: (e) => {
              const target = e.target;
              target.setStyle({ weight: 4.5, opacity: 1, color: '#facc15' });
              if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                target.bringToFront();
              }
            },
            mouseout: (e) => {
              const target = e.target;
              target.setStyle(getStreetStyle(feature));
            }
          });
        }
      }).addTo(map);
    } catch {
      // Overlay is best-effort
    }
  };

  useMapEvents({ moveend: refresh, zoomend: refresh });

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
  apiKey,
  customFeatures = [],
  customPolygons = [],
  checkpoints = []
}: MapProps) {
  const markerRef = useRef<L.Marker>(null);
  const fromMarkerRef = useRef<L.Marker>(null);
  const toMarkerRef = useRef<L.Marker>(null);

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

  const sageIcon = createCustomIcon('#436352'); // Brand Sage
  const redIcon = createCustomIcon('#B84343');   // Status Error Red
  const ochreIcon = createCustomIcon('#C7944B'); // Ochre Warning
  const tealIcon = createCustomIcon('#2D7A78');  // Teal Accent

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <ChangeView center={center} zoom={13} />
      <FitRouteBounds polyline={polyline} />
      <FitFeaturesBounds features={customFeatures} />
      <MapClickEvents onMapClick={onMapClick} />
      <StreetOverlay show={showStreets} apiKey={apiKey} />
      <ZoomControl position="bottomright" /> 
      
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Search landing marker */}
      {markerPosition && !fromPosition && !toPosition && customFeatures.length === 0 && (
        <Marker 
          position={markerPosition} 
          icon={sageIcon} 
          ref={markerRef}
          draggable={false}
        >
          {markerAddress && (
            <Popup>
              {markerAddress}
            </Popup>
          )}
        </Marker>
      )}

      {/* From marker (Sage) */}
      {fromPosition && (
        <Marker 
          position={fromPosition} 
          icon={sageIcon} 
          ref={fromMarkerRef}
          draggable={false}
        >
          <Popup>
            <span className="font-bold text-accent-purple">Start / Origin</span>
            {fromAddress && <div className="text-xs text-text-secondary mt-1">{fromAddress}</div>}
          </Popup>
        </Marker>
      )}

      {/* Intermediate Checkpoint Markers */}
      {checkpoints.map((cp, idx) => (
        <Marker 
          key={`cp-${idx}-${cp.lat}-${cp.lng}`} 
          position={[cp.lat, cp.lng]} 
          icon={ochreIcon}
          draggable={false}
        >
          <Popup>
            <span className="font-bold text-status-warning">Stop #{idx + 1}</span>
            {cp.label && <div className="text-xs text-text-secondary mt-1">{cp.label}</div>}
          </Popup>
        </Marker>
      ))}

      {/* To marker (Red) */}
      {toPosition && (
        <Marker 
          position={toPosition} 
          icon={redIcon} 
          ref={toMarkerRef}
          draggable={false}
        >
          <Popup>
            <span className="font-bold text-status-error">Destination</span>
            {toAddress && <div className="text-xs text-text-secondary mt-1">{toAddress}</div>}
          </Popup>
        </Marker>
      )}

      {/* Uploaded CSV / Custom Feature Markers */}
      {customFeatures.map((feat, idx) => {
        const markerIcon = feat.color === 'ochre' ? ochreIcon : feat.color === 'teal' ? tealIcon : sageIcon;
        return (
          <Marker key={`feat-${idx}-${feat.lat}-${feat.lng}`} position={[feat.lat, feat.lng]} icon={markerIcon} draggable={false}>
            <Popup>
              <div className="p-1 max-w-[220px]">
                <div className="font-bold text-text-primary text-sm border-b border-border-subtle pb-1 mb-1.5">
                  {feat.label || `Point #${idx + 1}`}
                </div>
                <div className="text-[11px] text-text-secondary font-mono mb-1">
                  Lat: {feat.lat.toFixed(5)}, Lng: {feat.lng.toFixed(5)}
                </div>
                {feat.properties && Object.keys(feat.properties).length > 0 && (
                  <div className="space-y-0.5 mt-1 pt-1 border-t border-border-subtle text-[10px] text-text-muted">
                    {Object.entries(feat.properties).slice(0, 4).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 truncate">
                        <span className="font-semibold text-text-secondary">{k}:</span>
                        <span className="truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Uploaded Custom Polygons */}
      {customPolygons.map((poly, idx) => (
        <Polygon
          key={`poly-${idx}`}
          positions={poly.coordinates}
          pathOptions={{
            color: poly.color || '#436352',
            fillColor: poly.color || '#436352',
            fillOpacity: 0.18,
            weight: 2,
          }}
        >
          {poly.label && <Popup>{poly.label}</Popup>}
        </Polygon>
      ))}

      {/* Polyline Route */}
      {polyline && polyline.length > 0 && (
        <React.Fragment key={`route-${polyline.length}-${polyline[0]?.[0]}-${polyline[polyline.length - 1]?.[0]}-${polyline[0]?.[1]}`}>
          <Polyline positions={polyline} color="#1F2A1F" weight={7} opacity={0.8} />
          <Polyline positions={polyline} color="#436352" weight={4} opacity={1} />
        </React.Fragment>
      )}
    </MapContainer>
  );
}