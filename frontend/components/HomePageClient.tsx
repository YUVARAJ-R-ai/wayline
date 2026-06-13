"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-200 animate-pulse" />,
});

export default function HomePageClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.0843, 80.2705]);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>([13.0843, 80.2705]);
  const [markerAddress, setMarkerAddress] = useState<string | null>("Chennai, Tamil Nadu, India");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    try {
      const res = await fetch(`${apiBaseUrl}/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
          setMapCenter([data.lat, data.lng]);
          setMarkerPosition([data.lat, data.lng]);
          setMarkerAddress(data.address || searchQuery);
        } else {
          setError("Invalid response format from server.");
        }
      } else {
        if (res.status === 404) {
          setError("Location not found. Try a different search term.");
        } else {
          setError(`Error: ${res.statusText || 'Failed to fetch location.'}`);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative h-screen w-screen">
      <div className="absolute inset-0 z-0">
        <Map center={mapCenter} markerPosition={markerPosition} markerAddress={markerAddress} />
      </div>

      {/* --- START OF UPDATED SEARCH BAR --- */}
      <div className="absolute top-5 left-5 z-10 w-full max-w-md flex flex-col gap-2">
        <div className="relative">
          <button 
            onClick={handleSearch}
            className="absolute inset-y-0 left-0 flex items-center pl-4 hover:scale-105 transition-transform"
            disabled={loading}
          >
            <Search className={`h-5 w-5 ${loading ? 'text-blue-500 animate-pulse' : 'text-gray-500 hover:text-blue-500'}`} />
          </button>
          <input
            type="text"
            placeholder={loading ? "Searching..." : "Search for a location..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            disabled={loading}
            className="w-full rounded-full bg-white/90 py-3 pl-12 pr-4 text-gray-800 shadow-lg outline-none ring-1 ring-gray-300/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        {error && (
          <div className="rounded-2xl bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </div>
        )}
      </div>
      {/* --- END OF UPDATED SEARCH BAR --- */}
      
      <div className="absolute top-5 right-5 z-10">
        <Link 
          href="/login" 
          className="rounded-full bg-white/90 px-6 py-3 font-semibold text-gray-800 shadow-lg ring-1 ring-gray-300/50 backdrop-blur-sm transition-colors hover:bg-white"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}