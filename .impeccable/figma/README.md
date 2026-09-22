# TrailPack — Fieldbook UI in Figma

File: https://www.figma.com/design/TXdEs8S62B0WxXXLJqovWc

Created through the authenticated Figma connector on 2026-09-21. Figma-specific permission mode was set to `full_access` at the user's explicit request. Account plan: Starter. Creating and editing the draft succeeded despite the account reporting a View seat.

## Created screens

| Screen | Node | Status |
| --- | --- | --- |
| Desktop — Explore trails | 7:59 | Render inspected; `desktop-explore.png` |
| Desktop — Plan a trip | 8:97 | Render inspected; `desktop-plan.png` |
| Desktop — Prepare your trip | 5:182 | Render inspected; `desktop-trip.png` |
| Mobile — Prepare your trip | 9:123 | Created; screenshot verification blocked |

Desktop frames are 1536 × 1024. Mobile is 390 × 844. Screens use editable auto-layout, text, imported Simple Design System control instances, and TrailPack theme variables. The approved Fieldbook reference remains on the canvas at node `4:2`.

## Design direction

Light mineral workspace `#f6f7f4`; evergreen navigation `#173f35`; forest actions `#245b47`; Inter typography. Primary destinations are Explore, My trips and Gear; profile and recording are secondary actions. Planning is organized around choose a trail → prepare your pack → record your outing.

The approved Fieldbook direction is now implemented in the production application: shared navigation, trail discovery, trip planning and packing, guest gear, activity log, and recording handoff. Implementation used these saved verified desktop renders, theme tokens, and construction definitions because a fresh `get_design_context` request remained blocked by the Starter-plan tool quota. Root `DESIGN.md`, scoped catalog/planner records, and `.impeccable/review/fieldbook-verification.md` document the working UI. The live GPS instrument screen retains its scoped dark theme.

## Foundations

Two local collections, each with one mode: TrailPack / Primitives (11 colors) and TrailPack / Fieldbook (11 semantic color aliases, 9 spacing values, 1 control radius). All 32 variables have scopes and WEB syntax. Six Inter text styles: Title, Heading, Subheading, Body, Label, Caption. See `state.json` for IDs.

Imported Simple Design System controls: Button, Input Field, Checkbox Field and Navigation Button. These remain component instances rather than detached drawings. `common.js` records construction helpers, not application runtime code.

## Product truth and provenance

- The catalog screen displays real snapshot data returned by the local `/api/trail-catalog?q=trail&country=US&region=Colorado&limit=5` endpoint: 39 matches; shown section lengths rounded to one decimal. The total remains 90,000 source trail sections, not independent hikes.
- Four Pass Loop uses the app's existing historical US Forest Service route reference: 28 miles, strenuous high-altitude route; current permits and conditions are not inferred. Source: https://www.fs.usda.gov/Internet/FSE_DOCUMENTS/stelprdb5186829.pdf
- The desktop packing screen reproduces the approved Teton example. The planner and mobile draft use the later Colorado example. They are currently separate sample states, not a wired continuous trip. Align the sample state before wiring the prototype.
- Packing items are clearly labeled example data. Unknown gear weights remain unknown, and no personalized target is invented.
- The landscape is an image fill clipped from the previously approved generated Fieldbook comp. Source and exact image-generation prompt are in `../mocks/fieldbook.json`; the full approved raster is `../mocks/fieldbook.png`. No factual photo of a specific trail is claimed.
- PNG files in this folder are direct Figma renders of the corresponding node, except `header.png`, which records an intermediate header build. They are review evidence, not application assets.

## Remaining Figma work and blocker

Figma returned `You've reached the Figma MCP tool call limit on the Starter plan` when requesting the mobile screenshot. The subsequent mobile Explore creation was also rejected; that screen was not created. An authenticated `whoami` check confirmed the Starter plan. No alternate access path was used to bypass the limit.

Pending in Figma: verify and adjust mobile packing layout; create mobile discovery/planner/recording and desktop recording handoff; align the example route across screens; wire main prototype navigation; finish review and documentation of that Figma artifact. The Figma file remains an editable draft, not a completed interactive prototype. These pending design-file tasks do not describe the production implementation: its responsive UI is built, its three visual review findings are resolved, and its design records are refreshed. Checklist export prepares tested text, but actual disk delivery was not confirmed by the in-app browser. Cloud/account behavior, live GPS sessions, and model inference were not re-tested in the UI pass.

Resume from the exact node IDs above after Figma allows further tool calls. Do not recreate the file or repeat library discovery. Keep the approved layout and working control instances. Load the Figma skills before writing.
