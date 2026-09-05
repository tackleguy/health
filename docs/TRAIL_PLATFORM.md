# Trail Platform

Outdoor OS trail data platform: PostGIS-backed trails, ingestion pipeline, spatial APIs, and admin tooling.

## Quick links

| Area | Location |
|------|----------|
| Migrations | `supabase/migrations/` |
| Ingestion pipeline | `src/lib/ingestion/` |
| Ingestion config | `config/ingestion/default.json` |
| Trail data layer | `src/lib/trails.ts`, `src/lib/data.ts` |
| Trail APIs | `src/app/api/trails/` |
| Phase 3 stubs | `src/app/api/planner/`, `src/app/api/weather/` |
| GPX import | `src/app/api/gpx/import/route.ts` |
| Admin | `/admin?admin_secret=…` |
| CLI import | `scripts/ingestion/run.ts` |
| Bootstrap | `scripts/bootstrap-and-ingest.ts` |
| Architecture doc | This file |

---

## 1. Database schema

PostGIS is enabled in the initial migration. Phase 1 adds:

### Core provenance
- **`data_sources`** — source name, URL, license, license URL, attribution, import date, version
- **`import_logs`** — adapter runs, counts, errors (admin)

### Trails (extended)
Existing **`trails`** table is extended (backward compatible) with:
- `geometry` — `GEOGRAPHY(LINESTRING, 4326)` + GIST index
- Start/end coordinates, elevation loss, highest/lowest point
- `trail_type`, `surface`, activity flags (`allows_hiking`, `allows_backpacking`, `allows_biking`, `allows_horseback`, `allows_dogs`)
- `seasonal_information`, `official_source`, `confidence_score` enum
- `data_source_id`, `canonical_trail_id`, `elevation_profile` JSONB

### Related entities
- **`trail_segments`** — multi-part routes
- **`trailheads`** — parking, fees, access, restrooms, accessibility
- **`campsites`**, **`water_sources`**, **`viewpoints`**
- **`protected_areas`** — `GEOGRAPHY(MULTIPOLYGON, 4326)`
- **`restrictions`** — closures, permits, seasonal rules
- **`trail_photos`** — URL, licensing, attribution, geo, admin disable flag

### Deduplication
- **`canonical_trails`** — merged canonical record + geometry
- **`trail_source_records`** — raw import rows linked to sources
- **`merge_candidates`** — geographic/name overlap pairs for **manual review only** (never auto-merged)

### Spatial RPCs
| Function | Purpose |
|----------|---------|
| `nearby_trails(lat, lng, radius_m, limit)` | `ST_DWithin` on trail point location |
| `trails_in_bbox(min_lng, min_lat, max_lng, max_lat, limit)` | Bounding box |
| `search_trails_filtered(...)` | Text + geographic filters |
| `trail_elevation_profile(trail_id)` | Cached or computed profile |
| `get_trail_detail(trail_id)` | Geometry + extended fields as JSON |

---

## 2. Data ingestion architecture

```
Data Sources → Download → Parse → Validate → Normalize → Deduplicate → Enrich → Store
```

Implementation: `src/lib/ingestion/pipeline.ts`

| Stage | Module |
|-------|--------|
| Config | `config.ts`, `config/ingestion/default.json` |
| Download + parse | `adapters/*`, `parsers/geojson.ts`, `parsers/gpx.ts` |
| Validate | `validate.ts` |
| Normalize | `validate.ts` (`normalizeTrail`) |
| Deduplicate | `deduplicate.ts` — stores candidates, does not merge |
| Store | `store.ts` — `data_sources`, `trail_source_records`, `import_logs` |

Run via:
- CLI: `npx tsx scripts/ingestion/run.ts osm`
- Admin API: `POST /api/admin/import` with `x-admin-secret` header

---

## 3. Source adapters

| Adapter | File | Status |
|---------|------|--------|
| OSM (file URL) | `adapters/osm.ts` | GeoJSON/GPX via configurable URL |
| Overpass API | `adapters/overpass.ts` | Live OSM query by bbox |
| NPS | `adapters/nps.ts` | NPS Public Trails FeatureServer |
| USFS | `adapters/usfs.ts` | EDW TrailNFSPublish ArcGIS REST |
| BLM | `adapters/blm.ts` | Stub — set `options.url` to NLCS export |
| State parks | `adapters/state-parks.ts` | Stub — per-state GeoJSON URL |
| Wikimedia Commons | `adapters/wikimedia.ts` | Geo-search + license metadata |

Every import must record license and attribution in `data_sources`.

