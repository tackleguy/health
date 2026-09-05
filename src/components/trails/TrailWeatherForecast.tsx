"use client";

import { useEffect, useState } from "react";
import type { WeatherForecast } from "@/lib/weather/nws";

interface TrailWeatherForecastProps {
  lat: number;
  lng: number;
  className?: string;
}

export function TrailWeatherForecast({ lat, lng, className = "" }: TrailWeatherForecastProps) {
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

  return (
    <section
      className={`rounded-2xl border border-stone-200 bg-white p-6 shadow-sm ${className}`}
    >
      <h2 className="mb-1 font-semibold text-stone-900">Trailhead weather</h2>
      <p className="mb-4 text-xs text-stone-500">
        Forecast for trail start coordinates ({lat.toFixed(4)}, {lng.toFixed(4)})
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
                  {period.temperatureF != null && (
                    <span className="text-stone-700">{period.temperatureF}°F</span>
                  )}
                </div>
                <p className="mt-1 text-stone-600">{period.shortForecast}</p>
                {period.windMph != null && (
                  <p className="mt-1 text-xs text-stone-500">Wind ~{period.windMph} mph</p>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-stone-500">
            {fetchedAt && (
              <>
                Updated {fetchedAt.toLocaleString()}.{" "}
              </>
            )}
            Source:{" "}
            <a
              href={forecast.forecastUrl ?? "https://www.weather.gov"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-stone-700"
            >
              U.S. National Weather Service
            </a>
            . {forecast.disclaimer}
          </p>
        </>
      )}
    </section>
  );
}
