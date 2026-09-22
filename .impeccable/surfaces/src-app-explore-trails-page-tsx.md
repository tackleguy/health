# TrailPack catalog extension

Mode: Operate. Scope: rename the active app to TrailPack and add a usable catalog of 90,000 U.S./Canadian public trail records. The user confirmed Canada and USA. This is a local data and browsing extension inside the incumbent application, not implementation of the earlier whole-app Fieldbook redesign.

THESIS: Search traceable trail sections, inspect their source and geometry, then prepare a complete trip.

OWN-WORLD: Inherit the shipped forest background (#141814), cream foreground (#f5f0e6), lime action (#c8f04a), Playfair headings and Inter controls. Secondary catalog text uses #bdc6b7 for readable contrast. Avoid invented ratings, images, elevations or route-completeness claims.

STORY: Search and filter → compact trail rows → real section geometry/source details → planner with the region carried forward. Discovery sections never become an automatic full-route recommendation. Public source attribution and coverage are available beneath results.

FIRST VIEWPORT: Clear trail-search heading, truthful catalog size and scope, country/region/search controls, section count and results. Mobile stacks fields and rows, with the incumbent bottom navigation; the count sits above the results. Maps load only when requested in the list.

FORM: Narrow extension of an existing surface under Impeccable new-work section 3; no new visual-world roll or catalog comp is required. Earlier full-app mockups do not depict this catalog. Flat ruled rows replace repetitive cards and use tabular distances; one reversible map toggle reveals the selected page's mapped points. No ornamental animation beyond a short row hover; reduced motion disables it. The implemented planner DESIGN.md and globals.css are the visual authority for this extension.

Constraints: 90,000 unique source IDs after duplicate exclusions; these are trail sections, not 90,000 independent hikes. Canadian coverage is limited to the imported Parks Canada and Ontario sources. No Supabase credentials are configured, so this catalog is bundled server data. No changes to cloud user data or local planning-memory keys.

Required review evidence: `.impeccable/review/catalog-desktop.png` (1280×900), `catalog-mobile.png` (390×844), `catalog-detail-map-mobile.png` and `catalog-map-mobile.png` (390×844). Map screenshots show actual source geometry, and the index/geometry integrity check covers all 90,000 records.

## Validation

24 tests pass, including integrity of every catalog ID and geometry shard. The production build, TypeScript and scoped ESLint checks pass. Production HTTP checks verified country/region filters, pagination, empty search, global search, trail details, planner rendering, unknown-record 404s and a downloadable 90,000-record index. File tracing includes the pointer, index, manifest, and all 64 geometry shards.

The finish reviewer requested one mobile density correction. After pairing the location selects and reducing spacing, the 390×844 capture shows the first trail name and source context above the fixed navigation. The reviewer scored this fix resolved and returned `ship` for the scored fix, with no remaining findings.
