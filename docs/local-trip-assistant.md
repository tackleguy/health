# Browser trip assistant

Open `/plan`. Describe a trip, select a route, prepare equipment, and use the packing checklist. The module extends the incumbent app while the broader redesign mockup choice remains pending.

## Local model

`@mlc-ai/web-llm` runs Qwen2.5-1.5B-Instruct-q4f16_1-MLC in a browser Web Worker. Enable local AI explicitly to fetch and cache its model files. No Ollama, LM Studio, cloud inference key, or separate installer is needed. A WebGPU-capable browser and sufficient memory/storage are required. The tested desktop browser loaded the model and produced a valid structured selection. Phone inference is capability-dependent and has not been device-tested.

The model prioritizes available insights using private context. Output is a schema-constrained list of IDs and is validated again before display. It cannot emit new product specs, weather claims, or weights into the plan. This is a constrained planning assistant, not an unrestricted chat model. Trip parsing, route matching, source parsing, math, and packing zones work without AI. The native app can later package model and WASM assets and point WebLLM at bundled URLs; that packaging is not implemented here.

## Data and online sources

- Verified Supabase identity selects only that user's gear, completed hikes, and custom trails. Existing RLS stays in place. No service-role credential is used.
- Account gear is read-only in this module; edits are local overrides. Supplemental gear, preferences, plans, packed checkmarks at save time, and explicit completion feedback are browser-local and account-namespaced. The UI includes an option to forget that local memory. It is not encrypted or synced across devices.
- A profile's explicit comfortable pack weight and daily mileage take precedence over medians learned from completed-trip feedback. Merely saving a plan does not count as trip experience. Recorded hike distance is shown separately from overnight daily mileage.
- Product HTML lookup accepts public HTTPS pages, pins validated public IPv4 DNS results, checks redirects, and limits response size/time. Labelled minimum/packaged weights remain distinct. Packed dimensions are separate from floor or deployed dimensions. Users review exact variants before applying facts. Dynamic or blocked pages may require manual entry.
- Without a general search key, product-name lookup supports the official Cascade Designs catalog (MSR, Therm-a-Rest, Platypus, SealLine, PackTowl); any publicly readable manufacturer page can be supplied by URL. Trail discovery combines the existing route catalog with Wikipedia discovery links, clearly labelled as leads to verify, not matching itineraries.
- Optional `BRAVE_SEARCH_API_KEY` (server-only) enables general product/trail web search. No key is configured in this checkout, and this provider has not been live-tested. It does not change local model inference. See [Brave's documentation](https://api-dashboard.search.brave.com/app/documentation/web-search).
- Online requests contain search terms or a supplied URL; the model prompt, gear inventory, trip feedback, and profile are not sent to a hosted AI service. Users' own source URLs can of course contain identifiers; avoid private or token-bearing links.
- The Four Pass Loop distance comes from a historical US Forest Service handout. Its permit guidance is obsolete; the interface says so. No current conditions or permits are inferred.

## Verification

`npm test` covers trip extraction, unit conversion, route region/distance filtering, quantities, worn weight, incomplete totals, duplicate consumables, feedback learning, account namespaces, malformed storage, product specification distinctions, public-source filtering, and rejected model inventions.

The local browser was exercised through route selection, real MSR source lookup, applying packaged weight and packed dimensions, adding gear, supplies, local model loading/generation, packing checkmarks, saving a plan, and completion feedback. Desktop and narrow layouts are captured under `.impeccable/review/`.

Supabase is not configured locally, so authenticated integration is implemented but not end-to-end verified against a live account. No DB migration or deployment was made. Before publishing publicly, configure account access and an approved general search provider, and apply deployment-appropriate request quotas to the research endpoints.
