import { NextRequest, NextResponse } from "next/server";
import { searchSources } from "@/lib/assistant/research";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const kind = request.nextUrl.searchParams.get("kind");
  if (q.length < 3 || q.length > 180 || !["trail", "product"].includes(kind ?? "")) return NextResponse.json({ error: "Enter a search between 3 and 180 characters." }, { status: 400 });
  try { return NextResponse.json({ sources: await searchSources(q, kind as "trail" | "product") }, { headers: { "Cache-Control": "private, max-age=300" } }); }
  catch { return NextResponse.json({ error: "Online search is unavailable. Use the search link or an official product URL below." }, { status: 502 }); }
}
