import assert from "node:assert/strict";
import test from "node:test";
import { parsePublicSearch } from "./research";
import { parseProduct } from "./product-parser";
import { productFromExcerpt, productFromPastedSpecs } from "./product-excerpt";
import { researchProduct } from "./product-recovery";
import { productNameFromUrl, sameProductListing } from "./product-input";
import { defaultSelections, makeProductDraft } from "./product-draft";
import { parseMemory } from "./memory";
import type { WebSource } from "./types";

const url = "https://www.walmart.com/ip/5128730697";
const exact: WebSource = { title: "Ozark Trail 1-Person Tent", url: "https://www.walmart.com/ip/Ozark-Trail-Tent/5128730697", snippet: "4.4 lb Carry Weight. Packed size: 23 x 5 x 5 in. Price: 33.68 USD." };
const blocked = async () => { throw new Error("Source returned 403"); };
const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

test("public search unwraps result links, decodes text, and ignores unsafe links", () => {
  const html = `<a class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent(exact.url)}&amp;rut=x">Ozark&#x27;s Tent</a><a class="result__snippet">4.4 lb <b>Carry Weight</b></a><a class="result__a" href="http://127.0.0.1/private">Private</a>`;
  assert.deepEqual(parsePublicSearch(html), [{ title: "Ozark's Tent", url: exact.url, snippet: "4.4 lb Carry Weight" }]);
});

test("listing identity tolerates changed slugs but preserves item and variant identity", () => {
  assert.equal(sameProductListing(url, exact.url), true);
  assert.equal(sameProductListing(url, url.replace("5128730697", "3388813994")), false);
  assert.equal(sameProductListing(url, url.replace("walmart.com", "fake.com")), false);
  assert.equal(sameProductListing("https://example.com/p?variant=1", "https://example.com/p?variant=2"), false);
  assert.equal(productNameFromUrl("https://example.com/products/alpine-tent-2"), "alpine tent 2");
  assert.equal(productNameFromUrl(url), "");
});

test("blocked pages recover the exact listing's indexed specifications and keep provenance after saving", async () => {
  const p = await researchProduct(url, "Ozark Trail solo tent", { fetch: blocked, search: async () => [exact] });
  assert.equal(p.recovery?.method, "search-excerpt");
  const draft = makeProductDraft(p, "", defaultSelections(p.facts))!;
  assert.equal(draft.weightOz, 70.4); assert.equal(draft.price, 33.68); assert.equal(draft.priceCurrency, "USD");
  assert.equal(draft.packedSize, "23 x 5 x 5 in"); assert.match(draft.sourceNote!, /Unverified/);
  const stored = parseMemory(JSON.stringify({ version: 1, gear: [{ ...draft, id: "test", category: "Shelter", type: "Base", qty: 1 }] })).gear[0];
  assert.equal(stored.sourceNote, draft.sourceNote); assert.equal(stored.sourceUrl, exact.url);
});

test("excerpt extraction excludes shipping, ranges, approximate weights and currency-less prices", () => {
  for (const snippet of ["Shipping Weight: 8 lb", "10–14 oz Weight", "Weight: 10 oz to 14 oz", "Around 3 lb carry weight", "Weight: 1/2 oz", "Weight: -5 oz", "Price: $39.95"]) {
    const p = productFromExcerpt({ ...exact, snippet });
    assert.deepEqual(p.facts, [], snippet);
  }
  const p = productFromExcerpt({ ...exact, snippet: "Weight: 4 lb. Weight: 5 lb." });
  assert.equal(defaultSelections(p.facts).weight, "");
});

