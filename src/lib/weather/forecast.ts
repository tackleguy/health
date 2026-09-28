import { fetchNwsForecast } from "./nws";
import { fetchOpenMeteoForecast } from "./open-meteo";
import type { WeatherForecast } from "./types";

/** NWS where it has coverage (U.S.), otherwise the global Open-Meteo model. */
export async function fetchTrailWeather(lat: number, lng: number): Promise<WeatherForecast> {
  try {
    return await fetchNwsForecast(lat, lng);
  } catch {
    return fetchOpenMeteoForecast(lat, lng);
  }
}
