import { NextResponse } from "next/server";
import { getCatalogTrail } from "@/lib/trail-catalog/server";
import { nearbyCatalogPhotos } from "@/lib/trail-catalog/photos";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const detail = await getCatalogTrail(id);
    if (!detail) return NextResponse.json({ error: "Trail section not found." }, { status: 404 });
    const photos = await nearbyCatalogPhotos(detail.trail.latitude, detail.trail.longitude);
    return NextResponse.json({ photos, radiusMeters: 1500 }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ error: "The photo source is unavailable right now. Try again shortly." }, { status: 503 });
  }
}
