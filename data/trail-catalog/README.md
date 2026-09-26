# TrailPack public trail catalog

This directory ships a local, server-readable snapshot. The browser receives paginated results, never the complete 500,000-record index. No account, database connection, or API key is required.

**The count describes trail sections, not distinct end-to-end hikes.** Multiple sections may have the same trail name, and differently named source features may overlap. These records must not be converted automatically into full-trip recommendations or treated as verified trailheads.

`current.json` points to the complete snapshot directory. Its manifest records exact source counts, selection queries, exclusions, retrieval times, regions, and the compressed index SHA-256. Geometry is split into 64 compressed files and read only for trail details. Preserve all these files in deployments; Next's file tracing includes the directory.

## Sources and licenses

- [USGS National Transportation Dataset](https://www.usgs.gov/national-digital-trails/how-access-or-view-usgs-trails-dataset): public domain. Named sections plus unnamed sections tagged `hikerpedestrian=Y` (labeled "Unnamed trail"). Source IDs are permanent identifiers; individual source links refer to the source snapshot's ArcGIS object ID.
- [Parks Canada Trails APCA](https://open.canada.ca/data/en/dataset/64a90e8d-5bc0-4027-8645-b5881b4068d4): the currently published Temporary/Temporaire public layer (all activities). Contains information licensed under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada). The current layer has limited coverage in Alberta and British Columbia. Object IDs belong to this source snapshot and could change if the publisher replaces the layer.
- [Ontario Trail Network](https://data.ontario.ca/en/dataset/ontario-trail-network): named trail segments. Contains information licensed under the [Open Government Licence – Ontario](https://www.ontario.ca/page/open-government-licence-ontario). Stable OGF IDs identify records. This expands the Canadian selection; it does not provide every Canadian province or territory.
- [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/): public-domain 1:50m state/province boundaries used for approximate region labels. `regions.geojson` contains only Canada and the United States, from [the author's source repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_1_states_provinces.geojson). Generalized coastline boundaries can leave some locations unassigned. Ontario records use their known source jurisdiction.

Source agencies do not endorse TrailPack. Source data can predate retrieval. Access, closures, water, camping permission, elevation and missing difficulty are not invented. Geometry is simplified by the source service to approximately 0.0001 degrees, then stored to five decimal places. It is suitable for discovery, not navigation. USGS distances are source-reported; Ontario kilometers are converted to miles; Parks Canada section lengths are estimated from the generalized geometry.

## Reproduce or refresh

Run `npm run source:trails` from the repository root. The importer fetches pages sequentially, retries temporary failures, caches raw responses in ignored `.cache/trail-catalog/`, rejects invalid geometry, and deduplicates source IDs and exact matching name/geometry within each country. A partial import never replaces the current snapshot. All eligible records are fetched; all accepted Canadian records are kept and a deterministic selection of U.S. records brings the total to exactly 500,000. This is a selection, not a claim of comprehensive coverage.

Run `npm run source:trails -- --refresh` to fetch new responses. Once complete, restart the app (or deploy a new build) to load the new immutable snapshot. Older snapshot directories may then be removed. A provider changing records during pagination can affect the snapshot; counts, checksums and duplicate exclusions document what was actually accepted.

Run `npm test` to check search boundaries, count consistency, source links, IDs and every geometry shard. `GET /api/trail-catalog` supports `q`, `country=US|CA`, `region`, `page`, `limit` (maximum 48), `minMiles`, `maxMiles`, `difficulty`, `dogFriendly`, and optional point/radius filtering. `GET /api/trail-catalog/download` exports the compressed index. The catalog is not silently inserted into Supabase.

Catalog maps use interactive OpenStreetMap raster tiles with visible attribution and browser caching, under the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). There is no tile prefetch or offline map download. Set `NEXT_PUBLIC_CATALOG_TILE_URL` and `NEXT_PUBLIC_CATALOG_TILE_ATTRIBUTION` to use another licensed provider.
