# Browser trip assistant

Open `/plan`. Describe a trip, select a route, prepare equipment, and use the packing checklist. The module extends the existing TrailPack Fieldbook UI.

## Local model

`@mlc-ai/web-llm` runs Qwen2.5-1.5B-Instruct-q4f16_1-MLC in a browser Web Worker. Enable local AI explicitly to fetch and cache its model files. No Ollama, LM Studio, cloud inference key, or separate installer is needed. A WebGPU-capable browser and sufficient memory/storage are required. The tested desktop browser loaded the model and produced a valid structured selection. Phone inference is capability-dependent and has not been device-tested.

The model prioritizes available insights using private context. Output is a schema-constrained list of IDs and is validated again before display. It cannot emit new product specs, weather claims, or weights into the plan. This is a constrained planning assistant, not an unrestricted chat model. Trip parsing, route matching, source parsing, math, and packing zones work without AI. The native app can later package model and WASM assets and point WebLLM at bundled URLs; that packaging is not implemented here.

## Data and online sources

- Verified Supabase identity selects only that user's gear, completed hikes, and custom trails. Existing RLS stays in place. No service-role credential is used.
- Account gear is read-only in this module; edits are local overrides. Supplemental gear, preferences, plans, packed checkmarks at save time, and explicit completion feedback are browser-local and account-namespaced. The UI includes an option to forget that local memory. It is not encrypted or synced across devices.
- A profile's explicit comfortable pack weight and daily mileage take precedence over medians learned from completed-trip feedback. Merely saving a plan does not count as trip experience. Recorded hike distance is shown separately from overnight daily mileage.
- Product HTML lookup accepts public HTTPS pages, pins validated public IPv4 DNS results, checks redirects, and limits response size/time. The importer reads Product/ProductGroup JSON-LD, explicit price metadata, and labelled specifications. It fills weight, price with currency, packed size, brand, model/SKU, capacity, materials, dimensions, source URL, and retrieval date when available. Labelled minimum/packaged weights remain distinct. Packed dimensions are separate from floor or deployed dimensions. Users review exact variants before applying facts. Dynamic or blocked pages may require manual entry.
- Without a general search key, product-name lookup supports public manufacturer catalogs from Cascade Designs (MSR, Therm-a-Rest, Platypus, SealLine, PackTowl), NEMO, Big Agnes, and Sea to Summit. Other names use public web discovery with relevance filtering; coverage varies. Public HTTPS manufacturer or retailer URLs can be pasted directly. Trail discovery combines the existing route catalog with Wikipedia discovery links, clearly labelled as leads to verify, not matching itineraries.
- Optional `BRAVE_SEARCH_API_KEY` (server-only) enables general product/trail web search. No key is configured in this checkout, and this provider has not been live-tested. It does not change local model inference. See [Brave's documentation](https://api-dashboard.search.brave.com/app/documentation/web-search).
- Online requests contain search terms or a supplied URL; the model prompt, gear inventory, trip feedback, and profile are not sent to a hosted AI service. Users' own source URLs can of course contain identifiers; avoid private or token-bearing links.
- The Four Pass Loop distance comes from a historical US Forest Service handout. Its permit guidance is obsolete; the interface says so. No current conditions or permits are inferred.

## Verification

`npm test` covers trip extraction, unit conversion, route region/distance filtering, quantities, worn weight, incomplete totals, duplicate consumables, feedback learning, account namespaces, malformed storage, product specification distinctions, public-source filtering, and rejected model inventions.

The local browser was exercised through route selection, real MSR source lookup, applying packaged weight and packed dimensions, adding gear, supplies, local model loading/generation, packing checkmarks, saving a plan, and completion feedback. Desktop and narrow layouts are captured under `.impeccable/review/`.

Supabase is not configured locally, so authenticated integration is implemented but not end-to-end verified against a live account. The new `20260922060942_gear_product_details.sql` migration adds optional JSON product metadata to account gear without changing ownership policies. Apply it with the existing database migrations before releasing account autofill. It has not been applied or verified against a running database in this checkout. No deployment was made. Before publishing publicly, configure account access and an approved general search provider, and apply deployment-appropriate request quotas to the research endpoints.


## Product autofill

In Gear or the planner equipment editor, enter the item name or a product link in the normal form, then choose **Fill out parameters**. A link fills unambiguous sourced fields directly; a name opens matching products to choose from. Products with multiple sizes still require an exact variant. The expanded lookup remains available for reviewing individual source fields. This returns focus to the item name. All values remain editable; saving is a separate action. Missing and unselected fields preserve existing manual entries. This source importer works without loading the local model.

The importer never treats shipping weights, an aggregate “from” price, or a currency-less dollar amount as a confirmed specification. Variant-specific NEMO specifications are matched by variant ID; unscoped page facts require explicit confirmation on variant pages. Prices are snapshots, not checkout quotes or exchange-rate conversions. Account totals group currencies separately. Browser-local and saved-plan metadata retain the existing version-1 storage key.

Product regression tests cover extraction, missing fields, variant isolation, price/currency ambiguity, metadata persistence, and separate currency totals. Browser verification exercised both name search (NEMO, exact size selection) and direct URL (MSR), form autofill, focus handoff, desktop/mobile layout, and automated accessibility checks. No existing user gear was modified during these checks.


### Missing account storage

If the server explicitly reports that `gear_items` does not exist, Gear offers the existing browser inventory under the signed-in account’s local storage key. A visible notice explains that these items are local and do not sync. The planner already reads this account-specific local inventory. Authentication, permissions, and network errors do not trigger this fallback. Once cloud storage is provisioned, these local items remain in the planner; migration into the cloud inventory is not automatic.

Product discovery matches whole words to exclude unrelated substring matches such as TV trailers in a tent search. Retailer browser-verification pages return a clear blocked-lookup message. This does not bypass retailer access checks; blocked sources still require another source or manual entry.
