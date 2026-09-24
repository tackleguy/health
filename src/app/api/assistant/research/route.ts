import { NextRequest, NextResponse } from "next/server";
import { researchProductName } from "@/lib/assistant/product-recovery";
import { searchSources } from "@/lib/assistant/research";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const kind = request.nextUrl.searchParams.get("kind");
  if (q.length < 3 || q.length > 180 || !["trail", "product"].includes(kind ?? "")) return NextResponse.json({ error: "Enter a search between 3 and 180 characters." }, { status: 400 });
  try { return NextResponse.json(kind === "product" ? await researchProductName(q) : { sources: await searchSources(q, "trail") }, { headers: { "Cache-Control": kind === "product" ? "no-store" : "private, max-age=300" } }); }
  catch { return NextResponse.json({ error: kind === "trail" ? "Online trail research is unavailable. Saved route comparisons still work; try again shortly." : "Online search is unavailable. Paste a public product link, or try again." }, { status: 502 }); }
}
