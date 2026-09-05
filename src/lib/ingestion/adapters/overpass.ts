import type { RawTrailRecord } from "../types";
import { BaseAdapter } from "./base";
import { buildOverpassQuery, parseOsmJsonTrails } from "../parsers/osm-json";

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

export interface OverpassBbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export class OverpassAdapter extends BaseAdapter {
  readonly name = "overpass";

  async download(config: Parameters<BaseAdapter["download"]>[0]): Promise<unknown> {
    const bbox = config.options?.bbox as OverpassBbox | undefined;
    if (!bbox) {
      throw new Error(
        'Overpass adapter requires options.bbox: { south, west, north, east }',
      );
    }

    const query = buildOverpassQuery(bbox);
    let lastError: Error | null = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
        });

        if (!response.ok) {
          lastError = new Error(`Overpass ${endpoint}: ${response.status}`);
          continue;
        }

        return response.json();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError ?? new Error("All Overpass endpoints failed");
  }

  async parse(raw: unknown): Promise<RawTrailRecord[]> {
    return parseOsmJsonTrails(raw);
  }
}
