import { NextRequest, NextResponse } from "next/server";
import { parsePlaces } from "@/lib/assistant/places";
import { fetchSource } from "@/lib/assistant/research";
import type { TripPlace } from "@/lib/assistant/types";
export const runtime = "nodejs";
const cache = new Map<string, { at: number; places: TripPlace[] }>();
const pending = new Map<string, Promise<TripPlace[]>>();
let lastRequest = 0;
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 150) return NextResponse.json({ error: "Enter a place or landmark (2–150 characters)." }, { status: 400 });
  const key = q.toLocaleLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 86400_000) return NextResponse.json({ places: hit.places });
  try {
    let task = pending.get(key);
    if (!task) {
      if (Date.now() - lastRequest < 1000) return NextResponse.json({ error: "Please wait a moment and search again." }, { status: 429, headers: { "Retry-After": "1" } });
      lastRequest = Date.now();
      task = (async () => {
        const endpoint = new URL(process.env.PHOTON_API_URL || "https://photon.komoot.io/api/");
        endpoint.searchParams.set("q", q); endpoint.searchParams.set("limit", "12"); endpoint.searchParams.set("lang", "en");
        const result = await fetchSource(endpoint.href);
        const places = parsePlaces(JSON.parse(result.body));
        if (cache.size >= 500) cache.delete(cache.keys().next().value!);
        cache.set(key, { at: Date.now(), places });
        return places;
      })();
      pending.set(key, task);
      void task.finally(() => pending.delete(key)).catch(() => {});
    }
    return NextResponse.json({ places: await task });
  } catch {
    return NextResponse.json({ error: "Place lookup is unavailable. Retry, or use a more specific town, park or landmark. No wider area was substituted." }, { status: 503 });
  }
}
