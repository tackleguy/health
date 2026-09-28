import { NextResponse } from "next/server";
import { fetchTrailWeather } from "@/lib/weather/forecast";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json(
      { error: "lat and lng query parameters required" },
      { status: 400 },
    );
  }

  try {
    const forecast = await fetchTrailWeather(Math.round(lat * 1000) / 1000, Math.round(lng * 1000) / 1000);
    return NextResponse.json(
      { forecast },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ error: "The forecast is unavailable right now." }, { status: 502 });
  }
}
