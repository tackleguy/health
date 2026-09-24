import test from "node:test";
import assert from "node:assert/strict";
import { parseProduct } from "./product-parser";
import { storefrontProductUrl, parseStorefrontProduct, combineSameProduct } from "./product-storefront";
import { researchProduct } from "./product-recovery";
import { defaultSelections, makeProductDraft } from "./product-draft";
import { completeHtmlPrefix, weightToOz } from "./product-text";
const url = "https://example.com/en-ca/products/alpine-tent";
const ld = (p: unknown) => `<script type="application/ld+json">${JSON.stringify(p)}</script>`;
const product = (p: unknown) => parseProduct(ld(p), url);

test("specification tables keep size labels and units rather than picking a column", () => {
  const parsed = parseProduct('<table><tr><th></th><th>Small</th><th>Large</th></tr><tr><th>Weight (g)</th><td>500</td><td>700</td></tr><tr><th>Gear Capacity (L)</th><td>40</td><td>55</td></tr></table>', url);
  assert.equal(parsed.facts.filter(f => f.kind === "weight").length, 2);
  assert.ok(parsed.facts.every(f => f.requiresChoice));
  assert.equal(defaultSelections(parsed.facts).weight, "");
  assert.equal(parsed.facts[0].label, "Weight (g) — Small");
  assert.equal(parsed.facts[0].weightOz, 17.64);
  assert.equal(weightToOz("S/M: 4 lb 10 oz L/XL: 4 lb 13 oz"), null);
});
test("product descriptions in structured data provide hidden specs without extracting related products", () => {
  const p = product({ "@type": "Product", name: "Tent", description: "<p>Weight: 2 lb</p><p>Packed Size: 15 x 5 in</p><p>Capacity: 2 people</p>", isRelatedTo: { "@type": "Product", description: "Weight: 100 lb" } });
  const d = makeProductDraft(p, "", defaultSelections(p.facts))!;
  assert.equal(d.weightOz, 32); assert.equal(d.packedSize, "15 x 5 in"); assert.equal(d.capacity, "2 people");
});
test("storefront endpoint requires a detected platform, respects locale and validates product identity", () => {
  assert.equal(storefrontProductUrl("ordinary page", url), null);
  assert.equal(storefrontProductUrl("cdn.shopify.com", url), "https://example.com/en-ca/products/alpine-tent.js");
  assert.equal(storefrontProductUrl("Shopify.shop", "https://example.com/collections/camping/products/alpine-tent"), "https://example.com/products/alpine-tent.js");
  assert.throws(() => parseStorefrontProduct(JSON.stringify({ handle: "other", title: "Other", variants: [] }), url, product({})), /match/);
});
test("storefront feed fills description specs and variant prices but never fulfillment weights or guessed currency", () => {
  const original = product({ "@type": "Product", name: "Alpine tent", offers: { price: 100, priceCurrency: "CAD" } });
  const data = { handle: "alpine-tent", title: "Alpine tent", vendor: "Example", description: "<p>Weight: 2 lb</p><p>Materials: Nylon</p>", variants: [{ id: 1, title: "Small", price: 10000, weight: 9000 }, { id: 2, title: "Large", price: 12000, weight: 10000 }] };
  const p = parseStorefrontProduct(JSON.stringify(data), url, original);
  assert.equal(p.variants[1].facts.find(f => f.kind === "price")?.amount, 120);
  assert.equal(p.variants[1].facts.find(f => f.kind === "price")?.currency, "CAD");
  assert.equal(defaultSelections(p.variants[1].facts).weight, "");
  assert.ok(p.variants[1].facts.filter(f => f.kind === "weight").every(f => f.weightOz === 32 && f.requiresChoice));
  const noCurrency = parseStorefrontProduct(JSON.stringify(data), url, product({}));
  assert.ok(!noCurrency.variants.flatMap(v => v.facts).some(f => f.kind === "price"));
});
test("same-page supplement matches exact variant IDs and preserves original specifications", () => {
  const make = (id: number, weight: string) => product({ "@type": "ProductGroup", hasVariant: [{ url: `${url}?variant=${id}`, name: "Size", weight }] });
  assert.equal(combineSameProduct(make(1, "10 oz"), make(2, "20 oz")).variants[0].facts.find(f => f.kind === "weight")?.weightOz, 10);
  assert.equal(combineSameProduct(make(1, "10 oz"), make(1, "20 oz")).variants[0].facts.find(f => f.kind === "weight")?.weightOz, 10);
});
test("a price-only page triggers deeper same-store lookup and returns specifications", async () => {
  const calls: string[] = [];
  const p = await researchProduct(url, "", { search: async () => { throw new Error("Should not search"); }, fetch: async target => {
    calls.push(target);
    return { url: target, body: target.endsWith(".js") ? JSON.stringify({ handle: "alpine-tent", title: "Alpine tent", description: "<p>Weight: 3 lb</p><p>Packed size: 16 x 5 in</p>", variants: [{ id: 1, title: "Default Title", price: 15000, weight: 99999 }] }) : 'Shopify.shop' + ld({ "@type": "Product", name: "Alpine tent", offers: { price: 150, priceCurrency: "CAD" } }) };
  } });
  assert.deepEqual(calls, [url, `${url}.js`]);
  assert.equal(p.facts.find(f => f.kind === "weight")?.weightOz, 48); assert.equal(p.facts.find(f => f.kind === "price")?.amount, 150);
  assert.equal(p.recovery, undefined);
});
test("alternate recovery supplements missing measurements without replacing the retailer price", async () => {
  const other = "https://manufacturer.example/alpine-tent";
  const p = await researchProduct(url, "Alpine tent", { search: async () => [{ title: "Alpine tent", url: other, snippet: "Specs" }], fetch: async target => ({ url: target, body: ld({ "@type": "Product", name: "Alpine tent", ...(target === url ? { offers: { price: 99, priceCurrency: "CAD" } } : { weight: "4 lb", offers: { price: 500, priceCurrency: "USD" } }) }) }) });
  assert.equal(p.url, url); assert.equal(p.facts.find(f => f.kind === "price")?.amount, 99); assert.equal(p.facts.find(f => f.kind === "weight")?.weightOz, 64);
  assert.match(p.facts.find(f => f.kind === "weight")!.evidence, /manufacturer.example/); assert.equal(p.recovery?.method, "alternate-page");
});
test("bounded page prefixes discard unfinished scripts and partial measurements", () => {
  assert.equal(completeHtmlPrefix('<p>Weight: 10 oz</p><script>"Weight: 99 oz'), '<p>Weight: 10 oz</p>');
  assert.equal(completeHtmlPrefix('<p>Weight: 10 oz</p><p>Weight: 2'), '<p>Weight: 10 oz</p><p>');
  assert.equal(completeHtmlPrefix('<SCRIPT>abc >'.repeat(1000)), "");
});


