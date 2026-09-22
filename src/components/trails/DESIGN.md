---
name: TrailPack Trail Catalog
description: A traceable trail-section index within TrailPack's existing forest interface.
colors:
  background: "#141814"
  surface: "#1e241e"
  surface-elevated: "#272f27"
  surface-muted: "#323a32"
  cream: "#f5f0e6"
  forest: "#0d120d"
  accent: "#c8f04a"
  accent-hover: "#d8fa75"
  catalog-muted: "#bdc6b7"
  field-border: "#65705f"
  placeholder: "#aebba7"
  border-strong: "rgba(255, 255, 255, 0.12)"
  map-green: "#235834"
typography:
  display:
    fontFamily: "var(--font-playfair), Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 3.25rem)"
    lineHeight: 1.15
  headline:
    fontFamily: "var(--font-playfair), Georgia, serif"
    fontSize: "1.6rem"
    lineHeight: 1.35
  title:
    fontFamily: "var(--font-playfair), Georgia, serif"
    fontSize: "1.25rem"
    lineHeight: 1.35
  body:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.65
  supporting:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: "0.9rem"
  label:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: "0.85rem"
  metadata:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: "0.8rem"
  button:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontWeight: 600
rounded:
  subtle: "4px"
  control: "6px"
  panel: "12px"
spacing:
  tight: "8px"
  compact: "12px"
  regular: "16px"
  roomy: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.forest}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.cream}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-muted}"
  field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "46px"
  filter-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
  filter-panel-mobile:
    padding: "16px"
  result-row:
    textColor: "{colors.cream}"
    rounded: "{rounded.subtle}"
    padding: "24px 12px"
  result-row-hover:
    backgroundColor: "{colors.surface}"
  map-canvas:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    height: "384px"
---

# Design System: TrailPack Trail Catalog

## Overview

**Creative North Star: "The Forest Trail Index"**

The catalog inherits TrailPack's dark forest surfaces, cream text, lime actions, Playfair headings, and Inter controls. Its character comes from readable type, quiet separators, and compact geographic and distance information. The current implementation extends the incumbent app; the earlier Fieldbook mockup is not the implemented catalog.

This is a scoped system for [CatalogBrowser.tsx](./CatalogBrowser.tsx), [CatalogTrailDetail.tsx](./CatalogTrailDetail.tsx), [CatalogMap.tsx](./CatalogMap.tsx), [CatalogMapView.tsx](./CatalogMapView.tsx), and [catalog.css](./catalog.css). Legacy trail cards, reviews, photos, weather, elevation components, and the shared app navigation remain outside this scope even though some share this directory. Shared color and font variables come from [globals.css](../../app/globals.css) and [layout.tsx](../../app/layout.tsx). Product commitments live in [PRODUCT.md](../../../PRODUCT.md); the catalog's strategy lives in its [surface brief](../../../.impeccable/surfaces/src-app-explore-trails-page-tsx.md).

**Key Characteristics:**

- Flat, ruled results with serif trail names and tabular distances.
- Clearly labeled native fields, visible focus, and compact paired mobile selects.
- Lime actions and source links against forest surfaces and readable muted text.
- Explicit trail-section boundaries, distance provenance, and unknown fields.
- User-opened list maps and attributed source geometry on detail pages.

The recorded visual evidence is the [desktop catalog](../../../.impeccable/review/catalog-desktop.png), [mobile catalog](../../../.impeccable/review/catalog-mobile.png), [detail map](../../../.impeccable/review/catalog-detail-map-mobile.png), and [detail continuation](../../../.impeccable/review/catalog-map-mobile.png). The last file's name says “map,” but its content shows the detail page. The component code is authoritative for list-map behavior.

## Colors

The palette carries the existing outdoor identity; contrast and information hierarchy come from cream, pale sage, and a restrained lime accent on dark green surfaces. Frontmatter values are extracted from the current CSS and map component, not proposed replacements.

### Primary

- **Lime action** (`accent`, `accent-hover`) marks the search and planning actions, links, active tab rule, and keyboard focus. The lighter hover color belongs to filled primary controls.
- **Map green** (`map-green`) identifies real section geometry and point markers against the third-party basemap.

### Neutral

- **Forest ground** (`background`) forms the page and input interior; **deep forest** (`forest`) provides dark text on lime buttons.
- **Forest surfaces** (`surface`, `surface-elevated`, `surface-muted`) separate the filter panel, row hover, and secondary button states by tone.
- **Warm cream** (`cream`) carries headings, values, controls, and selected navigation.
- **Pale sage** (`catalog-muted`) carries supporting prose, source labels, unknown values, and geographic metadata. This catalog-specific value is brighter than the global sage token.
- **Field edge** (`field-border`) makes native inputs and selects distinguishable; **placeholder sage** (`placeholder`) distinguishes example input from entered text.
- **Quiet rule** (`border-strong`) divides tabs, results, facts, and source disclosure without turning each record into a card.

