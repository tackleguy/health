import { NextResponse } from "next/server";
import { searchTrailsAndParks } from "@/lib/data";
import { searchSkiAreas } from "@/lib/ski";
import type { SearchResult } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    const [{ parks, trails }, skiAreas] = await Promise.all([
      searchTrailsAndParks(q),
      searchSkiAreas(q, 6),
    ]);

    const results: (SearchResult & { lat?: number; lng?: number })[] = [
      ...parks.map((park) => ({
        id: park.id,
        type: "park" as const,
        name: park.park_name,
        subtitle: `${park.state}, ${park.country}`,
        href: `/parks/${park.id}`,
      })),
      ...trails.map((trail) => ({
        id: trail.id,
        type: "trail" as const,
        name: trail.trail_name,
        subtitle: trail.park
          ? `${trail.park.park_name}, ${trail.park.state}`
          : "Trail",
        href: `/explore/trails/${trail.id}`,
      })),
      ...skiAreas.map((area) => ({
        id: area.id,
        type: "resort" as const,
        name: area.name,
        subtitle: [area.region, area.country].filter(Boolean).join(", ") || "Ski resort",
        href: `/explore/ski?area=${area.id}`,
        lat: area.lat,
        lng: area.lng,
      })),
    ];

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
