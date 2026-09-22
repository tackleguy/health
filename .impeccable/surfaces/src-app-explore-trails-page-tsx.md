---
version: 1
slug: "src-app-explore-trails-page-tsx"
primary_target: "src/app/explore/trails/page.tsx"
related_targets: ["route:/explore/trails","src/components/trails/CatalogBrowser.tsx","src/components/trails/CatalogMap.tsx","src/components/trails/catalog.css"]
---

# /explore/trails surface brief

## Scope and authority

Mode: Operate. The catalog now implements the approved Fieldbook design, using saved Figma Explore render `7:59` from file `TXdEs8S62B0WxXXLJqovWc`. Root `DESIGN.md` and `src/components/trails/DESIGN.md` describe the shipped system. This replaces the prior dark catalog presentation.

THESIS: Search traceable trail sections, inspect their source and geometry, then prepare a personal trip.

OWN-WORLD: Light mineral workspace, evergreen navigation, Inter, forest actions, flat ruled results, and sage planning context.

STORY: Search/filter → source-attributed sections → real geometry and details → planner. A labeled example request connects discovery with actual planning; a section does not automatically become a complete itinerary.

FIRST VIEWPORT: Heading and catalog scope; a single-row search with a compact Filters disclosure for country, region, and distance; count, map action, and four ruled results; More trails continuation; planning context and source explanation. More trails requests the regular 24-record page and preserves filters. Applied filters remain visible in the collapsed disclosure summary. Mobile pairs country and region within the expanded panel, retains aligned distances, and moves the context below results; an earlier planning link keeps the next action reachable.

FORM: Approved desktop Fieldbook composition adapted to the working catalog. Actual API state determines records, counts, pagination, empty states, and map geometry. Exact sizes and breakpoints belong in the scoped design record.

## Trust and boundaries

The bundled snapshot has 90,000 unique source trail-section records, not 90,000 independent hikes. Canadian coverage comes from imported Parks Canada and Ontario sources; U.S. records are a selection of USGS hiking sections. Source attribution, licenses, snapshot date, coverage, and download remain in the source disclosure. Estimated geometry distances are labeled. No fabricated photos, ratings, elevations, current conditions, or complete-route claims are introduced.

The reversible map disclosure uses actual returned record geometry. Detail links and filters retain the existing catalog services. A local checkout has no configured cloud credentials; no cloud user data or planning-memory keys changed for this visual implementation.

## Evidence

Current captures: `.impeccable/review/desktop.png`, `mobile.png`, and `user-788.png`. The finish verdict resolved the four-row first view, map-toolbar placement, and source explanation without visible clipping at mobile or the actual user viewport. Browser assertions verified four-record preview and 24-record continuation. `.impeccable/review/fieldbook-verification.md` records the passing 26-test suite, TypeScript, scoped ESLint, and production build. Saved Figma desktop renders remain the reference; fresh connector context and Figma mobile/prototype work remain quota-blocked.

## Top-area refinement

After the user reported “the top bar is bad,” the crowded search area was reduced to a 52px search row plus a 44px Filters disclosure. The 788×737 viewport now brings the first result about 165px higher. Clear filters is conditional on an active search. Current evidence is `topbar-after-desktop.png`, `topbar-after-mobile.png`, `topbar-after-user.png`, `topbar-filters-mobile.png`, and `topbar-filtered-mobile.png` in `.impeccable/review/`. Native keyboard disclosure, US/Colorado/2–10-mile filtering, query preservation, map expansion, and clearing filters were verified in the browser.


## Production hardening

The incremental production pass connects all catalog records to viewport maps, readable clusters, keyboard-selectable real geometry, GPX downloads and licensed nearby photos. The existing shell and search layout remain. See `.impeccable/review/production-verification.md` for implementation evidence, automated accessibility results and data/provider limitations.