test("recovery reads a matching alternative but rejects another size and never retries the blocked URL", async () => {
  const alternate = { title: "Alpine tent 2", url: "https://example.com/tent", snippet: "Specifications" };
  const calls: string[] = [];
  const p = await researchProduct(url, "Alpine tent 2", {
    search: async () => [alternate],
    fetch: async target => { calls.push(target); if (target === url) return blocked(); return { url: target, body: ld({ "@type": "Product", name: "Alpine tent 2", weight: "3 lb" }) }; },
  });
  assert.equal(p.recovery?.method, "alternate-page"); assert.equal(p.facts.find(f => f.kind === "weight")?.weightOz, 48);
  assert.deepEqual(calls, [url, alternate.url]);
  const wrong = await researchProduct(url, "Alpine tent 2", { search: async () => [{ ...alternate, title: "Alpine tent 4" }], fetch: blocked });
  assert.equal(wrong.recovery?.method, "not-found"); assert.equal(wrong.facts.length, 0);
});

test("offline and unidentified sources remain editable without invented parameters", async () => {
  const p = await researchProduct(url, "", { fetch: blocked, search: async () => { throw new Error("offline"); } });
  assert.equal(p.recovery?.method, "not-found"); assert.match(p.recovery!.notice, /brand and model/);
  assert.deepEqual(p.facts, []);
  await assert.rejects(researchProduct("https://127.0.0.1/private", "Tent", { fetch: async () => { throw new Error("must not fetch"); }, search: async () => { throw new Error("must not search"); } }), /public HTTPS/);
});

test("brand category pages cannot become a recovered product or contribute their unrelated price", async () => {
  const p = await researchProduct(url, "Ozark Trail solo tent", {
    search: async () => [{ title: "Ozark Trail Tents", url: "https://example.com/tents/", snippet: "Solo camping products, price 185 USD" }],
    fetch: async target => { if (target === url) return blocked(); throw new Error("must not fetch category"); },
  });
  assert.equal(p.recovery?.method, "not-found"); assert.deepEqual(p.facts, []);
});

test("pasted specification extraction is local text parsing with explicit units and currency", () => {
  const p = productFromPastedSpecs('Weight: 4.4 lb\nPacked size: 23 x 5 in\nCapacity: 1 person\nMaterials: Nylon\nPrice: 39.95 CAD\n<script>Weight: 100 oz</script>', "Tent", url);
  const d = makeProductDraft(p, "", defaultSelections(p.facts))!;
  assert.equal(d.weightOz, 70.4); assert.equal(d.price, 39.95); assert.equal(d.priceCurrency, "CAD");
  assert.equal(d.capacity, "1 person"); assert.match(d.sourceNote!, /Unverified/);
});

test("Walmart's initial data supplies only the requested item, not AI highlights or recommendations", () => {
  const page = (usItemId: string) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { initialData: { data: {
    product: { usItemId, name: "Test Tent", brand: "Ozark Trail", model: "T1", priceInfo: { currentPrice: { price: 39.95, currencyUnit: "CAD" } } },
    idml: { specifications: [{ name: "Weight", value: "4.4 lb" }, { name: "Maximum occupancy", value: "1 Person" }, { name: "Material", value: "Nylon" }], longDescription: "Compact design packs down to 23 in x 5 in x 5 in.", genAiDetails: { text: "Weight: 1 lb" } },
    recommendations: [{ name: "Other tent", weight: "12 lb" }],
  } } } } })}</script>`;
  const p = parseProduct(page("5128730697"), url);
  const d = makeProductDraft(p, "", defaultSelections(p.facts))!;
  assert.equal(d.weightOz, 70.4); assert.equal(d.priceCurrency, "CAD"); assert.equal(d.model, "T1");
  assert.equal(d.packedSize, "23 in x 5 in x 5 in"); assert.equal(d.capacity, "1 Person");
  assert.deepEqual(parseProduct(page("999"), url).facts, []);
});

test("recovery reads beyond the first two results and uses public feeds on alternate pages", async () => {
  const sources = Array.from({ length: 7 }, (_, i) => ({ title: "Alpine tent 2", url: `https://store${i}.example/products/alpine-tent`, snippet: "Specifications" }));
  const calls: string[] = [];
  const p = await researchProduct(url, "Alpine tent 2", {
    search: async () => sources,
    fetch: async target => {
      calls.push(target);
      if (!target.startsWith("https://store4.example/")) return blocked();
      return { url: target, body: target.endsWith(".js") ? JSON.stringify({ handle: "alpine-tent", title: "Alpine tent 2", description: "<p>Weight: 3 lb</p><p>Capacity: 2 people</p>", variants: [{ id: 1, title: "Default Title" }] }) : 'Shopify.shop' + ld({ "@type": "Product", name: "Alpine tent 2" }) };
    },
  });
  assert.equal(p.recovery?.method, "alternate-page");
  assert.equal(p.facts.find(f => f.kind === "weight")?.weightOz, 48);
  assert.ok(calls.includes(`${sources[4].url}.js`));
  assert.ok(!calls.includes(sources[6].url), "fan-out must remain bounded");
});

