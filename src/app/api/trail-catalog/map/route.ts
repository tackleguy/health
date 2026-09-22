import { NextRequest, NextResponse } from "next/server";
import { searchCatalogMap } from "@/lib/trail-catalog/server";
import { parseCatalogFilters } from "@/lib/trail-catalog/search";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const filters = parseCatalogFilters(request.nextUrl.searchParams);
  if (request.nextUrl.searchParams.has("bbox") && !filters.bbox) {
    return NextResponse.json({ error: "The map area is invalid. Move the map and try again." }, { status: 400 });
  }
  try {
    return NextResponse.json(await searchCatalogMap(filters), { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "Map sections could not load. Try again or use the trail list." }, { status: 503 });
  }
}
