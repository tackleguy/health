import { NextResponse } from "next/server";
import { getNearbyTrails } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const radius = Number(searchParams.get("radius") ?? 50);
    const limit = Number(searchParams.get("limit") ?? 50);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "lat and lng query parameters required", trails: [] },
        { status: 400 },
      );
    }

    const trails = await getNearbyTrails(lat, lng, radius, limit);
    return NextResponse.json({
      trails,
      userLocation: { lat, lng },
      radius_km: radius,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nearby search failed";
    return NextResponse.json({ error: message, trails: [] }, { status: 500 });
  }
}
