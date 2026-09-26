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
      return "Location permission denied. Allow GPS and Precise (Exact) location in your browser or device settings.";
    case error.POSITION_UNAVAILABLE:
      return "Location unavailable. Turn on GPS and Precise location, then try outdoors with a clear sky view.";
    case error.TIMEOUT:
      return "GPS timed out. Enable Precise location and try again where the signal is stronger.";
    default:
      return "Could not get your location. Enable GPS and Precise location, then try again.";
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
