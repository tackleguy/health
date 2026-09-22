# TrailPack production hardening — 2026-09-21

## Scope
Incremental improvements to the existing Fieldbook shell, routes, navigation and trip workflow. No replacement visual system. Existing uncommitted design work was preserved.

## Implemented
- Catalog map queries every matching record in the 90,000-section snapshot, independent of the four/24-row list pagination. Bounded geographic groups are merged in screen space to prevent overlapping touch targets. Map pan/zoom, cluster navigation, search filters, list-this-area bounds, keyboard-selectable pins, selected source geometry, and section GPX export are connected.
- The default view centers the US and Canada; panning and geographic filters retain access to outlying records. Pins represent section locations, not verified trailheads.
- Nearby Wikimedia Commons photos are fetched on demand within 1.5 km, with creator, reusable license, original link and distance. Actual current upload and thumbnail domains are supported. Empty/error/retry and broken-image states preserve trail details. Photos are explicitly nearby, not confirmed photos of every trail.
- Prepare includes load/category donut charts with equivalent semantic tables, item weights/quantities, sorting, imperial/metric displays, packed checkboxes, four detailed packing zones, supplies and worn-weight separation, summary and expanded checklist export. Unknown weights remain incomplete; supplies are not silently treated as known zero.
- Accessibility improvements cover labels, landmarks, focus, touch targets, contrast, visible link styles, responsive reflow, keyboard map selection, and a native gear dialog with modal focus handling.
- Next.js 16.3.5 and MapLibre 6.10.0 resolve reported dependency advisories. All five maps use the shared local-worker setup. `predev` and `prebuild` generate matching versioned worker/shared modules and license from the installed package; no CDN runtime dependency. Generated assets are ignored in Git and included by the normal Next public-directory deployment.

## Verification
- 36 unit/integration tests pass, including all 90,000 unique records/geometry, map counts, date-line bounds, valid USGS IDs, escaped GPX, photo attribution/allowlists, weight reconciliation, quantities, unknown weights, worn gear, supplies and checklist output.
- Optimized production build and TypeScript pass. Scoped ESLint has no findings. Repository ESLint has zero errors and ten pre-existing/legacy tooling warnings (Figma utilities, vendored OpenTrailMap, GPS effect dependency warning and sign-out navigation).
- Dependency audit: zero vulnerabilities, including development dependencies.
- Live browser checks covered desktop 1536px, actual 788px, mobile 390px and 320px reflow. Metric example reconciled 54 oz equipment + 72 oz food + 2 L water + 4 oz fuel = 5.69 kg in the chart, item weights, and summary. Test trip inputs were not saved; existing user gear/memory was preserved.
- Selected Reilly Canyon Road using the keyboard; focus moved to its heading, actual route line loaded and was visibly drawn. Verified public-source photos at that location and six attributed photos near Big Beehive to Plain of Six Glaciers in Canada. GPX endpoint returned HTTP 200 and valid XML with nine track points for the Canadian section.
- axe-core WCAG 2 A/AA, 2.1 A/AA, 2.2 AA and best-practice checks: zero automated violations in the final checked catalog map, selected map, photo-loaded detail, packing, gear, record, login and signup states. Reports are adjacent `production-*-a11y.json` files. SVG chart text and map attribution/gesture overlays have automated contrast-review limitations; visible text equivalents, foreground/background colors and focus were inspected.
- The optimized `next start` build was also smoke-tested on a temporary local port: selected route geometry loaded successfully and the development audit control was absent.
- The audit widget is opt-in (`?a11y=1`) and development-only; it is not rendered in production.

## Release boundaries
This is not an ADA certification or an assertion of AllTrails feature/data parity. Screen-reader use, real touch-device gestures and a complete manual WCAG conformance review remain necessary. The catalog contains sections, not 90,000 full hikes; complete route assembly, verified trailheads, live closures, comprehensive elevation profiles and offline navigation are not supplied by this snapshot. Nearby photo coverage varies.

The current local environment is a guest preview: account sign-in/cloud sync require the existing Supabase environment configuration. Signed-in writes and live GPS permission/recording were not exercised. Public map tiles and Commons availability remain external dependencies. Configure a licensed map provider suitable for expected production traffic using the existing tile URL and attribution environment variables; no paid provider was purchased or activated. No deployment or Git push was performed.
