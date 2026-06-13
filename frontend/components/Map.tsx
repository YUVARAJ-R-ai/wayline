"use client";

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet'; 
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';

interface MapProps {
  center?: [number, number];
  markerPosition?: [number, number] | null;
  markerAddress?: string | null;
}

const DEFAULT_CENTER: [number, number] = [13.0843, 80.2705];

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

export default function Map({
  center = DEFAULT_CENTER,
  markerPosition = DEFAULT_CENTER,
  markerAddress = "Chennai, Tamil Nadu, India"
}: MapProps) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    // Open the popup automatically when the marker position or address changes
    if (markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [markerPosition, markerAddress]);

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false} // THIS LINE IS CRITICAL
    >
      <ChangeView center={center} zoom={13} />
      <ZoomControl position="bottomright" /> 
      
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {markerPosition && (
        <Marker position={markerPosition} ref={markerRef}>
          {markerAddress && (
            <Popup>
              {markerAddress}
            </Popup>
          )}
        </Marker>
      )}
    </MapContainer>
  );
}