import { NextRequest, NextResponse } from "next/server";
import { fetchSource, parseProduct } from "@/lib/assistant/research";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "Use this tool from the app." }, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 2400) return NextResponse.json({ error: "Product URL is too long." }, { status: 400 });
    const { url } = JSON.parse(body);
    if (typeof url !== "string" || url.length > 2000) return NextResponse.json({ error: "Enter a product URL." }, { status: 400 });
    const source = await fetchSource(url);
    return NextResponse.json(parseProduct(source.body, source.url), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read this page. Enter its specifications manually." }, { status: 422 }); }
}