**The Readable Metadata Rule.** Keep provenance and unknown-field text in the catalog's pale sage; these labels carry necessary meaning.

## Typography

**Display Font:** Playfair Display through the shared font variable, with Georgia and serif fallbacks.

**Body Font:** Inter through the shared font variable, with system-ui and sans-serif fallbacks.

The serif identifies page, section, and trail names. The sans serif keeps form labels, distances, location, and provenance quick to scan. Catalog headings do not declare a font weight; preserve the source's inherited behavior rather than inventing a new weight scale.

### Hierarchy

- **Display:** fluid page and trail-detail titles; balanced wrapping keeps names readable.
- **Headline:** detail-page section headings.
- **Title:** result names and general secondary headings, with arbitrary long names allowed to wrap.
- **Body:** explanatory prose with a generous line height and a maximum measure of 72ch.
- **Supporting / Label / Metadata:** progressively smaller information for descriptions, field labels, and row provenance. These roles remain sentence case.
- **Button:** semibold sans serif for primary and secondary actions.

**The Comparable Distance Rule.** Distances use tabular numerals and align right in results. Detail facts also use tabular numerals. Retain units and the source-versus-geometry label alongside the value.

## Layout

The catalog sits in a centered shell capped at 1120px. Desktop padding is 48px above, 24px horizontally, and 100px below. The heading and trip-planning link share a row, followed by collection tabs, the filter panel, result count, map toggle, and ruled results. The footer clearance coexists with the incumbent app's mobile navigation; this document does not redefine that navigation.

The desktop filter grid uses four columns (`2fr 1fr 1.3fr auto`) with a 16px gap. At widths of 800px and below, search and submit span the full grid while country and state/province occupy a paired row. The final 560px breakpoint preserves that paired row with two shrinkable equal columns, a 12px gap, and a 16px panel inset. This last mobile rule is authoritative over the earlier single-column declaration in the stylesheet. Search, country, region, and submit controls remain 46px tall or taller.

At 560px and below, the shell uses 18px horizontal padding and a final 22px top inset. The heading stacks with an 8px gap and 14px bottom margin; tabs use 10px vertical padding and 16px bottom margin. The result heading starts 20px below the filters. These compact relationships are the final mobile density fix and leave the first result visible below the controls in the reviewed viewport.

Desktop result rows arrange name, location, distance, and a trailing affordance with a 24px gap. At 800px, the trailing affordance is hidden and the gap becomes 16px. At 560px, the name spans both columns; location and distance share the next line in `minmax(0,1fr) 100px`, with a 12px gap and 16px vertical row padding. Preserve shrinkable tracks and wrapping so long source names do not widen the viewport.

Distance bounds use two columns within a 420px maximum width. Pagination has previous, page status, and next positions. Detail facts use four columns, becoming two at 560px. The detail narrative and source information use two columns with a 64px gap, reduced to 32px at 800px, and one column at 560px. Maps retain a 384px viewport height at all observed breakpoints.

## Elevation & Depth

Catalog panels, result rows, buttons, and facts are flat. Tonal changes and quiet rules provide separation; they do not inherit the global glass-card shadows or lift animation. The app's faint background gradients remain inherited context. Map labels alone use a small shadow (`0 2px 5px #0003`) to separate them from geographic imagery. MapLibre's native controls retain their library styling.

**The Ruled Index Rule.** Results are linked rows separated by rules. Preserve this repeated structure instead of applying the legacy trail-card treatment.

The only catalog-authored transition is the row background (`160ms ease-out`). Reduced-motion preference removes it. Map fitting uses zero animation duration. Buttons change color on hover without an added lift or animated transition.

## Shapes

Controls have modest 6px corners; filter and map containers use 12px corners. Row hover areas and map labels use the subtler 4px treatment. Result separators remain straight, and map viewports clip their contents to the container. Map points are small circles with a cream edge. These local shapes are deliberately tighter than the larger radii used by unrelated global components.

Focus is visible and offset from the shape: links, buttons, and summaries use a 2px lime outline with a 5px offset; native fields use the same outline with a 2px offset. Inputs and selects have a 1px visible field border. Do not remove these treatments when changing spacing.

## Components

### Buttons and links

Filled lime buttons represent search and preparing a trip; secondary forest buttons represent pagination. Buttons have a minimum height of 46px and padding of 10px by 18px, with 12px horizontal pagination padding on small screens. Text links use lime, underline, and a 4px underline offset. The reversible list-map text button has a separate 44px minimum height, an expanded state, and a relationship to the controlled map region.

