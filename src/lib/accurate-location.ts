export interface AccurateLocationOptions {
  desiredAccuracy?: number;
  maxWait?: number;
  timeout?: number;
}

/** Port of accuratelocation.js — one-shot accurate fix */
export function getAccurateCurrentPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void,
  onProgress?: (position: GeolocationPosition) => void,
  options: AccurateLocationOptions = {},
): void {
  let lastCheckedPosition: GeolocationPosition | undefined;
  let locationEventCount = 0;

  const desiredAccuracy = options.desiredAccuracy ?? 20;
  const maxWait = options.maxWait ?? 10000;

  const watchOptions: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: options.timeout ?? maxWait,
  };

  const checkLocation = (position: GeolocationPosition) => {
    lastCheckedPosition = position;
    locationEventCount += 1;

    if (
      position.coords.accuracy <= desiredAccuracy &&
      locationEventCount > 1
    ) {
      clearTimeout(timerID);
      navigator.geolocation.clearWatch(watchID);
      onSuccess(position);
    } else {
      onProgress?.(position);
    }
  };

  const stopTrying = () => {
    navigator.geolocation.clearWatch(watchID);
    if (lastCheckedPosition) onSuccess(lastCheckedPosition);
  };

  const handleError = (error: GeolocationPositionError) => {
    clearTimeout(timerID);
    navigator.geolocation.clearWatch(watchID);
    onError(error);
  };

  const watchID = navigator.geolocation.watchPosition(
    checkLocation,
    handleError,
    watchOptions,
  );
  const timerID = setTimeout(stopTrying, maxWait);
}

export interface WatchTrackOptions extends AccurateLocationOptions {
  distanceFilterM?: number;
  maxAccuracyM?: number;
}

export interface WatchTrackHandle {
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

/** Continuous GPS watch for live recording */
export function watchGpsTrack(
  onPoint: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void,
  options: WatchTrackOptions = {},
): WatchTrackHandle {
  let watchID: number | null = null;
  let paused = false;
  let lastLat: number | null = null;
  let lastLng: number | null = null;
  const distanceFilter = options.distanceFilterM ?? 5;
  const maxAccuracy = options.maxAccuracyM ?? 50;

  const watchOptions: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: options.timeout ?? 15000,
  };

  const handlePosition = (position: GeolocationPosition) => {
    if (paused) return;
    if (position.coords.accuracy > maxAccuracy) return;

    const { latitude, longitude } = position.coords;
    if (lastLat !== null && lastLng !== null) {
      const moved = haversineMeters(lastLat, lastLng, latitude, longitude);
      if (moved < distanceFilter) return;
    }

    lastLat = latitude;
    lastLng = longitude;
    onPoint(position);
  };

  watchID = navigator.geolocation.watchPosition(
    handlePosition,
    onError,
    watchOptions,
  );

  return {
    stop: () => {
      if (watchID !== null) navigator.geolocation.clearWatch(watchID);
      watchID = null;
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
  };
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
