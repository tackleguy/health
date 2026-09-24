# Product-page extraction verification

Date: 2026-09-23. Existing gear editor and Fill out parameters action retained; no UI redesign or database change.

- Reproduced REI rejecting direct automated reads with HTTP 403; no challenge bypass attempted.
- Reproduced Osprey Australia's product page exceeding the previous read limit. Bounded product-page reading now preserves usable preceding HTML, and its exact S/M variant fills 73.72 oz, 619 AUD (source snapshot), Osprey brand, SKU 10004002, 65 L capacity and 83 × 39 × 36 cm product dimensions into the actual GearEditor form. Focus returns to Item name after filling. This is an Australian source price, not a US/Canadian estimate.
- Size-group regression verifies L/XL's 76.9 oz and 88 cm dimension cannot leak into S/M.
- Shopify endpoint fixtures verify locale/product identity, feed descriptions, same-size merges, currency requirements, rejection of fulfillment weight, and supplementing price-only pages.
- Structured-description and table tests reject related product objects, ambiguous multi-size weights and navigation table facts.
- Full suite passed before the final navigation-table regression (83 tests). Final targeted product suite includes that regression. Scoped ESLint and production webpack build verified after final code changes.
- Temporary non-saving test route and browser tab removed. Existing user inventory was not touched. No model download, browser installation, migration, commit or push performed.

Public storefront data improves dynamically assembled pages without running their JavaScript. All-retailer coverage is not guaranteed: login/challenge pages and unsupported app-only data still need another public source or copied specifications. No user-provided failing link was received during this pass; the optional request for examples remains useful for site-specific follow-up.
