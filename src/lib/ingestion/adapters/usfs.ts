import type { RawTrailRecord } from "../types";
import { BaseAdapter } from "./base";
import { parseGeoJsonTrails } from "../parsers/geojson";

const USFS_TRAILS_BASE =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0/query";

/** USFS National Forest System Trails — Public Domain */
export class USForestServiceAdapter extends BaseAdapter {
  readonly name = "usfs";

  async download(config: Parameters<BaseAdapter["download"]>[0]): Promise<unknown> {
    const forestName = config.options?.forestName as string | undefined;
    const adminUnit = config.options?.adminUnit as string | undefined;
    const maxRecords = (config.options?.maxRecords as number | undefined) ?? 500;
    const offset = (config.options?.offset as number | undefined) ?? 0;

    const clauses: string[] = [];
    if (forestName) {
      clauses.push(`FOREST_NAME='${forestName.replace(/'/g, "''")}'`);
    }
    if (adminUnit) {
      clauses.push(`ADMIN_UNIT='${adminUnit.replace(/'/g, "''")}'`);
    }
    const where = clauses.length > 0 ? clauses.join(" AND ") : "1=1";

    const params = new URLSearchParams({
      where,
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson",
      resultRecordCount: String(maxRecords),
      resultOffset: String(offset),
    });

    const url = config.options?.url as string | undefined;
    const response = await fetch(url ?? `${USFS_TRAILS_BASE}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`USFS download failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async parse(raw: unknown): Promise<RawTrailRecord[]> {
    return parseGeoJsonTrails(raw);
  }
}
