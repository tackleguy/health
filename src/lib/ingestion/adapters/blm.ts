import { BaseAdapter } from "./base";

/** Stub — BLM recreation trails from BLM NLCS data */
export class BLMAdapter extends BaseAdapter {
  readonly name = "blm";

  async download(): Promise<unknown> {
    throw new Error("BLM adapter stub: configure BLM trail GeoJSON export in source options");
  }

  async parse(): Promise<never[]> {
    return [];
  }
}
