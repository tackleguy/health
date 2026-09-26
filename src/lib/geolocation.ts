export type GeoPermissionState =
  | "unsupported"
  | "prompt"
  | "granted"
  | "denied"
  | "unknown";

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export async function queryGeoPermission(): Promise<GeoPermissionState> {
  if (!isGeolocationSupported()) return "unsupported";

  try {
    const result = await navigator.permissions.query({
      name: "geolocation",
    });
    return result.state as GeoPermissionState;
  } catch {
    return "unknown";
  }
}

export function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied. Allow location in your browser settings to use GPS.";
    case error.POSITION_UNAVAILABLE:
      return "Location unavailable. Try moving outdoors or enabling GPS on your device.";
    case error.TIMEOUT:
      return "Location request timed out. Try again in an area with better signal.";
    default:
      return "Could not get your location.";
  }
}

export function requestCurrentPosition(
  options: PositionOptions = {},
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
      ...options,
    });
  });
}
