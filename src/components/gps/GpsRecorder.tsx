"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AltimeterGauge } from "@/components/gps/AltimeterGauge";
import { ElevationChart } from "@/components/gps/ElevationChart";
import { GpsStatsPanel } from "@/components/gps/GpsStatsPanel";
import { LiveTrackMap } from "@/components/gps/LiveTrackMap";
import { SpeedometerGauge } from "@/components/gps/SpeedometerGauge";
import { useGpsTrack } from "@/components/gps/useGpsTrack";
import { formatPace } from "@/lib/gps";
import { ACTIVITY_ICONS, ACTIVITY_LABELS, type ActivityType } from "@/lib/types";

interface GpsRecorderProps {
  activityType: ActivityType;
  title: string;
  trailId?: string;
  skiAreaId?: string;
  skiAreaName?: string;
  autoStart?: boolean;
}

export function GpsRecorder({
  activityType,
  title,
  trailId,
  skiAreaId,
  skiAreaName,
  autoStart = false,
}: GpsRecorderProps) {
  const router = useRouter();
  const gps = useGpsTrack();
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (autoStart && gps.state === "idle") {
      gps.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (gps.state !== "saving") return;

    async function save() {
      const startedAt = gps.points[0]?.timestamp ?? Date.now();
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: activityType,
          title,
          distance_m: gps.distanceM,
          duration_sec: gps.durationSec,
          elevation_gain_ft: gps.elevationGainFt,
          route_geojson: gps.routeGeoJSON,
          trail_id: trailId ?? null,
          ski_area_id: skiAreaId ?? null,
          ski_area_name: skiAreaName ?? null,
          started_at: new Date(startedAt).toISOString(),
          ended_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? "Failed to save activity");
        gps.setState("idle");
        return;
      }

      const { activity } = await res.json();
      router.push(`/activities/${activity.id}`);
    }

    save();
  }, [gps.state]);

  function handleFinish() {
    if (gps.points.length < 2) {
      if (!window.confirm("Track is very short. Save anyway?")) return;
    }
    gps.stop();
  }

  if (gps.error && gps.state === "idle") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-4xl">📍</p>
        <h1 className="mt-4 text-xl font-bold text-stone-900">Location access needed</h1>
        <p className="mt-2 text-stone-600">{gps.error}</p>
        <p className="mt-2 text-sm text-stone-500">
          Enable location in browser settings, then try again. GPS requires HTTPS or localhost.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => gps.start()}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/record/manual")}
            className="rounded-xl border border-stone-200 px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Log manually
          </button>
        </div>
      </div>
    );
  }

  const isActive =
    gps.state === "recording" || gps.state === "paused" || gps.state === "acquiring";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4 md:pb-8">
      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <span className="text-3xl">{ACTIVITY_ICONS[activityType]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            {ACTIVITY_LABELS[activityType]}
          </p>
          <h1 className="truncate font-semibold text-stone-900">{title}</h1>
          {(trailId || skiAreaName) && (
            <p className="mt-0.5 truncate text-xs text-emerald-700">
              {skiAreaName ? `⛷ ${skiAreaName}` : "Linked to trail"}
            </p>
          )}
        </div>
        <StatusBadge state={gps.state} acquiringAccuracy={gps.acquiringProgress} />
      </div>

      {/* Live map — top of layout per plan */}
      <LiveTrackMap
        points={gps.points}
        heading={gps.currentHeading}
        className="h-52 w-full sm:h-60"
      />

      {/* Gauges row — AltimeterView + AgOpenGPS speedometer */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <AltimeterGauge altitudeFt={gps.currentAltitudeFt} />
        <SpeedometerGauge speedMph={gps.currentSpeedMph} />
      </div>

      {/* Primary stats strip */}
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center">
          <PrimaryStat label="Distance" value={gps.formattedDistance} />
          <PrimaryStat label="Time" value={gps.formattedDuration} />
          <PrimaryStat
            label="Elev gain"
            value={`${gps.elevationGainFt.toLocaleString()} ft`}
          />
          <PrimaryStat
            label="Pace"
            value={formatPace(gps.distanceM, gps.durationSec)}
          />
        </div>
        <ElevationChart points={gps.points} className="mt-4" height={112} />
      </div>

      {/* AgOpenGPS instrumentation panel */}
      {isActive && (
        <GpsStatsPanel
          className="mt-4"
          lat={gps.currentLat}
          lng={gps.currentLng}
          speedMph={gps.currentSpeedMph}
          altitudeFt={gps.currentAltitudeFt}
          heading={gps.currentHeading}
          accuracy={gps.currentAccuracy}
          quality={gps.gpsQuality}
          pointCount={gps.pointCount}
        />
      )}

      {saveError && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>
      )}

      {/* Controls — fixed on mobile while recording */}
      <div
        className={`mt-6 flex gap-3 ${
          isActive
            ? "fixed inset-x-0 bottom-16 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-md md:static md:border-0 md:bg-transparent md:p-0"
            : ""
        }`}
      >
        {gps.state === "idle" && (
          <button
            onClick={() => gps.start()}
            className="flex-1 rounded-xl bg-emerald-600 py-4 text-sm font-semibold text-white shadow-md hover:bg-emerald-700"
          >
            Start {ACTIVITY_LABELS[activityType]}
          </button>
        )}

        {gps.state === "acquiring" && (
          <div className="flex flex-1 items-center justify-center py-4 text-sm text-amber-700">
            Waiting for accurate GPS fix…
          </div>
        )}

        {gps.state === "recording" && (
          <>
            <button
              onClick={() => gps.pause()}
              className="flex-1 rounded-xl border border-stone-300 py-4 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Pause
            </button>
            <button
              onClick={handleFinish}
              className="flex-1 rounded-xl bg-emerald-600 py-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Finish
            </button>
          </>
        )}

        {gps.state === "paused" && (
          <>
            <button
              onClick={() => gps.resume()}
              className="flex-1 rounded-xl bg-emerald-600 py-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Resume
            </button>
            <button
              onClick={handleFinish}
              className="flex-1 rounded-xl border border-stone-300 py-4 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Finish
            </button>
          </>
        )}

        {gps.state === "saving" && (
          <div className="flex flex-1 items-center justify-center gap-2 py-4 text-sm text-stone-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Saving {gps.pointCount} GPS points…
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="text-sm font-bold tabular-nums text-stone-900 sm:text-base">{value}</p>
    </div>
  );
}

function StatusBadge({
  state,
  acquiringAccuracy,
}: {
  state: string;
  acquiringAccuracy: number | null;
}) {
  if (state === "acquiring") {
    return (
      <span className="shrink-0 animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        GPS {acquiringAccuracy !== null ? `±${Math.round(acquiringAccuracy)}m` : "…"}
      </span>
    );
  }
  if (state === "recording") {
    return (
      <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
        ● REC
      </span>
    );
  }
  if (state === "paused") {
    return (
      <span className="shrink-0 rounded-full bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700">
        Paused
      </span>
    );
  }
  return null;
}
