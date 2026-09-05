import type { RawTrailRecord } from "../types";
import { BaseAdapter } from "./base";
import { parseGeoJsonTrails } from "../parsers/geojson";

const NPS_TRAILS_BASE =
  "https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails/FeatureServer/0/query";

/** NPS Public Trails — Public Domain (https://www.nps.gov/subjects/digital/nps-gis-data.htm) */
export class NationalParkServiceAdapter extends BaseAdapter {
  readonly name = "nps";

  async download(config: Parameters<BaseAdapter["download"]>[0]): Promise<unknown> {
    const unitCode = config.options?.unitCode as string | undefined;
    const maxRecords = (config.options?.maxRecords as number | undefined) ?? 500;
    const offset = (config.options?.offset as number | undefined) ?? 0;

    const where = unitCode
      ? `UNITCODE='${unitCode.replace(/'/g, "''")}'`
      : "1=1";

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
    const response = await fetch(url ?? `${NPS_TRAILS_BASE}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`NPS download failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async parse(raw: unknown): Promise<RawTrailRecord[]> {
    return parseGeoJsonTrails(raw);
  }
}
