import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/trail-catalog/server";
import { parseCatalogFilters } from "@/lib/trail-catalog/search";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const result = await searchCatalog(parseCatalogFilters(request.nextUrl.searchParams));
    return NextResponse.json(result,{ headers:{ "Cache-Control":"public, max-age=300" } });
  } catch {
    return NextResponse.json({ error:"The trail catalog is unavailable. Please try again." },{ status:503 });
  }
}
