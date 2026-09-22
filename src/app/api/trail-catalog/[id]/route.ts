import { NextResponse } from "next/server";
import { getCatalogTrail } from "@/lib/trail-catalog/server";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const detail = await getCatalogTrail(id);
    if (!detail) return NextResponse.json({ error: "This trail section was not found." }, { status: 404 });
    return NextResponse.json({ trail: detail.trail, lines: detail.lines }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "The section’s map could not load. Try again or view its source record." }, { status: 503 });
  }
}