### Search and filters

Native search, select, and number controls retain visible labels. Search accepts trail, state, or province text; country and region remain side by side on mobile. The form submits to the catalog URL, keeping filter state in query parameters. Distance filters sit behind a native disclosure that is initially open when either bound is present. Its explanation states that a mapped section's length is not necessarily a complete hike.

### Collection navigation and pagination

The collection navigation is an inline, wrapping set of text links over a bottom rule. The active collection combines cream text with a lime underline and `aria-current`; inactive text remains pale sage. Pagination preserves active query parameters and omits unavailable previous or next actions instead of displaying disabled controls.

### Trail-section rows

The complete row links to its detail page. Name leads; source, explicit “Trail section” classification, and reported difficulty sit beneath it. Region and country form a second group; distance and its basis form the third. Missing region reads “Region not available”; missing distance reads “Distance unknown.” Distances below one tenth of a mile display “<0.1 mi”; other known values show one decimal place. A metadata label distinguishes “Map estimate” from “Source distance.” No rating, photo, elevation, or difficulty is synthesized to fill gaps.

### Detail facts and preparation

An explicit note identifies the record as a section that may belong to a longer route. The facts show section distance with provenance, difficulty, elevation gain, and dogs. Unknown difficulty or dogs reads “Not reported”; elevation is always “Not reported” in this implementation. Known dog access is phrased as what the source reports. Surface, season, and source edit date also keep explicit unknown states.

The planning action passes the region, or country fallback, to the planner. Supporting copy asks the visitor to confirm the whole route and states that camping permission, water, and current closures are not confirmed. Preserve this visible boundary between discovery information and trip readiness.

### Maps

The list map is closed initially. Activating “Map these results” mounts the interactive map for the current result page; “Hide map” unmounts it. This is lazy map creation, not a claim that the MapLibre JavaScript bundle is dynamically imported. Pins represent points on sections, not verified trailheads, and their accessible links open the corresponding records. Names are inserted as text, and long labels truncate visually while retaining the full link label.

The detail page mounts a map of the supplied generalized source lines. The route uses a green line over a white casing with rounded line joins and caps. A nearby note states that this geometry does not verify navigation, access, or a trailhead. Both maps include navigation controls and visible, noncompact attribution.

The default raster basemap is [OpenStreetMap](https://www.openstreetmap.org/copyright), with the required contributor link visible. A deployment can configure a different licensed tile URL and attribution together. Requests are limited to the interactive viewport and use browser caching; the component does not prefetch tiles or provide offline tile downloads. If WebGL or map content fails, a status message points to the original source while the surrounding details and source links remain available.

### Sources, coverage, and recovery

Catalog totals and coverage come from the manifest. The current snapshot contains 90,000 distinct trail-section records, not 90,000 independent full hikes. Source disclosure shows per-country and per-source counts, the snapshot date, source and license links, and a compressed catalog-index download. Canadian coverage comes from Parks Canada locations and the Ontario Trail Network; U.S. records are a selection of USGS records marked for hiking. This is a selection of public records, not exhaustive coverage of either country.

Detail pages link to the original source record and to the land manager when available, expose the source ID, and distinguish source edit date from catalog snapshot date. Region labels are approximate and may not cover a section crossing boundaries. The interface links [Natural Earth's terms](https://www.naturalearthdata.com/about/terms-of-use/) and the applicable [Canada](https://open.canada.ca/en/open-government-licence-canada) or [Ontario](https://www.ontario.ca/page/open-government-licence-ontario) licence rather than hiding data provenance.

No-result pages suggest broader search and clearing filters. A catalog-load failure provides a reload link. Result counts and map failures use status semantics. Keep recovery within the same typography and palette, with factual language and an available next action.

## Do's and Don'ts

### Do:

- **Do** preserve the scoped forest palette, Playfair headings, and Inter controls.
- **Do** keep results as ruled rows with tabular distances and visible provenance.
- **Do** retain the paired country and region selects on mobile and 46px fields and filled controls.
- **Do** distinguish trail sections from complete hikes and show unknown fields explicitly.
- **Do** preserve original-source links, licence links, snapshot dates, and visible basemap attribution.
- **Do** open the list map only on request and explain what its points represent.
- **Do** retain visible keyboard focus, wrapping names, and reduced-motion behavior.

### Don't:

- **Don't** describe the earlier Fieldbook mockup or legacy trail cards as this implemented catalog system.
- **Don't** turn the current record count into a claim of independent hikes or complete national coverage.
- **Don't** invent ratings, images, elevations, difficulty, current conditions, or verified trailheads.
- **Don't** apply the global glass-card shadow or card-lift treatment to catalog results.
- **Don't** make catalog maps imply verified navigation or preload offline tiles.
