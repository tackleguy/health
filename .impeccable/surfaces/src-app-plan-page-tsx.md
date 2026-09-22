---
version: 1
slug: "src-app-plan-page-tsx"
primary_target: "src/app/plan/page.tsx"
related_targets: ["route:/plan","src/components/assistant/TripPlanner.tsx","src/components/assistant/planner.css","src/components/assistant/GearEditor.tsx","src/components/assistant/ProductLookup.tsx","src/components/gear/LocalGear.tsx"]
---

# /plan surface brief

## Scope and authority

Mode: Operate. The working trip planner implements the user's approved Fieldbook Figma design in file `TXdEs8S62B0WxXXLJqovWc`. Root `DESIGN.md` and the scoped `src/components/assistant/DESIGN.md` record the shipped tokens and patterns. Saved desktop Figma renders and construction definitions supplied the reference while fresh design context remained blocked by the Starter-plan tool quota.

THESIS: A route, a personal pack, and the recording handoff stay one connected task.

OWN-WORLD: Mineral workspace, evergreen shared navigation, forest actions, Inter, white task pane, sage context, and ruled equipment rows.

STORY: Describe the trip → Choose a trail → Prepare your pack → Record your outing. A route name and location lead its difficulty and distance-to-target metadata. The selected trip persists above preparation, while the sidebar carries measured pack context and local memory.

FIRST VIEWPORT: My trips/New trip utilities; trip heading and save state; large request or selected-trip illustration; numbered stages; white workspace and sage sidebar. In packing, Review & record and Download checklist follow the weight breakdown before detailed carrying guidance. At 1000px and below the sidebar follows the workspace. Mobile retains numbered stages and the shared four-destination bottom navigation.

FORM: Approved Fieldbook composition implemented against actual routes, inventory, and local state. Exact responsive dimensions belong in the scoped design record.

## Product truth and interaction

Route matching, input parsing, arithmetic, packing zones, and validated insight text work without model activation. Source links remain visible. Route references do not establish current permits, conditions, or a complete itinerary. Unknown equipment weights remain unknown, and incomplete totals are labeled. The checklist groups personal gear, tracks packed state, and exports text. Saved plans can be restored and updated; Unsaved changes and Saved on this device identify persistence accurately.

Guest Gear and the guest planner share browser memory. Signed-in gear and activity context retain their existing services; guest and account-local memories remain separate. Preferences, supplemental equipment, saved plans, and feedback are browser-local. Model download/activation is explicit, with visible state and cancellation; no model inference or new installation was demonstrated in this UI pass.

The landscape is a CSS crop of the approved generated composition at `public/images/fieldbook/planning-landscape.png`, with embedded and adjacent provenance. Visible and accessible labels identify it as a planning illustration, never a photograph of the selected route.

## Evidence and limits

Current captures: `.impeccable/review/plan-desktop.png`, `pack-desktop.png`, `pack-mobile.png`, `gear-desktop.png`, and `gear-mobile.png`. The finish verdict closed all three visual findings. `.impeccable/review/fieldbook-verification.md` records 26 passing tests, TypeScript, scoped ESLint, and production build. Checklist content is unit tested and clicking export invokes preparation; actual disk delivery was not confirmed by the in-app browser. Cloud/account flows, live GPS, and phone model inference were not re-tested. Figma's unfinished prototype/mobile tasks remain separate from the implemented responsive production UI.


## Production hardening

The existing Prepare step now includes load/category donut charts with text tables, sortable per-item weights and quantities, shared unit switching, four detailed packing zones and a reconciled weight summary. Unknown measurements stay incomplete and worn items stay separate. See `.impeccable/review/production-verification.md` for 36-test coverage, responsive checks and accessibility evidence.
