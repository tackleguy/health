import { NextResponse } from "next/server";
import { searchTrailsAndParks } from "@/lib/data";
import { searchSkiAreas } from "@/lib/ski";
import type { SearchResult } from "@/lib/types";
import { searchCatalog } from "@/lib/trail-catalog/server";
import { countryName } from "@/lib/trail-catalog/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim().slice(0,180);
    if (q.length < 2) return NextResponse.json({ results:[] });

    const [{ parks, trails }, skiAreas, catalog] = await Promise.all([
      searchTrailsAndParks(q).catch(()=>({ parks:[],trails:[] })),
      searchSkiAreas(q, 6).catch(()=>[]),
      searchCatalog({ q,limit:6 }).catch(()=>null),
    ]);

    const results: (SearchResult & { lat?: number; lng?: number })[] = [
      ...(catalog?.trails ?? []).map(trail=>({ id:trail.id,type:"trail" as const,name:trail.name,subtitle:`${trail.region ?? countryName(trail.country)} · ${trail.kind === "route" ? "Through-hike" : "Trail section"}`,href:`/explore/trails/${trail.id}`,lat:trail.latitude,lng:trail.longitude })),
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
