import { BaseAdapter } from "./base";

/** Stub — state park GIS portals vary by state */
export class StateParksAdapter extends BaseAdapter {
  readonly name = "state-parks";

  async download(): Promise<unknown> {
    throw new Error(
      "State parks adapter stub: configure per-state trail GeoJSON URL and verify license",
    );
  }

  async parse(): Promise<never[]> {
    return [];
  }
}
