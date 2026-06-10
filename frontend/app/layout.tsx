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