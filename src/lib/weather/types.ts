export interface WeatherPeriod {
  name: string;
  /** Daytime high (or the period temperature when only one is known). */
  temperatureF?: number;
  /** Overnight low. */
  lowF?: number;
  windMph?: number;
  /** Highest chance of precipitation in the period, 0–100. */
  precipitationChance?: number;
  shortForecast: string;
}

export interface WeatherForecast {
  source: "nws" | "open-meteo";
  gridPoint?: { lat: number; lng: number };
  forecastUrl?: string;
  periods: WeatherPeriod[];
  attribution: { label: string; url: string };
  disclaimer: string;
}
