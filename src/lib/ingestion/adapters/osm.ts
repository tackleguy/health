import type { RawTrailRecord } from "../types";
import { BaseAdapter } from "./base";
import { parseGeoJsonTrails } from "../parsers/geojson";
import { parseGpxTrails } from "../parsers/gpx";

export class OsmAdapter extends BaseAdapter {
  readonly name = "osm";

  async download(config: Parameters<BaseAdapter["download"]>[0]): Promise<unknown> {
    const url = config.options?.url;
    if (typeof url !== "string") {
      throw new Error("OSM adapter requires options.url pointing to GeoJSON/GPX export");
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSM download failed: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("json") || url.endsWith(".geojson") || url.endsWith(".json")) {
      return response.json();
    }
    return response.text();
  }

  async parse(raw: unknown): Promise<RawTrailRecord[]> {
    if (typeof raw === "string") {
      if (raw.trim().startsWith("<")) {
        return parseGpxTrails(raw);
      }
      return parseGeoJsonTrails(JSON.parse(raw));
    }
    return parseGeoJsonTrails(raw);
  }
}
