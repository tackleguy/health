# Trail search header refinement

Request: “the top bar is bad.” The clarification between search controls and shared navigation was unanswered; this scoped change addresses the crowded trail-search header visible at 788×737.

Changes: one 52px search row, native expandable location/distance filters, persistent active-filter summary, and a conditional reset link. The obsolete stacked-search CSS was removed. Shared navigation and catalog services are unchanged.

Browser evidence: topbar-before-user.png; topbar-after-user.png (788×737); topbar-after-desktop.png (1536×1024); topbar-after-mobile.png, topbar-filters-mobile.png, topbar-filtered-mobile.png (390×844). Captures are from the document top. Original viewport restored after verification.

Verified behaviors:
- Enter expands Filters with visible keyboard focus.
- US + Colorado + minimum 2 / maximum 10 miles returns 89 sections.
- Adding the query “trail” while filters are closed preserves them and returns 3 sections.
- Map view opens with three corresponding trail markers.
- Clear filters restores 90,000 sections and clears the query; reset disappears.
- No horizontal overflow at the user viewport or mobile width.

Checks: TypeScript, scoped ESLint, production build, and git diff whitespace check passed. The build reports the existing Next.js middleware-to-proxy deprecation. The design detector ran once; its findings are advisory off-ramp legacy CSS values and intentionally small 13px filter metadata, documented in the scoped design record. No new test suite was added for this reversible visual change.
