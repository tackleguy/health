---
version: 1
slug: "src-app-plan-page-tsx"
primary_target: "src/app/plan/page.tsx"
related_targets: ["route:/plan","src/components/assistant/TripPlanner.tsx","src/components/assistant/planner.css","src/components/assistant/GearEditor.tsx","src/components/assistant/ProductLookup.tsx"]
---

# /plan surface brief

## Scope and mode

Mode: Operate. The built browser trip planner at /plan, implemented in src/app/plan/page.tsx and src/components/assistant. This is a new component surface inside the existing TrailPack app. Its scoped visual record is src/components/assistant/DESIGN.md, with the adjacent .impeccable/design.json sidecar. No whole-app redesign is claimed.

## Audience and task

Hikers and backpackers describe a trip, choose a trail, calculate what they will carry, and create a packing checklist. The principal sequence is natural trip request → trail choice → personal pack calculation → packing checklist. Saving a trip on the device and opening the activity recorder connect preparation to the outing.

## Built composition

The opening area has a serif heading and a large natural-language request field, an example prompt action, and Build my trip. Desktop places account/guest context and local-model controls alongside the workspace. The stage row exposes Find a trail, Prepare your pack, and Pack & go. Stage changes focus the new heading for keyboard users. On narrow screens the context follows the workspace; the inherited six-link bottom navigation remains reachable.

The characteristic moment is the same request becoming a sourced route, a measured personal pack, and a checklist grouped by where equipment belongs. Forest/lime surfaces and Playfair/Inter extend the incumbent app; exact visual tokens belong in the scoped DESIGN.md.

## Supporting content and disclosure

Trip details, additional trail research, manual routes, equipment editing, product-source extraction, supplies, preferences, saved-trip feedback, and privacy are disclosed near the task they support. Missing required information opens relevant sections. The weight summary distinguishes a complete starting pack from known weight so far. Empty gear and unmatched routes have explicit recovery actions. Forgetting device memory uses an inline confirmation with Confirm forget and Keep my data.

## Trust and capability boundaries

The optional WebLLM model runs on the device after explicit activation. Route matching, input parsing, arithmetic, packing zones, and validated insight text work without it. Generated output selects validated insight IDs; it does not author product facts or weight totals. Source links stay visible; online discovery does not establish current permits, conditions, or an exact itinerary. Product specifications require reviewing the exact variant before applying them.

Signed-in gear and hikes supply personal context. Guest and account-local planning memory remain separate. Preferences, supplemental gear, saved trips, and completed-trip feedback are saved in the browser, not advertised as cloud-synced. Explicit preferences override learned feedback. Model download, loading, ready, thinking, cancellation, and error states are visible; unsupported devices retain the standard planner.

## Evidence and unresolved decisions

Ground truth: src/components/assistant/planner.css and TripPlanner.tsx, GearEditor.tsx, ProductLookup.tsx; src/app/globals.css and the shared navigation; src/lib/assistant; docs/local-trip-assistant.md. Reviewed captures are .impeccable/review/desktop.png, desktop-route.png, desktop-pack.png, mobile.png, mobile-pack.png, and mobile-go.png. Captured example equipment and feedback are runtime data, not defaults or visual-system requirements.

The broader Trailhead, Atlas, and Fieldbook redesign mockups remain unchosen. No approved replacement visual world exists. Native packaging, authenticated live-account integration, and phone model inference are outside the demonstrated implementation evidence; see docs/local-trip-assistant.md for verification limits.
