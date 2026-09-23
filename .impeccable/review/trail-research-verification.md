# Trail research, geographic selection and shopping verification

Date: 2026-09-22. Scope: existing `/plan` Fieldbook flow, catalog search ordering, public trail research and account-scoped local saved plans. No deployment or push.

## Automated evidence

- Full existing suite plus initial regression coverage: 73 tests passed, zero failures.
- Final focused suite: 7 tests passed, including the added regression distinguishing a categorized shelter model from tent stakes and a food bag from actual food. Total repository test cases now 74.
- TypeScript and scoped ESLint passed. Production webpack build passed; existing middleware-to-proxy deprecation remains unrelated.
- Tests cover proximity boundary enforcement under both nearest and target-mileage sorting, ambiguous geocoding and invalid coordinates, accented/leading landmark parsing, inventory omissions, trip-dependent needs, custom/status preservation, backward-compatible storage, section provenance, official-source relevance and personal route ordering.

## Browser evidence

An isolated `qa:route-fit` profile and temporary test page were used. Existing user draft and gear were not modified. The test page and test-only local memory were removed after verification.

- `30 miles 3 days near Banff, Alberta` preserved nearby intent and offered actual Photon place choices.
- Confirmed Banff town returned 829 catalog sections within 50 km; changing the radius to 25 km returned 611. Length sorting retained only results in the selected radius, showing their actual straight-line mapped-point distances.
- Selected Middle Spray River, reviewed section provenance, entered a test full itinerary distance of 30 miles, and continued into packing. Focus moved to the packing heading.
- Set headlamp to Obtained / borrowed, added a custom camera battery, added a test tent to inventory. Shelter suggestion disappeared. Excluding the tent from the pack showed an Include in pack action rather than a purchase need.
- Saved trip and shopping list, reloaded, and restored the trail, section warning/map link, statuses, custom item and excluded owned gear. Saved state correctly displayed.
- Desktop shopping layout visually inspected at 1280×720. Automated axe audit returned zero violations and 53 passes. Three existing chart/arrow targets require manual contrast review; this does not establish full WCAG/ADA compliance.
- Attempted 390×844 viewport override through the browser tool, but measured viewport remained 1280×720. Mobile visual behavior was not verified this pass; responsive stacking CSS is implemented. Temporary viewport settings were reset and test tabs closed.

## Limits

Catalog records remain mapped sections, not automatically assembled complete multi-day itineraries. Distances use catalog representative points, not nearest geometry/trailhead or driving distance. User-entered route distance does not verify connections, camping permission or current conditions. Research excerpts are discovery leads with source labels and retrieval timestamps.

Shopping suggestions use names/categories and trip inputs; users review suitability, quantities and exceptions. Obtained items must be entered in gear to affect measured pack weight. Saved lists remain local to the current account/browser profile. Live cloud integration and the browser model were not re-tested.

Photon is an external moderate-use public service with caching, bounded proxy reads and per-process pacing; scaled hosting needs suitable provider capacity and deployment-level quotas. The bundled catalog remains usable without a geocoding provider for region searches.
