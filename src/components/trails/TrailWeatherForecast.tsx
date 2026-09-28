"use client";

import { useEffect, useState } from "react";
import type { WeatherForecast, WeatherPeriod } from "@/lib/weather/types";

interface TrailWeatherForecastProps {
  lat: number;
  lng: number;
  className?: string;
  /** "catalog" renders with the catalog design tokens (catalog.css). */
  variant?: "default" | "catalog";
  /** Describes what the coordinates are, e.g. "trail start" or "map pin". */
  locationLabel?: string;
}

function useForecast(lat: number, lng: number) {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setUnavailable(false);

      try {
        const response = await fetch(
          `/api/weather/forecast?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
        );
        if (!response.ok) throw new Error("forecast unavailable");

        const data = (await response.json()) as { forecast?: WeatherForecast };
        if (!data.forecast?.periods?.length) throw new Error("no periods");

        if (!cancelled) {
          setForecast(data.forecast);
          setFetchedAt(new Date());
        }
      } catch {
        if (!cancelled) {
          setForecast(null);
          setUnavailable(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return { forecast, fetchedAt, unavailable, loading };
}

function temperatures(period: WeatherPeriod) {
  if (period.temperatureF != null && period.lowF != null) return `${period.temperatureF}° / ${period.lowF}°F`;
  if (period.temperatureF != null) return `${period.temperatureF}°F`;
  if (period.lowF != null) return `Low ${period.lowF}°F`;
  return null;
}

function details(period: WeatherPeriod) {
  return [
    period.precipitationChance != null ? `${period.precipitationChance}% precip` : null,
    period.windMph != null ? `Wind to ${period.windMph} mph` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function TrailWeatherForecast({
  lat,
  lng,
  className = "",
  variant = "default",
  locationLabel = "trail start",
}: TrailWeatherForecastProps) {
  const { forecast, fetchedAt, unavailable, loading } = useForecast(lat, lng);
  const coordinates = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  const attribution = forecast && (
    <>
      {fetchedAt && <>Updated {fetchedAt.toLocaleString()}. </>}
      Source:{" "}
      <a href={forecast.forecastUrl ?? forecast.attribution.url} target="_blank" rel="noopener noreferrer">
        {forecast.attribution.label}
      </a>
      . {forecast.disclaimer}
    </>
  );

  if (variant === "catalog") {
    return (
      <section className={`catalog-weather ${className}`} aria-busy={loading}>
        <h2>7-day forecast</h2>
        <p className="catalog-muted">
          Near the {locationLabel} ({coordinates}). Conditions along the trail can differ.
        </p>
        {loading && <p role="status" className="catalog-muted">Loading forecast…</p>}
        {!loading && unavailable && (
          <p role="status" className="catalog-weather-empty">
            The forecast is unavailable right now. Check the land manager or a local forecast before you go.
          </p>
        )}
        {!loading && forecast && (
          <>
            <ol className="catalog-weather-days">
              {forecast.periods.map((period) => (
                <li key={period.name}>
                  <span className="catalog-weather-day">{period.name}</span>
                  <span className="catalog-weather-temp">{temperatures(period) ?? "—"}</span>
                  <span>{period.shortForecast}</span>
                  <small>{details(period)}</small>
                </li>
              ))}
            </ol>
            <p className="catalog-muted catalog-weather-source">{attribution}</p>
          </>
        )}
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-stone-200 bg-white p-6 shadow-sm ${className}`}
    >
      <h2 className="mb-1 font-semibold text-stone-900">Trailhead weather</h2>
      <p className="mb-4 text-xs text-stone-500">
        Forecast for {locationLabel} coordinates ({coordinates})
      </p>

      {loading && (
        <p className="text-sm text-stone-500">Loading forecast…</p>
      )}

      {!loading && unavailable && (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
          Information unavailable
        </p>
      )}

      {!loading && forecast && (
        <>
          <ul className="space-y-3">
            {forecast.periods.map((period) => (
              <li
                key={period.name}
                className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-stone-900">{period.name}</span>
                  {temperatures(period) && (
                    <span className="text-stone-700">{temperatures(period)}</span>
                  )}
                </div>
                <p className="mt-1 text-stone-600">{period.shortForecast}</p>
                {details(period) && (
                  <p className="mt-1 text-xs text-stone-500">{details(period)}</p>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-stone-500 [&_a]:underline [&_a:hover]:text-stone-700">
            {attribution}
          </p>
        </>
      )}
    </section>
  );
}
