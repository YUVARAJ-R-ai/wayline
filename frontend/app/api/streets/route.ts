import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

let dbInstance: any = null;

function getDatabase() {
  if (dbInstance) return dbInstance;

  try {
    const { DatabaseSync } = require("node:sqlite");
    const possiblePaths = [
      path.join(process.cwd(), "data", "gcc_streets.sqlite"),
      path.join(process.cwd(), "frontend", "data", "gcc_streets.sqlite"),
      path.join(process.cwd(), "..", "data", "gcc_streets.sqlite")
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        dbInstance = new DatabaseSync(p, { readOnly: true });
        return dbInstance;
      }
    }
  } catch (err) {
    console.warn("node:sqlite initialization note:", err);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bboxStr = searchParams.get("bbox");
  const backendUrl = process.env.BACKEND_URL;

  // 1. If an external PostGIS service is explicitly configured and not localhost, try it
  if (backendUrl && !backendUrl.includes("localhost:3000")) {
    try {
      const res = await fetch(
        `${backendUrl}/api/streets${bboxStr ? `?bbox=${encodeURIComponent(bboxStr)}` : ""}`,
        { signal: AbortSignal.timeout(2500) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.features) && data.features.length > 0) {
          return NextResponse.json(data);
        }
      }
    } catch {
      // Fall through to local real GCC spatial database
    }
  }

  // 2. Parse Bounding Box [minLng, minLat, maxLng, maxLat] & Zoom Level
  let minLng = 80.15, minLat = 12.95, maxLng = 80.32, maxLat = 13.15;
  if (bboxStr) {
    const parts = bboxStr.split(",").map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      [minLng, minLat, maxLng, maxLat] = parts;
    }
  }

  const zoomParam = searchParams.get("zoom");
  const zoom = zoomParam ? parseFloat(zoomParam) : null;
  const lngSpan = Math.abs(maxLng - minLng);
  const latSpan = Math.abs(maxLat - minLat);
  const maxSpan = Math.max(lngSpan, latSpan);

  // 3. Query Official GCC Road Network with Level of Detail (LOD)
  const db = getDatabase();
  if (db) {
    try {
      let query = "";
      let params: any[] = [];

      // Level 1: Zoomed out (City / Metro view: zoom < 12.5 or span > 0.14)
      // Return ALL major highways, trunks, primary, secondary, and tertiary arterials across the whole metro area.
      if ((zoom !== null && zoom < 12.5) || (zoom === null && maxSpan > 0.14)) {
        query = `
          SELECT s.osm_id, s.fclass, s.name, s.ref, s.maxspeed, s.coords
          FROM streets s
          JOIN streets_idx idx ON s.id = idx.id
          WHERE idx.minX <= ? AND idx.maxX >= ? AND idx.minY <= ? AND idx.maxY >= ?
            AND s.fclass IN (
              'motorway', 'motorway_link', 
              'trunk', 'trunk_link', 
              'primary', 'primary_link', 
              'secondary', 'secondary_link', 
              'tertiary', 'tertiary_link'
            )
          LIMIT 12000
        `;
        params = [maxLng, minLng, maxLat, minLat];
      }
      // Level 2: Mid-level view (District / Area view: 12.5 <= zoom < 14 or 0.05 < span <= 0.14)
      else if ((zoom !== null && zoom < 14) || (zoom === null && maxSpan > 0.05)) {
        query = `
          SELECT s.osm_id, s.fclass, s.name, s.ref, s.maxspeed, s.coords
          FROM streets s
          JOIN streets_idx idx ON s.id = idx.id
          WHERE idx.minX <= ? AND idx.maxX >= ? AND idx.minY <= ? AND idx.maxY >= ?
            AND s.fclass NOT IN ('footway', 'steps', 'path', 'pedestrian', 'cycleway', 'service')
          LIMIT 8000
        `;
        params = [maxLng, minLng, maxLat, minLat];
      }
      // Level 3: Close-up (Street / Block view: zoom >= 14 or span <= 0.05)
      // Return all detailed local streets, living streets, service lanes, and alleyways.
      else {
        query = `
          SELECT s.osm_id, s.fclass, s.name, s.ref, s.maxspeed, s.coords
          FROM streets s
          JOIN streets_idx idx ON s.id = idx.id
          WHERE idx.minX <= ? AND idx.maxX >= ? AND idx.minY <= ? AND idx.maxY >= ?
          LIMIT 8000
        `;
        params = [maxLng, minLng, maxLat, minLat];
      }

      const stmt = db.prepare(query);
      const rows = stmt.all(...params) as Array<{
        osm_id: string;
        fclass: string;
        name: string;
        ref: string;
        maxspeed: number;
        coords: string;
      }>;

      const features = rows.map((row) => {
        let coordinates: Array<[number, number]> = [];
        try {
          coordinates = JSON.parse(row.coords);
        } catch {
          coordinates = [];
        }

        return {
          type: "Feature",
          properties: {
            osm_id: row.osm_id,
            name: row.name || (row.fclass ? `${row.fclass.replace('_', ' ')} road` : "Street"),
            fclass: row.fclass || "unclassified",
            ref: row.ref || "",
            maxspeed: row.maxspeed ? `${row.maxspeed} km/h` : null,
            source: "gcc_official_network"
          },
          geometry: {
            type: "LineString",
            coordinates
          }
        };
      });

      return NextResponse.json({
        type: "FeatureCollection",
        features
      });
    } catch (err) {
      console.error("Error querying GCC spatial database:", err);
    }
  }

  // 4. Return clean empty FeatureCollection if no data in viewport
  return NextResponse.json({
    type: "FeatureCollection",
    features: []
  });
}