test("opaque item links learn their name from the exact listing before finding other retailers", async () => {
  const queries: string[] = [];
  const other = { title: exact.title, url: "https://camping.example/solo-tent", snippet: "Specifications" };
  const p = await researchProduct(url, "", {
    search: async query => { queries.push(query); return query === url ? [{ ...exact, snippet: "A one-person tent" }] : [other]; },
    fetch: async target => { if (target === url) return blocked(); return { url: target, body: ld({ "@type": "Product", name: exact.title, weight: "4 lb" }) }; },
  });
  assert.deepEqual(queries, [url, exact.title]);
  assert.equal(p.recovery?.method, "alternate-page");
  assert.equal(p.facts.find(f => f.kind === "weight")?.weightOz, 64);
});

test("structured brand and model discover an item despite retailer marketing titles", async () => {
  const queries: string[] = [];
  const source = { title: "Acme A200", url: "https://acme.example/a200", snippet: "Specifications" };
  const p = await researchProduct(url, "", {
    search: async query => { queries.push(query); return query === "Acme A200" ? [source] : []; },
    fetch: async target => ({ url: target, body: ld(target === url ? { "@type": "Product", name: "Acme A200 Premium Outdoor Camping Backpack", brand: "Acme", model: "A200", offers: { price: 90, priceCurrency: "CAD" } } : { "@type": "Product", name: "Acme A200", brand: "Acme", model: "A200", weight: "20 oz" }) }),
  });
  assert.ok(queries.includes("Acme A200"));
  assert.equal(p.facts.find(f => f.kind === "weight")?.weightOz, 20);
  assert.equal(p.facts.find(f => f.kind === "price")?.currency, "CAD");
});

test("matching alternate excerpts are reviewable when pages block access, but wrong model snippets are excluded", async () => {
  const source = { title: "Alpine tent 2", url: "https://camping.example/tent", snippet: "Weight: 3 lb. Dimensions: 80 x 50 in" };
  const p = await researchProduct(url, "Alpine tent 2", { fetch: blocked, search: async () => [source] });
  assert.equal(p.recovery?.method, "search-excerpt");
  const draft = makeProductDraft(p, "", defaultSelections(p.facts))!;
  assert.equal(draft.weightOz, 48);
  assert.match(draft.sourceNote!, /Unverified/);
  const wrong = await researchProduct(url, "Alpine tent 2", { fetch: blocked, search: async () => [{ ...source, title: "Alpine tent 4" }] });
  assert.equal(wrong.recovery?.method, "not-found");
  assert.equal(wrong.facts.length, 0);
});

test("redirects to another model cannot supply page measurements and richer exact pages win", async () => {
  const sources = ["wrong", "sparse", "rich"].map(id => ({ title: "Alpine tent 2", url: `https://${id}.example/product`, snippet: "Specifications" }));
  const p = await researchProduct(url, "Alpine tent 2", {
    search: async () => sources,
    fetch: async target => {
      if (target === url) return blocked();
      return { url: target, body: ld({ "@type": "Product", name: target.includes("wrong") ? "Alpine tent 4" : "Alpine tent 2", weight: target.includes("wrong") ? "10 lb" : "3 lb", ...(target.includes("rich") ? { material: "Nylon", description: "<p>Packed size: 16 x 5 in</p>" } : {}) }) };
    },
  });
  assert.equal(p.url, sources[2].url);
  assert.equal(p.facts.find(f => f.kind === "weight")?.weightOz, 48);
  assert.ok(p.facts.some(f => f.kind === "packed-size"));
});

