/**
 * NWS weather via api.weather.gov (no API key; User-Agent required).
 */

const NWS_BASE = "https://api.weather.gov";
const USER_AGENT = "OutdoorOS-TrailPlatform/1.0 (https://github.com/outdoor-os)";

export interface WeatherForecast {
  source: "nws";
  gridPoint?: { lat: number; lng: number };
  forecastUrl?: string;
  periods: WeatherPeriod[];
  disclaimer: string;
}

export interface WeatherPeriod {
  name: string;
  temperatureF?: number;
  windMph?: number;
  shortForecast: string;
}

interface NwsPointsResponse {
  properties?: {
    forecast?: string;
    forecastGridData?: string;
  };
}

interface NwsForecastResponse {
  properties?: {
    periods?: Array<{
      name?: string;
      temperature?: number;
      temperatureUnit?: string;
      windSpeed?: string;
      shortForecast?: string;
    }>;
  };
}

export async function fetchTrailWeather(
  lat: number,
  lng: number,
): Promise<WeatherForecast> {
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;

  const pointsRes = await fetch(
    `${NWS_BASE}/points/${roundedLat},${roundedLng}`,
    { headers: { Accept: "application/geo+json", "User-Agent": USER_AGENT } },
  );

  if (!pointsRes.ok) {
    throw new Error(`NWS points lookup failed: ${pointsRes.status}`);
  }

  const points = (await pointsRes.json()) as NwsPointsResponse;
  const forecastUrl = points.properties?.forecast;
  if (!forecastUrl) {
    throw new Error("NWS did not return a forecast URL for this location");
  }

  const forecastRes = await fetch(forecastUrl, {
    headers: { Accept: "application/geo+json", "User-Agent": USER_AGENT },
  });

  if (!forecastRes.ok) {
    throw new Error(`NWS forecast fetch failed: ${forecastRes.status}`);
  }

  const forecast = (await forecastRes.json()) as NwsForecastResponse;
  const periods = (forecast.properties?.periods ?? []).slice(0, 6).map((p) => ({
    name: p.name ?? "Period",
    temperatureF: p.temperatureUnit === "F" ? p.temperature : undefined,
    windMph: parseWindMph(p.windSpeed),
    shortForecast: p.shortForecast ?? "",
  }));

  return {
    source: "nws",
    gridPoint: { lat: roundedLat, lng: roundedLng },
    forecastUrl,
    periods,
    disclaimer:
      "Forecast from the U.S. National Weather Service. Verify at https://www.weather.gov before backcountry travel.",
  };
}

function parseWindMph(windSpeed?: string): number | undefined {
  if (!windSpeed) return undefined;
  const match = windSpeed.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}
