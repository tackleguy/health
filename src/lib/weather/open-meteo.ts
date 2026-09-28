/**
 * Global daily forecast from Open-Meteo (no API key; CC BY 4.0 attribution required).
 */
import type { WeatherForecast, WeatherPeriod } from "./types";

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  latitude?: number;
  longitude?: number;
  daily?: {
    time?: string[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
  };
}

/** WMO weather interpretation codes used by Open-Meteo. */
const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorms",
  96: "Thunderstorms with hail",
  99: "Severe thunderstorms with hail",
};

export function describeWeatherCode(code: number | null | undefined) {
  return code == null ? "" : (WMO[code] ?? "Mixed conditions");
}

const round = (value: number | null | undefined) => (value == null ? undefined : Math.round(value));

export async function fetchOpenMeteoForecast(lat: number, lng: number): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "7",
  });
  const response = await fetch(`${OPEN_METEO}?${params}`, {
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Open-Meteo forecast failed: ${response.status}`);

  const data = (await response.json()) as OpenMeteoResponse;
  const daily = data.daily;
  const periods: WeatherPeriod[] = (daily?.time ?? []).map((date, i) => ({
    name: i === 0 ? "Today" : new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    temperatureF: round(daily?.temperature_2m_max?.[i]),
    lowF: round(daily?.temperature_2m_min?.[i]),
    windMph: round(daily?.wind_speed_10m_max?.[i]),
    precipitationChance: round(daily?.precipitation_probability_max?.[i]),
    shortForecast: describeWeatherCode(daily?.weather_code?.[i]),
  }));
  if (periods.length === 0) throw new Error("Open-Meteo returned no forecast days");

  return {
    source: "open-meteo",
    gridPoint: { lat: data.latitude ?? lat, lng: data.longitude ?? lng },
    periods,
    attribution: { label: "Open-Meteo.com (CC BY 4.0)", url: "https://open-meteo.com/" },
    disclaimer: "Model forecast; mountain conditions can differ sharply from the grid point.",
  };
}
