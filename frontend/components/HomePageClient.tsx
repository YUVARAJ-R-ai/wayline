"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function HomePageClient() {
  const Map = dynamic(() => import('@/components/Map'), { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-200 animate-pulse" />,
  });

  return (
    <main className="relative h-screen w-screen">
      <div className="absolute inset-0 z-0"><Map /></div>

      {/* --- START OF UPDATED SEARCH BAR --- */}
      <div className="absolute top-5 left-5 z-10 w-full max-w-md">
        <div className="relative">
          {/* Icon is absolutely positioned INSIDE the relative parent */}
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search for a location..."
            // The key is pl-12 (padding-left: 3rem) which pushes the text past the icon
            className="w-full rounded-full bg-white/90 py-3 pl-12 pr-4 text-gray-800 shadow-lg outline-none ring-1 ring-gray-300/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
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