test("manufacturer catalog titles can omit the brand, but the fetched page must confirm it", async () => {
  const source = { title: "Tensor All-Season", url: "https://manufacturer.example/products/tensor", snippet: "NEMO · Manufacturer catalog" };
  const p = await researchProduct(url, "NEMO Tensor All-Season", { search: async () => [source], fetch: async target => {
    if (target === url) return blocked();
    return { url: target, body: ld({ "@type": "Product", name: source.title, brand: "NEMO", weight: "14 oz" }) };
  } });
  assert.equal(p.recovery?.method, "alternate-page");
  assert.equal(p.facts.find(f => f.kind === "weight")?.weightOz, 14);
});

test("supplemental source links survive filling and saving the draft", async () => {
  const source = { title: "Alpine tent 2", url: "https://manufacturer.example/tent", snippet: "Specs" };
  const p = await researchProduct(url, source.title, { search: async () => [source], fetch: async target => ({ url: target, body: ld({ "@type": "Product", name: source.title, ...(target === url ? { offers: { price: 80, priceCurrency: "CAD" } } : { weight: "3 lb" }) }) }) });
  const draft = makeProductDraft(p, "", defaultSelections(p.facts))!;
  assert.equal(draft.sourceUrl, url);
  assert.ok(draft.sourceNote!.includes(source.url));
  const stored = parseMemory(JSON.stringify({ version: 1, gear: [{ ...draft, id: "test", category: "Shelter", type: "Base", qty: 1 }] })).gear[0];
  assert.equal(stored.sourceNote, draft.sourceNote);
});

test("opaque Amazon IDs recover the indexed listing across equivalent URL formats", () => {
  assert.equal(productNameFromUrl("https://www.amazon.com/dp/B0ABC12345"), "");
  assert.equal(sameProductListing("https://www.amazon.com/dp/B0ABC12345", "https://www.amazon.com/camping-tent/gp/product/B0ABC12345"), true);
  assert.equal(sameProductListing("https://www.amazon.com/dp/B0ABC12345", "https://www.amazon.com/dp/B0ABC99999"), false);
  assert.equal(sameProductListing("https://www.amazon.com/dp/B0ABC12345", "https://www.amazon.ca/dp/B0ABC12345"), false);
});

test("manufacturer trademarks and brands on size variants still identify the exact product", async () => {
  const source = { title: "Tensor™ All-Season", url: "https://manufacturer.example/products/tensor", snippet: "NEMO Equipment · Manufacturer catalog" };
  const p = await researchProduct(url, "NEMO Tensor All-Season", { search: async () => [source], fetch: async target => {
    if (target === url) return blocked();
    return { url: target, body: ld({ "@type": "ProductGroup", name: source.title, brand: "NEMO", hasVariant: [{ name: "Regular", url: `${target}?variant=1`, weight: "14 oz" }, { name: "Long", url: `${target}?variant=2`, weight: "17 oz" }] }) };
  } });
  assert.equal(p.recovery?.method, "alternate-page");
  assert.equal(p.variants.length, 2);
  assert.equal(makeProductDraft(p, "", {}) , null);
});

test("review comparison pages remain discovery links and cannot import competitor specifications", async () => {
  const source = { title: "Alpine tent 2 Review", url: "https://review.example/reviews/alpine-tent", snippet: "Weight: 99 lb" };
  const calls: string[] = [];
  const p = await researchProduct(url, "Alpine tent 2", { search: async () => [source], fetch: async target => { calls.push(target); return blocked(); } });
  assert.deepEqual(calls, [url]);
  assert.equal(p.recovery?.method, "not-found");
  assert.equal(p.facts.length, 0);
  assert.equal(p.recovery?.sources[0].url, source.url);
});
