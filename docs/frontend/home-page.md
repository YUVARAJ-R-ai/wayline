Of course. Excellent choice! Using OpenStreetMap (OSM) is a fantastic, open-source alternative. The library we'll use is **`react-leaflet`**, which is the standard and most popular way to integrate OSM into a React/Next.js application.

Your plan to eventually self-host the map tiles is smart, and this setup will make it incredibly easy to switch to your own tile server in the future.

Here is the complete, updated tutorial to replace Mapbox with OpenStreetMap.

---

### **Step 1: Uninstall Mapbox Dependencies**

First, let's remove the packages we no longer need. This keeps your project clean.

In your terminal, run:
```bash
npm uninstall react-map-gl mapbox-gl
```

### **Step 2: Install Leaflet Dependencies**

Now, let's install `react-leaflet` and its core library, `leaflet`. Since you are using TypeScript, we'll also install the type definitions.

```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```
*(`-D` installs `@types/leaflet` as a development dependency, which is correct).*

### **Step 3: Update Layout and Global CSS**

Leaflet requires its own CSS file. We need to swap the Mapbox CSS for the Leaflet CSS.

**File: `app/layout.tsx`**
```typescript
import './globals.css'
// REMOVE the Mapbox CSS import
// import 'mapbox-gl/dist/mapbox-gl.css'; 
// ADD the Leaflet CSS import
import 'leaflet/dist/leaflet.css';

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Wayline Maps',
  description: 'Find your way with Wayline',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```
*(Your `globals.css` file should still have the `html, body { height: 100% }` rule, which is perfect.)*

### **Step 4: Create the Reusable Leaflet Map Component**

This is the core of our new map. We will replace the contents of the `Map.tsx` component with Leaflet-specific code.

**Replace the entire contents of `components/Map.tsx` with this:**
```tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'; // Re-uses images from ~leaflet package
import 'leaflet-defaulticon-compatibility';

export function Map() {
  const position: [number, number] = [51.505, -0.09]; // Default position [latitude, longitude]

  return (
    <MapContainer 
      center={position} 
      zoom={13} 
      scrollWheelZoom={true} // Set to false to disable zoom on scroll
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        // This is the standard OpenStreetMap tile layer.
        // When you host your own, you will replace this URL.
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        // It's required to include attribution for OpenStreetMap.
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
```
*Note: I've added `leaflet-defaulticon-compatibility` which is a small helper to make sure the default map marker icons show up correctly in a modern build environment like Next.js. Let's install that now.*

Run this in your terminal:
```bash
npm install leaflet-defaulticon-compatibility
```

### **Step 5: Update the Homepage to Load the Map Correctly**

Leaflet is designed to run in the browser and directly interacts with the `window` object. This can cause errors during Server-Side Rendering (SSR) in Next.js.

The standard and best solution is to use **dynamic importing** to ensure the map component only ever renders on the client-side.

**Replace the entire contents of `app/page.tsx` with this:**
```tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import Link from "next/link"
import { Search } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/dashboard')
  }

  // Dynamically import the Map component with SSR turned off.
  // This is the crucial step to make Leaflet work with Next.js.
  const Map = dynamic(() => import('@/components/Map'), { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gray-200 animate-pulse" />
    ),
  });

  return (
    <main className="relative h-screen w-screen">
      {/* Map Component as the background */}
      <div className="absolute inset-0 z-0">
        <Map />
      </div>

      {/* Floating Search Bar (Top-Left) */}
      <div className="absolute top-5 left-5 z-10 w-full max-w-md">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search for a location..."
            className="w-full rounded-full bg-white/90 py-3 pl-12 pr-4 text-gray-800 shadow-lg outline-none ring-1 ring-gray-300/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      {/* Floating Sign In Button (Top-Right) */}
      <div className="absolute top-5 right-5 z-10">
        <Link 
          href="/login" 
          className="rounded-full bg-white/90 px-6 py-3 font-semibold text-gray-800 shadow-lg ring-1 ring-gray-300/50 backdrop-blur-sm transition-colors hover:bg-white"
        >
          Sign In
        </Link>
      </div>
    </main>
  )
}
```

### **Step 6: Stop and Restart Your Server**

It's always a good idea to restart the server after installing/uninstalling dependencies to ensure everything is loaded fresh.

Press `Ctrl + C` in your terminal, then run:
```bash
npm run dev
```

### **Check Your Work**

Go to `http://localhost:3000`. You should now see:

1.  A full-screen map centered on London, using the classic OpenStreetMap style.
2.  A marker on the map with a popup.
3.  The same floating search bar and "Sign In" button as before.
4.  The map should be fully interactive (pan, zoom).

You have now successfully swapped Mapbox for OpenStreetMap and built a flexible foundation for your mapping platform


## Errors:
[[home-page-e1]]