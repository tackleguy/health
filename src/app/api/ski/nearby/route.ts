import { NextResponse } from "next/server";
import { getSkiArea, searchSkiAreas, searchSkiAreasNearby } from "@/lib/ski";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const q = searchParams.get("q") ?? "";
    const id = searchParams.get("id") ?? "";
    const radius = Number(searchParams.get("radius") ?? 150);
    const limit = Number(searchParams.get("limit") ?? 30);

    if (id.trim()) {
      const area = await getSkiArea(id);
      return NextResponse.json({ areas: area ? [area] : [] });
    }

    if (q.trim()) {
      const areas = await searchSkiAreas(q, limit);
      return NextResponse.json({ areas });
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const areas = await searchSkiAreas("ski resort", 20);
      return NextResponse.json({ areas, userLocation: null });
    }

    const areas = await searchSkiAreasNearby(lat, lng, radius, limit);
    return NextResponse.json({ areas, userLocation: { lat, lng } });
  } catch {
    return NextResponse.json({ areas: [], userLocation: null });
  }
}
