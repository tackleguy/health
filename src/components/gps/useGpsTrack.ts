"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAccurateCurrentPosition,
  watchGpsTrack,
  type WatchTrackHandle,
} from "@/lib/accurate-location";
import {
  computeHeading,
  computeTrackStats,
  formatDistance,
  formatDuration,
  mpsToMph,
  pointsToGeoJSON,
  positionToPoint,
  smoothSpeed,
} from "@/lib/gps";
import type { GpsPoint } from "@/lib/types";

export type RecorderState = "idle" | "acquiring" | "recording" | "paused" | "saving";

export type GpsQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

function qualityFromAccuracy(m: number | null): GpsQuality {
  if (m === null) return "unknown";
  if (m <= 10) return "excellent";
  if (m <= 20) return "good";
  if (m <= 50) return "fair";
  return "poor";
}

export function useGpsTrack() {
  const [state, setState] = useState<RecorderState>("idle");
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentSpeedMph, setCurrentSpeedMph] = useState(0);
  const [currentAltitudeFt, setCurrentAltitudeFt] = useState<number | null>(null);
  const lastAltitudeFtRef = useRef<number | null>(null);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [acquiringProgress, setAcquiringProgress] = useState<number | null>(null);
  const watchRef = useRef<WatchTrackHandle | null>(null);
  const speedAvgRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const pausedDurationRef = useRef(0);
  const pauseStartedRef = useRef<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (state !== "recording") return;
    const id = setInterval(() => {
      if (startTimeRef.current) {
        const paused =
          pauseStartedRef.current !== null
            ? Date.now() - pauseStartedRef.current
            : 0;
        setElapsedSec(
          Math.floor(
            (Date.now() - startTimeRef.current - pausedDurationRef.current - paused) /
              1000,
          ),
        );
      }
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  const updateLiveStats = useCallback((position: GeolocationPosition) => {
    const point = positionToPoint(position);

    setCurrentLat(point.lat);
    setCurrentLng(point.lng);
    setCurrentAccuracy(point.accuracy);

    if (point.altitude !== null && Number.isFinite(point.altitude)) {
      const ft = Math.round(point.altitude * 3.28084);
      lastAltitudeFtRef.current = ft;
      setCurrentAltitudeFt(ft);
    } else if (lastAltitudeFtRef.current !== null) {
      setCurrentAltitudeFt(lastAltitudeFtRef.current);
    }

    if (point.speed !== null && point.speed >= 0) {
      const mph = mpsToMph(point.speed);
      speedAvgRef.current = smoothSpeed(speedAvgRef.current, mph);
      setCurrentSpeedMph(speedAvgRef.current);
    }
  }, []);

  const addPoint = useCallback((position: GeolocationPosition) => {
    const point = positionToPoint(position);
    updateLiveStats(position);

    setPoints((prev) => {
      const next = [...prev, point];
      if (prev.length >= 1) {
        const p = prev[prev.length - 1];
        const heading =
          point.heading ??
          computeHeading(p.lat, p.lng, point.lat, point.lng);
        setCurrentHeading(heading);
      } else if (point.heading !== null) {
        setCurrentHeading(point.heading);
      }
      return next;
    });
  }, [updateLiveStats]);

  const start = useCallback(() => {
    setError(null);
    setPoints([]);
    setState("acquiring");
    setAcquiringProgress(null);
    speedAvgRef.current = 0;
    startTimeRef.current = null;
    pausedDurationRef.current = 0;
    pauseStartedRef.current = null;
    setCurrentSpeedMph(0);
    setCurrentAltitudeFt(null);
    lastAltitudeFtRef.current = null;
    setCurrentLat(null);
    setCurrentLng(null);
    setCurrentHeading(null);
    setCurrentAccuracy(null);

    getAccurateCurrentPosition(
      (position) => {
        addPoint(position);
        startTimeRef.current = Date.now();
        setAcquiringProgress(null);
        setState("recording");

        watchRef.current = watchGpsTrack(addPoint, (err) => {
          setError(err.message);
        }, {
          onInstrument: updateLiveStats,
        });
      },
      (err) => {
        setError(err.message);
        setState("idle");
      },
      (position) => {
        setAcquiringProgress(position.coords.accuracy);
        updateLiveStats(position);
      },
    );
  }, [addPoint, updateLiveStats]);

  const pause = useCallback(() => {
    watchRef.current?.pause();
    pauseStartedRef.current = Date.now();
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    if (pauseStartedRef.current) {
      pausedDurationRef.current += Date.now() - pauseStartedRef.current;
      pauseStartedRef.current = null;
    }
    watchRef.current?.resume();
    setState("recording");
  }, []);

  const stop = useCallback(() => {
    watchRef.current?.stop();
    watchRef.current = null;
    setState("saving");
  }, []);

  const stats = computeTrackStats(points);
  const durationSec =
    state === "recording" || state === "paused" ? elapsedSec : stats.durationSec;

  return {
    state,
    setState,
    points,
    pointCount: points.length,
    error,
    currentSpeedMph,
    currentAltitudeFt,
    currentLat,
    currentLng,
    currentHeading,
    currentAccuracy,
    gpsQuality: qualityFromAccuracy(currentAccuracy),
    acquiringProgress,
    distanceM: stats.distanceM,
    elevationGainFt: stats.elevationGainFt,
    durationSec,
    routeGeoJSON: points.length >= 2 ? pointsToGeoJSON(points) : null,
    formattedDistance: formatDistance(stats.distanceM),
    formattedDuration: formatDuration(durationSec),
    start,
    pause,
    resume,
    stop,
  };
}
