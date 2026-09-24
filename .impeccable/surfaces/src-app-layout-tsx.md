---
version: 1
slug: "src-app-layout-tsx"
primary_target: "src/app/layout.tsx"
related_targets: ["src/app/globals.css","src/components/nav/AppShell.tsx","src/components/nav/NavBar.tsx","src/components/nav/BottomNav.tsx","src/app/page.tsx","src/app/record/page.tsx","src/app/gear/page.tsx"]
---

# Fieldbook app shell surface brief

Mode: Operate. The user's approved Fieldbook world is implemented across the shared shell, activity log, recording handoff, and guest gear. Root `DESIGN.md` and `.impeccable/design.json` are the design authority; the emitted layout contract describes the same thesis and visual world.

THESIS: Real trail sections lead to personal routes and gear, then recording.

OWN-WORLD: Mineral ground, evergreen rail, Inter, ruled information, forest actions, and modest control corners.

STORY: Explore, My trips, and Gear are primary destinations. More tools keeps recording, maps, activity log, route guides, custom trails, ski resorts, and search available. Desktop profile and recording stay at the rail foot; mobile adds Profile to the bottom navigation and keeps More tools in the header.

FIRST VIEWPORT: Desktop uses a 240px rail and 48px workspace inset; intermediate rail is 208px. At mobile widths a header and fixed four-destination bottom bar replace the rail. Shared task/context columns stack at 1000px. Root token and responsive details belong in `DESIGN.md`.

NAVIGATION BEHAVIOR: At widths of 768px and above, the sidebar toggle collapses the rail to a 64px icon strip with Explore, My trips, Gear, More tools, Record, and Profile still reachable as icon buttons (labels and auth links hide). Expanding restores the 240px rail (208px at intermediate widths) with visible labels and shortcut hints. Desktop keybinds: `[` / `]` toggle the rail; `G` then `E`/`T`/`G`/`R`/`P`/`M`/`A` jumps to Explore, My trips, Gear, Record, Profile, Map, or Activity log (ignored while typing in fields). The collapse choice persists across client route changes in the shared shell and resets on reload. Mobile retains its header and bottom navigation.

FORM: Implemented Fieldbook shell with explicit empty states and existing service integrations. Guest Gear shares guest planner memory; account inventory remains separate. Activity totals and trips are real data or honest empty states. Recording selection hands off to the existing live GPS route. Login, signup, and live GPS use standalone shells; `/record/live` intentionally retains its dark instrument palette scoped by AppShell. This does not change the light planning system.

Evidence: `.impeccable/review/home-user-788.png`, `gear-desktop.png`, `gear-mobile.png`, `record-desktop.png`, and `record-mobile.png`; automated/browser verification is in `fieldbook-verification.md`. Live GPS permission/session, authenticated cloud flows, and model inference were not re-tested. Production responsive UI is implemented; Figma mobile verification and prototype wiring remain separate quota-blocked work.