---

## 4. OSM ingestion

1. Export trails as GeoJSON or GPX from [Geofabrik](https://download.geofabrik.de/) or Overpass.
2. Host file or pass URL in adapter `options.url`.
3. Run pipeline — records stored in `trail_source_records` with ODbL attribution.

---

## 5. Government GIS ingestion

Stubs implement `BaseAdapter` with documented entry points. Before enabling:
1. Verify license (most US federal data is public domain).
2. Set `options.url` to agency GeoJSON/FeatureServer export.
3. Enable source in `config/ingestion/default.json`.

---

## 6. GPX importer

**`POST /api/gpx/import`**

Accepts:
- Raw GPX/KML/GeoJSON body, or
- `multipart/form-data` with `file` field

Returns route geometry + distance/elevation stats using `src/lib/gps.ts` utilities.

Pass `?persist=true` (or JSON/multipart `persist` field) to save:
- **Authenticated users** → `activities` table (hike activity with `route_geojson`)
- **Anonymous** → `route_imports` table (service role write; returns `route_import` id)

Optional: `title`, `trail_id`, `activity_type` (`hike`|`run`|`bike`|`ski`).

---

## 7. Photo ingestion & licensing

- **`trail_photos`** stores license, license URL, attribution, source, optional geo
- RLS hides `is_disabled = true` photos from public SELECT
- **`WikimediaCommonsAdapter`** + `runPhotoIngestionPipeline()` — geo-search, license metadata, dedupe by `external_id`
- Run via `npm run ingest -- wikimedia` (enable source in config first)
- **`PhotoAttribution`** component renders required credits on trail pages

Never display photos without verified license metadata.

---

## 8. Deduplication system

`findMergeCandidates()` compares:
- Name similarity (token Jaccard)
- Geographic overlap (point proximity to route)
- Length delta

Candidates inserted into **`merge_candidates`** with status `pending`. Admins review at `/admin` — **no automatic merges**.

---

## 9. PostGIS spatial queries

Client code uses Supabase RPCs via `src/lib/trails.ts`:
- Replaces client-side haversine in `getNearbyTrails()`
- `search_trails_filtered` supports radius, difficulty, length, elevation, dog-friendly

All spatial indexes use GIST on geography columns.

---

## 10. Trail API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/trails` | List with filters (`q`, `lat`, `lng`, `radius`, `difficulty`, `min_length`, `max_length`, `min_elevation`, `max_elevation`, `dog_friendly`) |
| GET | `/api/trails/:id` | Trail detail + geometry |
| GET | `/api/trails/:id/photos` | Licensed photos |
| GET | `/api/trails/:id/campsites` | Campsites |
| GET | `/api/trails/:id/water` | Water sources |
| GET | `/api/trails/:id/trailheads` | Trailheads |
| GET | `/api/trails/:id/elevation` | Elevation profile |
| GET | `/api/trails/nearby?lat=&lng=&radius=` | PostGIS nearby (radius in km) |
| POST | `/api/gpx/import` | Parse GPX/KML/GeoJSON |
| POST | `/api/photos` | Admin: register licensed photo metadata |
| POST | `/api/admin/import` | Trigger ingestion (admin + service role) |
| POST | `/api/planner/trip` | Trip planner stub (Phase 3) |
| POST | `/api/planner/pack` | Pack weight planner stub (Phase 3) |
| GET | `/api/weather/forecast?lat=&lng=` | Weather stub (Phase 3) |

---

## 11. Interactive map

`MapView` accepts optional `routes: GeoJSON.LineString[]` and renders emerald polylines. Trail detail pages pass trail geometry from `get_trail_detail` RPC.

---

## 12. Trail page

`/explore/trails/[id]` includes:
- **TrailHero** — image or gradient placeholder + attribution
- **Route map** — polyline when geometry exists
- **TrailElevationProfile** — from DB or computed samples
- **TrailPhotoGallery** — licensed photos with `PhotoAttribution`
- **TrailPoisSection** — campsites, water, trailheads (source-reported only)
- Stats sidebar with confidence level
- JSON-LD structured data (`SportsActivityLocation`)

---

## 13. Admin dashboard

`/admin?admin_secret=YOUR_ADMIN_SECRET`

Sections: data sources, import logs, merge candidates, photos, trail list, **live import panel**.

Requires `ADMIN_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for ingestion writes.

---

## 14. AI backpacking planner (Phase 3)

**Architecture:** `src/lib/planner/trip.ts`  
**API:** `POST /api/planner/trip` with `{ trailId, days, startDate?, partySize? }`

```
User intent → Trail graph (PostGIS) → POI enrichment (camps/water) →
Restriction filter → LLM itinerary draft → Human review
```

Current status: **stub** returning day-by-day skeleton with verified POI names only. LLM integration deferred until restriction/POI coverage is sufficient.

---

## 15. AI packing planner (Phase 3)

**Architecture:** `src/lib/planner/pack.ts`  
**API:** `POST /api/planner/pack` with `{ days, season, elevationFt?, bearCanisterRequired? }`

Returns base gear list + total weight estimate. Extend with user inventory overlay and weather-aware suggestions.

---

## 16. Weather integration (Phase 3)

**Architecture:** `src/lib/weather/nws.ts`  
**API:** `GET /api/weather/forecast?lat=&lng=`

Uses live `api.weather.gov` gridpoint + forecast endpoints (User-Agent header required by NWS).

---

## 17. SEO architecture

- Trail pages: `generateMetadata()` from trail name, park, stats
- JSON-LD `SportsActivityLocation` via `src/lib/seo/trail-jsonld.ts`
- Canonical URLs under `/explore/trails/[id]`
- Dynamic sitemap: `src/app/sitemap.ts` (set `NEXT_PUBLIC_SITE_URL` in production)

---

## 18. Local development

```bash
npm install
cp .env.local.example .env.local   # Supabase keys + ADMIN_SECRET + SERVICE_ROLE

# Apply migrations (pick one):
npm run db:migrate                 # needs DATABASE_URL in .env.local
# OR: supabase db reset            # local Supabase CLI stack

# Optional: bootstrap schema + ingest NPS Yosemite trails
npm run bootstrap                  # or: npm run ingest -- overpass

npm run dev
```

Visit:
- http://localhost:3000/explore/trails
- http://localhost:3000/explore/trails/b0000000-0000-4000-8000-000000000010 (Half Dome — sample geometry + POIs)
- http://localhost:3000/admin?admin_secret=change-me-in-production

Test GPX import:
```bash
curl -X POST http://localhost:3000/api/gpx/import \
  -H "Content-Type: application/gpx+xml" \
  --data-binary @route.gpx
```

Test Phase 3 stubs:
```bash
curl -X POST http://localhost:3000/api/planner/trip \
  -H "Content-Type: application/json" \
  -d '{"trailId":"b0000000-0000-4000-8000-000000000010","days":3}'

curl "http://localhost:3000/api/weather/forecast?lat=37.74&lng=-119.55"
```

---

## 19. Production deployment

1. Run migrations on production Supabase project.
2. Set Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `NEXT_PUBLIC_SITE_URL`.
3. Use service role key only in secure server/CI contexts for ingestion (never expose client-side).
4. Schedule ingestion via GitHub Action or cron calling `/api/admin/import`.

---

## 20. Recommended first U.S. data sources

| Source | Data | License |
|--------|------|---------|
| [OpenStreetMap / Geofabrik](https://download.geofabrik.de/) | Trails, trailheads | ODbL |
| [NPS GIS](https://www.nps.gov/subjects/digital/nps-gis-data.htm) | Trails, boundaries | Public domain |
| [USFS EDW](https://data.fs.usda.gov/geodata/) | National forest trails | Public domain |
| [BLM NLCS](https://gblm-nls.appspot.com/) | Recreation trails | Public domain |
| [USGS TNM](https://apps.nationalmap.gov/downloader/) | Elevation (enrichment) | Public domain |
| [Wikimedia Commons](https://commons.wikimedia.org) | Geo-tagged photos | Per-file CC |

Always store attribution in `data_sources` and `trail_photos`.

---

## 21. Testing strategy

| Layer | Approach |
|-------|----------|
| Parsers | `npm test` — GPX/GeoJSON in `src/lib/ingestion/parsers/gpx.test.ts` |
| Deduplication | `npm test` — merge candidates in `src/lib/ingestion/deduplicate.test.ts` |
| RPCs | Supabase local stack integration tests |
| APIs | Route handler tests with mocked Supabase |
| E2E | Playwright: trail search filters, detail map polyline, admin gate |

Run before deploy:
```bash
npm test
npm run lint
npm run build
```

---

## Confidence levels

| Level | Meaning |
|-------|---------|
| `verified` | Field-checked or official signed data |
| `source_reported` | From authoritative dataset as-is |
| `inferred` | Derived (geometry length, elevation from DEM, etc.) |
| `unknown` | Missing quality metadata |

Never present inferred restrictions or safety information as verified.
