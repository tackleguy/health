import { getVersion, setWorkerUrl } from "maplibre-gl";

if (typeof window !== "undefined") {
  setWorkerUrl(`/maplibre/${getVersion()}/maplibre-gl-worker.mjs`);
}

export * from "maplibre-gl";
