---
name: TrailPack trip planner
description: The implemented planner component system within the incumbent TrailPack shell.
colors:
  background: "#141814"
  forest: "#0d120d"
  surface: "#1e241e"
  surface-elevated: "#272f27"
  surface-muted: "#323a32"
  cream: "#f5f0e6"
  accent: "#c8f04a"
  plan-muted: "#adb7a7"
  plan-line: "#3d473a"
  warning: "#f4cd9b"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(32px, 4.5vw, 52px)"
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "27px"
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  help:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    lineHeight: 1.65
rounded:
  field: "6px"
  control: "8px"
  panel: "12px"
spacing:
  small: "12px"
  field-gap: "16px"
  control-inline: "18px"
  mobile-panel: "20px"
  panel: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.forest}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  input:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.cream}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
  prompt-panel:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.cream}"
    rounded: "{rounded.panel}"
    padding: "24px"
  weight-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.cream}"
    rounded: "{rounded.panel}"
    padding: "22px"
---

# Design System: TrailPack trip planner

## Overview

**Creative North Star: "TrailPack trip planner"**

This records the built component boundary in `src/components/assistant`, rendered by `src/app/plan/page.tsx`. Its source of truth is `planner.css` and the assistant components, inheriting palette and font variables from `src/app/globals.css` and `src/app/layout.tsx`. The matching sidecar is `.impeccable/design.json` beside this file. Route strategy is recorded separately in the project’s `.impeccable/surfaces/` directory.

The planner uses dark forest surfaces, cream text, and a lime action color. Playfair Display supplies the conversational headings and trip prompt; Inter carries labels, controls, explanations, and measured data. Most information sits directly on the page, organized by whitespace and dividing lines. Filled panels give the trip request and calculated weight distinct places in the hierarchy.

This is documentation of an extension to the incumbent system, not a whole-app redesign. The Trailhead, Atlas, and Fieldbook mock directions remain unchosen and supply no authority here.

**Key Characteristics:**
- Forest tonal layers with lime actions and state cues.
- Expressive serif headings paired with compact sans-serif controls.
- Line-separated information with selectively filled panels.
- Native disclosures, visible focus, and a responsive main column with supporting context.

## Colors

The inherited palette is forest and cream; the planner adds a brighter muted text color and a more visible line color for dense information. Sidecar tonal ramps are synthesized preview aids, not additional production tokens.

### Primary

- **Lime accent** (`accent`): primary buttons, links, selected route titles, current step underline, progress, checkboxes, success notices, and focus outlines.

### Neutral

- **Forest background** (`background`, `forest`): page ground and deeper input wells.
- **Forest surface layers** (`surface`, `surface-elevated`, `surface-muted`): weight summary, request panel and secondary controls, and progress tracks.
- **Warm cream** (`cream`): main text and active step labels.
- **Readable muted sage** (`plan-muted`): secondary information, units, hints, and empty-state explanations.
- **Forest divider** (`plan-line`): field boundaries, row separators, and disclosure rules.

### Functional status

- **Warm warning** (`warning`): incomplete weights, possible duplicate supplies, and data-availability messages. Status meaning is also written in text.

**The Text Carries State Rule.** Selection, missing values, model state, and incomplete totals are named in text; color reinforces the message.

## Typography

**Display Font:** Playfair Display with Georgia and serif fallbacks.

**Body Font:** Inter with system-ui and sans-serif fallbacks.

The serif is reserved for the main heading, stage headings, route names, and the natural-language trip request. Sans-serif text carries operational detail. Use sentence case for planner headings and controls.

The frontmatter records the principal roles. Stage headings reduce to (25px) on narrow screens. The request textarea uses (26px), reducing to (23px) on narrow screens; standard fields increase to (16px) on narrow screens. Route statistics use a medium-weight numeric treatment, while the calculated weight is the dominant number in its panel. Paragraphs are capped at (72ch).

**The Measured Numbers Rule.** Weights, route statistics, numeric fields, and account-context counts use tabular numerals so comparisons stay aligned.

## Layout

The planner has a centered shell with a maximum width of (1240px), desktop side padding of (32px), and bottom padding of (64px). Its desktop grid pairs a flexible workspace with a (300px) context column and a (48px) gap. At a maximum viewport width of (1050px), the context column becomes (260px), the gap becomes (28px), and side padding becomes (24px).