test("row-group size specs map only to the matching variant, including full dimensions", () => {
  const html = ld({ "@type": "ProductGroup", hasVariant: [{ name: "Pack — Green / S/M", url: `${url}?variant=1` }, { name: "Pack — Green / L/XL", url: `${url}?variant=2` }] }) + '<table><tr><td colspan="2">S/M</td></tr><tr><td>Weight</td><td>2.09 kg</td></tr><tr><td>Dimensions</td><td>83 x 39 x 36 cm</td></tr><tr><td colspan="2">L/XL</td></tr><tr><td>Weight</td><td>2.18 kg</td></tr><tr><td>Dimensions</td><td>88 x 39 x 36 cm</td></tr></table>';
  const p = parseProduct(html, url);
  const small = makeProductDraft(p, "0", defaultSelections(p.variants[0].facts))!;
  const large = makeProductDraft(p, "1", defaultSelections(p.variants[1].facts))!;
  assert.equal(small.weightOz, 73.72); assert.equal(large.weightOz, 76.9);
  assert.match(small.dimensions!, /83 x/); assert.ok(!small.dimensions?.includes("88 x"));
  assert.match(large.dimensions!, /88 x/);
});


test("navigation tables cannot become product specifications", () => {
  const p = parseProduct('<nav><table><tr><td>Weight</td><td>5 lb</td></tr></table></nav><p>Weight: 15 oz</p>', url);
  assert.equal(p.facts.length, 1); assert.equal(p.facts[0].weightOz, 15);
});
