# Product autofill — 2026-09-21

Incremental extension of the existing Fieldbook equipment editor, shared by the planner, guest gear and account gear. No shell, map, typography system or navigation redesign.

## Behavior

- One product-name/link input; exact-product and variant selection precede autofill.
- Reads structured Product/ProductGroup data, explicit price/currency metadata, labelled HTML specs, and variant-keyed NEMO specification JSON. No model download or hosted model inference is required.
- Imports available weight, price/currency, packed size, brand/model/SKU, capacity, materials, dimensions, source URL and retrieval date. Missing or unselected facts preserve manually entered values.
- Autofill collapses lookup and moves focus to the item-name field. Saving remains explicit. Account save failures retain the draft.
- Manufacturer catalog search covers Cascade Designs, NEMO, Big Agnes and Sea to Summit. Generic web discovery is a fallback; coverage is source-dependent.
- Prices retain their currency. Account totals group currencies rather than converting or adding incompatible amounts.
- Existing public HTTPS/DNS/redirect/response-size protections remain. Shipping weights, ambiguous ranges, aggregate prices and currency-less amounts are excluded.

## Verification

- 47 regression tests passed; the 11 new product tests cover conversions, variant isolation, pricing ambiguity, irrelevant products, malformed data, preserved manual values, metadata persistence and currency totals. The final numeric-parser edge cases were rechecked in the targeted suite.
- TypeScript and scoped ESLint passed; whitespace check passed. Repository ESLint has zero errors, with legacy warnings and warnings in generated MapLibre assets.
- Production webpack build passed (`npm run build -- --webpack`). Default Turbopack build is blocked in this environment by a CSS worker's local-port permission error; this also occurred on an escalated attempt. The successful webpack build retains existing middleware/Edge Runtime warnings.
- Live browser: NEMO name search → matching product → Regular Wide variant → sourced values filled the draft; direct MSR URL → packaged weight, USD price, capacity, fabric specs and packed dimensions filled the draft.
- Failed/private URL produces a clear error while retaining the draft. Existing user inventory was not edited or saved during verification.
- Desktop at 1280px and phone at 390px had no horizontal document overflow. The expanded source-review and filled-editor states were inspected. Native controls, status announcements, and focus handoff were exercised.
- Automated axe checks: 0 violations / 0 manual-review entries in the checked filled desktop form (42 passes) and expanded mobile lookup (44 passes). This is not a full accessibility-conformance certification.

## Deployment limitation

Supabase is unconfigured in this local guest preview. The migration `supabase/migrations/20260922060942_gear_product_details.sql` adds bounded optional JSON metadata to account gear with the existing owner-only RLS unchanged. Apply it before deploying account autofill. Live signed-in persistence and the migration have not been verified against a running database. No Git push or deployment was performed in this change.
