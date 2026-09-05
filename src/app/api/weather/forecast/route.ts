import { NextResponse } from "next/server";
import { fetchTrailWeather } from "@/lib/weather/nws";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng query parameters required" },
      { status: 400 },
    );
  }

  const forecast = await fetchTrailWeather(lat, lng);
  return NextResponse.json({ forecast });
}
