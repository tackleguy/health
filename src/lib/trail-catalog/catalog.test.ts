import test from "node:test";
import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { createHash } from "node:crypto";
import { filterCatalog,parseCatalogFilters } from "./search";
import type { CatalogTrail, CatalogManifest } from "./types";
import { getCatalogTrail,searchCatalog } from "./server";

test("filters remain bounded and reject malformed numeric input",()=>{
  const filters = parseCatalogFilters(new URLSearchParams("limit=90000&page=Infinity&lat=91&lng=NaN&minMiles=-1&country=ZZ"));
  assert.equal(filters.limit,undefined);assert.equal(filters.page,undefined);assert.equal(filters.lat,undefined);assert.equal(filters.lng,undefined);assert.equal(filters.minMiles,undefined);assert.equal(filters.country,undefined);
});
test("search handles accents, combined geography and unknown measurements",()=>{
  const base = { name:"Sentier de la Forêt",country:"CA",region:"Ontario",latitude:45,longitude:-75,miles:null,difficulty:null,dogs:null,manager:null } as CatalogTrail;
  const rows = [{...base,id:"one"},{...base,id:"two",miles:4,difficulty:"Easy",dogs:true},{...base,id:"three",country:"US" as const,region:"Colorado",miles:10}];
  assert.equal(filterCatalog(rows,{q:"foret Ontario",country:"CA"}).total,2);
  assert.deepEqual(filterCatalog(rows,{minMiles:1,maxMiles:6}).trails.map(t=>t.id),["two"]);
  assert.deepEqual(filterCatalog(rows,{difficulty:"easy",dogFriendly:true}).trails.map(t=>t.id),["two"]);
  assert.equal(filterCatalog(rows,{q:"missing"}).total,0);
  const end = filterCatalog(rows,{page:99999,limit:2});assert.equal(end.page,2);assert.deepEqual(end.trails.map(t=>t.id),["three"]);
  assert.equal(filterCatalog(rows,{lat:0,lng:0,radiusKm:10}).total,0);
});
test("bundled snapshot contains 90,000 unique source records with complete map geometry",async()=>{
  const root = path.join(process.cwd(),"data/trail-catalog");
  const pointer = JSON.parse(await readFile(path.join(root,"current.json"),"utf8"));
  const dir = path.join(root,pointer.directory);
  const manifest = JSON.parse(await readFile(path.join(dir,"manifest.json"),"utf8")) as CatalogManifest;
  const raw = await readFile(path.join(dir,"index.json.gz"));
  assert.equal(createHash("sha256").update(raw).digest("hex"),manifest.indexSha256);
  const rows = JSON.parse(gunzipSync(raw).toString()) as CatalogTrail[];
  assert.equal(rows.length,90000);assert.equal(manifest.total,rows.length);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  assert.equal(Object.values(manifest.countries).reduce((a,b)=>a+b,0),rows.length);
  assert.equal(manifest.sources.reduce((a,b)=>a+b.count,0),rows.length);
  assert.ok(manifest.countries.CA>1000);assert.ok(manifest.countries.US>1000);
  const mapped = new Set<string>();
  for (const file of (await readdir(dir)).filter(f=>f.startsWith("geometry-"))) {
    const geometry = JSON.parse(gunzipSync(await readFile(path.join(dir,file))).toString()) as Record<string,[number,number][][]>;
    for (const [id,lines] of Object.entries(geometry)) {
      assert.ok(!mapped.has(id));mapped.add(id);
      assert.ok(lines.length>0);
      for (const line of lines) {
        assert.ok(line.length>=2);
        assert.ok(line.every(p=>Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0])<=180 && Math.abs(p[1])<=90));
      }
    }
  }
  assert.equal(mapped.size,rows.length);
  for (const row of rows) {
    assert.ok(mapped.has(row.id));assert.equal(row.kind,"segment");assert.ok(row.name.trim());
    assert.ok(row.miles === null || (Number.isFinite(row.miles) && row.miles>=0));
    assert.ok(["carto.nationalmap.gov","services2.arcgis.com","ws.lioservices.lrc.gov.on.ca"].includes(new URL(row.sourceUrl).hostname));
    if (row.source==="usgs") assert.equal(row.difficulty,null);
  }
});
test("server catalog paginates, isolates countries, and rejects invalid detail IDs",async()=>{
  const first = await searchCatalog({country:"CA",limit:5});
  const second = await searchCatalog({country:"CA",limit:5,page:2});
  assert.equal(first.trails.length,5);assert.equal(first.total,first.manifest.countries.CA);
  assert.ok(first.trails.every(t=>t.country==="CA"));assert.ok(second.trails.every(t=>!first.trails.some(f=>f.id===t.id)));
  const detail = await getCatalogTrail(first.trails[0].id);assert.ok(detail?.lines.length);
  assert.equal(await getCatalogTrail("../../package.json"),null);
  assert.equal(await getCatalogTrail("usgs-not-present"),null);
});

test("trip research orders mapped sections by target length without discarding unknowns or changing default order", () => {
  const base = { name: "Trail", country: "US", region: "Colorado", latitude: 40, longitude: -105 } as CatalogTrail;
  const rows = [{ ...base, id: "one", miles: null }, { ...base, id: "two", miles: 4 }, { ...base, id: "three", miles: 10 }];
  const before = rows.map(row => row.id);
  const result = filterCatalog(rows, { targetMiles: 5 });
  assert.equal(result.trails[0].id, "two");
  assert.equal(result.total, rows.length);
  assert.deepEqual(rows.map(row => row.id), before);
  assert.deepEqual(filterCatalog(rows, {}).trails.map(row => row.id), before);
  assert.equal(parseCatalogFilters(new URLSearchParams("targetMiles=NaN")).targetMiles, undefined);
});