At a maximum viewport width of (760px), the workspace and supporting context stack in document order with (20px) side padding. The context area gains a top rule. Prompt actions stack; the primary prompt button fills the width. Stage navigation remains a row of three equal buttons with the number above the label. Packing zones become one column, and inline research forms stack. General paired fields retain two columns; preferences and saved-trip feedback use one column.

The inherited app shell switches navigation at Tailwind’s (768px) breakpoint. Below it, the fixed six-link bottom navigation remains visible, respects the device safe area, and is accommodated by the main element’s (96px) bottom padding. The planner’s responsive boundary and the app shell’s navigation boundary are intentionally documented separately.

## Elevation & Depth

Planner content is flat: filled forest layers and thin dividers carry hierarchy without component shadows. The shared app shell retains its existing translucent dark navigation and accent glow on prominent shared controls. Those inherited effects do not make planner rows or panels floating cards.

**The Line-Separated Content Rule.** Routes, equipment, source results, saved trips, and packing zones are separated with spacing and rules; filled panels emphasize the request and weight calculation.

## Shapes

Fields use the small field radius, action buttons use the control radius, and the two primary filled panel types use the panel radius from the frontmatter. Most lists are open rows with bottom borders. Progress is a shallow rounded track. Native disclosure markers remain visible. The shared mobile recorder action retains its circular silhouette.

## Components

### Buttons

Primary actions are compact lime controls with dark text; secondary actions use the elevated forest surface, cream text, and a divider-colored border. Both use a minimum height of (44px). Hover changes the background, and disabled buttons reduce opacity to (0.5) with a disabled cursor. Planner text actions use lime and underline on hover.

### Inputs / Fields

Persistent labels sit above dark input wells. Standard inputs, selects, and textareas share a thin divider-colored border; the trip request is a larger serif textarea with a transparent interior. Placeholders and supporting text use muted sage. Native number, date, URL, checkbox, and select behavior is preserved. Unknown numeric values can remain empty and are explained in text.

### Cards / Containers

The request panel groups the prompt and its action footer. The weight panel contains the main carried weight and a breakdown of base gear, supplies, and separately worn weight. It changes from a horizontal arrangement to a vertical arrangement at the intermediate breakpoint. Neither planner panel uses a shadow.

### Disclosures

Native `details` and `summary` reveal supporting forms and research. Summary labels are semibold, separated from surrounding content by rules. The disclosure opens with a clear gap beneath its summary. Empty or incomplete workflow areas can open automatically so required input is visible.

Forgetting local memory uses an inline confirmation group within Privacy & memory, with explicit Confirm forget and Keep my data actions. The destructive choice is named in text before the data is removed.

### Navigation

Three equal step buttons show numbers and labels. The current step uses cream text and a lime underline and declares `aria-current="step"`. Moving to a stage places programmatic focus on its heading (`tabIndex="-1"`), with a visible lime focus outline and scroll clearance for the sticky header. This keeps keyboard position connected to the changed content.

The inherited desktop shell contains Plan alongside the other app destinations. Its mobile counterpart provides Plan, Explore, Map, Record, Log, and Profile. The raised circular Record action is inherited shell treatment, not a planner button variant.

### Lists and progress

Equipment rows place the checkbox and item name together, followed by weight and an Edit action. Item names can wrap; numeric weights remain on one line. Packing checklist labels remain associated with native checkboxes. Progress uses a lime fill against the muted forest track, with an adjacent written count and an accessible name.

### Focus and motion

Interactive planner elements receive a (2px) lime focus outline offset by (4px). Stage headings use a (6px) offset. Button background transitions last (150ms). The planner disables transitions and animations under reduced-motion preferences; it does not add entrance animation or scrolling effects.

## Do's and Don'ts

### Do:

- **Do** inherit the forest, cream, lime, Playfair Display, and Inter system within this planner boundary.
- **Do** use line-separated rows for repeated information and filled panels for the request and weight summary.
- **Do** pair color states with text and retain visible keyboard focus.
- **Do** preserve tabular numerals for measured data and allow item names and source titles to wrap.
- **Do** retain the stacked mobile workflow and space for the inherited bottom navigation.

### Don't:

- **Don't** treat unchosen redesign mockups as approved system direction.
- **Don't** promote this scoped component specification into evidence that the whole app was redesigned.
- **Don't** remove native disclosure, field, checkbox, or progress semantics when extending these components.
- **Don't** replace written incomplete, unknown, or local-storage states with color alone.
