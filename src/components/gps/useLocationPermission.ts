"use client";

import { useCallback, useEffect, useState } from "react";
import {
  geolocationErrorMessage,
  queryGeoPermission,
  requestCurrentPosition,
  type GeoPermissionState,
} from "@/lib/geolocation";

interface UseLocationPermissionResult {
  permission: GeoPermissionState;
  coords: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
  granted: boolean;
  needsPrompt: boolean;
  requestLocation: () => Promise<{ lat: number; lng: number } | null>;
}

export function useLocationPermission(): UseLocationPermissionResult {
  const [permission, setPermission] = useState<GeoPermissionState>("unknown");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;
    let onChange: (() => void) | null = null;

    async function init() {
      const state = await queryGeoPermission();
      setPermission(state);

      if (state === "granted") {
        try {
          const position = await requestCurrentPosition();
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        } catch {
          // User may have revoked in settings; wait for explicit request
        }
      }
    }

    void init();

    if (typeof navigator !== "undefined" && navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          permissionStatus = status;
          onChange = () => {
            setPermission(status.state as GeoPermissionState);
          };
          status.addEventListener("change", onChange);
        })
        .catch(() => {});
    }

    return () => {
      if (permissionStatus && onChange) {
        permissionStatus.removeEventListener("change", onChange);
      }
    };
  }, []);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const position = await requestCurrentPosition();
      const next = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setCoords(next);
      setPermission("granted");
      return next;
    } catch (err) {
      const message =
        err instanceof GeolocationPositionError
          ? geolocationErrorMessage(err)
          : err instanceof Error
            ? err.message
            : "Could not get your location.";
      setError(message);
      if (err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED) {
        setPermission("denied");
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const granted = permission === "granted" && coords !== null;
  const needsPrompt =
    permission !== "denied" &&
    permission !== "unsupported" &&
    (permission === "prompt" ||
      permission === "unknown" ||
      (permission === "granted" && coords === null));

  return {
    permission,
    coords,
    error,
    loading,
    granted,
    needsPrompt,
    requestLocation,
  };
}
