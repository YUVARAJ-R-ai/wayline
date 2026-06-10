"use client";

import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet'; 
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';


// The only change is adding "default" here
export default function Map() {
  const position: [number, number] = [13.0843, 80.2705];

  return (
    <MapContainer 
      center={position} 
      zoom={13} 
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false} // THIS LINE IS CRITICAL
    >
    <ZoomControl position="bottomright" /> 
    
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={position}>
        <Popup>
          A pretty CSS3 popup. <br /> Easily customizable.
        </Popup>
      </Marker>
    </MapContainer>
  );
}