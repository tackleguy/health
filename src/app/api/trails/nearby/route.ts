import { NextResponse } from "next/server";
import { getNearbyTrails, getTrails } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const radius = Number(searchParams.get("radius") ?? 250);
    const limit = Number(searchParams.get("limit") ?? 50);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const trails = await getTrails();
      return NextResponse.json({ trails, userLocation: null });
    }

    const trails = await getNearbyTrails(lat, lng, radius, limit);
    return NextResponse.json({
      trails,
      userLocation: { lat, lng },
    });
  } catch {
    return NextResponse.json({ trails: [], userLocation: null });
  }
}
