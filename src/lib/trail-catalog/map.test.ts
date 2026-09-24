import test from "node:test";
import assert from "node:assert/strict";
import { buildCatalogMap, catalogBounds, MAX_MAP_POINTS, withinBounds } from "./map";
import { parseCatalogBounds } from "./search";
import { getCatalogTrail, searchCatalogMap } from "./server";
import { catalogGpx } from "./gpx";
import type { CatalogTrail } from "./types";

test("a bounded map represents every matching hiking record, not one results page", async () => {
  const data = await searchCatalogMap();
  assert.ok(data.total >= 89000 && data.total <= 90000);
  assert.ok(data.points.length <= MAX_MAP_POINTS);
  assert.equal(data.points.reduce((sum, point) => sum + point.count, 0), data.total);
  const withWinter = await searchCatalogMap({ includeWinter: true });
  assert.equal(withWinter.total, 90000);
  assert.ok(withWinter.total >= data.total);
  const area = await searchCatalogMap({ country: "US", region: "Colorado", bbox: [-106, 39, -105, 41] });
  assert.ok(area.total > 0 && area.total < data.total);
  assert.equal(area.points.reduce((sum, point) => sum + point.count, 0), area.total);
});
test("bounds cross the date line without stretching a nearby group around the world", () => {
  const rows = [{ id: "west", longitude: 179, latitude: 52 }, { id: "east", longitude: -179, latitude: 53 }] as CatalogTrail[];
  assert.deepEqual(catalogBounds(rows), [179, 52, 181, 53]);
  assert.equal(withinBounds(-179, 52, [178, 50, -178, 54]), true);
  assert.equal(withinBounds(0, 52, [178, 50, -178, 54]), false);
  assert.equal(buildCatalogMap(rows).total, 2);
  for (const invalid of ["", "1,2,3", "NaN,1,2,3", "-181,1,2,3", "1,10,2,-10", "1,,2,3"]) assert.equal(parseCatalogBounds(invalid), undefined);
});
test("valid braced USGS identifiers open their real geometry and export escaped GPX", async () => {
  const detail = await getCatalogTrail("usgs-{82502C65-4CF0-4B04-8515-0110F27DD592}");
  assert.ok(detail?.lines.length);
  const gpx = catalogGpx({ ...detail.trail, name: 'A & B <trail> "name"' }, detail.lines);
  assert.match(gpx, /A &amp; B &lt;trail&gt; &quot;name&quot;/);
  assert.match(gpx, /<trkpt lat="/);
  assert.match(gpx, /Generalized trail-section geometry/);
  assert.equal(await getCatalogTrail("usgs-../../package.json"), null);
});
