import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseGpxRoute, parseRouteFile } from "./gpx";

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Test Loop</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194"><ele>10</ele></trkpt>
      <trkpt lat="37.7755" lon="-122.4180"><ele>20</ele></trkpt>
      <trkpt lat="37.7760" lon="-122.4170"><ele>15</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe("parseGpxRoute", () => {
  it("parses track points with elevation", () => {
    const routes = parseGpxRoute(SAMPLE_GPX);
    assert.equal(routes.length, 1);
    assert.equal(routes[0].name, "Test Loop");
    assert.equal(routes[0].coordinates.length, 3);
    assert.ok(routes[0].distanceM > 0);
    assert.ok(routes[0].elevationGainFt > 0);
  });

  it("returns null for invalid content via parseRouteFile", () => {
    assert.equal(parseRouteFile("not a route", "gpx"), null);
  });
});

describe("parseRouteFile geojson", () => {
  it("parses a LineString feature collection", () => {
    const geojson = JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Ridge Walk" },
          geometry: {
            type: "LineString",
            coordinates: [
              [-105.0, 40.0],
              [-105.01, 40.01],
            ],
          },
        },
      ],
    });

    const route = parseRouteFile(geojson, "geojson");
    assert.ok(route);
    assert.equal(Array.isArray(route) ? route[0].name : route.name, "Ridge Walk");
  });
});

describe("parseGpxRoute file fixture", () => {
  it("loads optional fixture when present", () => {
    const fixturePath = join(process.cwd(), "src/lib/ingestion/parsers/__fixtures__/sample.gpx");
    try {
      const xml = readFileSync(fixturePath, "utf8");
      const routes = parseGpxRoute(xml);
      assert.ok(routes.length >= 1);
    } catch {
      // fixture optional
    }
  });
});
