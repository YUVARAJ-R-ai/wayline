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

    // Empty default = same-origin: in production the browser hits /api/* on the
    // nginx host. NEXT_PUBLIC_API_URL is only set (to a full URL) in local dev.
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";

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
    <main className="relative h-screen w-screen bg-bg-base overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Map center={mapCenter} markerPosition={markerPosition} markerAddress={markerAddress} />
      </div>

      {/* Floating unified top bar header */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-3xl flex flex-col gap-2">
        <div className="flex items-center justify-between p-2 pl-4 pr-3 bg-bg-surface/90 border border-border-subtle rounded-2xl shadow-glass backdrop-blur-md transition-all duration-200">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="border border-accent-purple/35 text-accent-purple p-1.5 rounded-xl flex items-center justify-center bg-accent-purple/5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <rect width="18" height="18" x="3" y="3" rx="4" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                <polygon points="12,9 13.5,12 12,15 10.5,12" fill="currentColor" fillOpacity={0.1} />
                <line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5" />
                <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-text-primary text-lg tracking-tight select-none">Wayline</span>
          </div>

          {/* Search bar inside the header */}
          <div className="flex-1 max-w-md relative mx-3">
            <button 
              onClick={handleSearch}
              className="absolute inset-y-0 left-0 flex items-center pl-3 hover:scale-105 transition-transform"
              disabled={loading}
            >
              <Search className={`h-4 w-4 ${loading ? 'text-accent-purple animate-pulse' : 'text-text-muted hover:text-accent-purple'}`} />
            </button>
            <input
              type="text"
              placeholder={loading ? "Searching..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              disabled={loading}
              className="w-full rounded-full bg-bg-elevated/55 border border-border-subtle/20 py-2 pl-9 pr-4 text-text-primary placeholder-text-muted/70 focus:ring-1 focus:ring-accent-purple/30 outline-none text-sm transition-all focus:bg-bg-elevated/80"
            />
          </div>

          {/* Sign In Button */}
          <div className="flex-shrink-0">
            <Link 
              href="/login" 
              className="bg-btn-signin-bg text-btn-signin-text border border-btn-signin-border hover:bg-btn-signin-hover font-semibold py-1.5 px-5 rounded-full text-sm transition-all flex items-center justify-center select-none"
            >
              Sign in
            </Link>
          </div>
        </div>

        {error && (
          <div className="self-center max-w-sm rounded-xl bg-status-error/95 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm text-center select-none animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </div>
        )}
      </div>

      {/* Central Typographic branding */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none z-10">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">
          Find your <span className="text-accent-purple font-semibold">wayline</span>
        </h2>
        <p className="text-base sm:text-lg text-text-secondary mt-3 font-medium tracking-wide">
          Navigate smarter
        </p>
      </div>

    </main>
  );
}