import assert from "node:assert/strict";
import test from "node:test";
import { weightToOz } from "./product-text";
import { parseProduct } from "./product-parser";
import { defaultSelections, makeProductDraft } from "./product-draft";
import { parseMemory } from "./memory";
import { calcStats, type GearItem } from "../gear";
const url = "https://example.com/products/pad";
const ld = (value: unknown) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
const draft = (html: string) => { const p = parseProduct(html, url); return makeProductDraft(p, "", defaultSelections(p.facts))!; };

test("structured product data fills an exact price with currency and converts units", () => {
  const d = draft(ld({ "@type": "Product", name: "Example pack", brand: { name: "Example" }, model: "Trail 45", sku: "T45", weight: { value: 1.2, unitCode: "KGM" }, material: ["nylon", "aluminum"], width: { value: 30, unitCode: "CMT" }, additionalProperty: [{ name: "Capacity", value: 45, unitText: "L" }], offers: { "@type": "Offer", price: "249.00", priceCurrency: "CAD" } }));
  assert.equal(d.price, 249); assert.equal(d.priceCurrency, "CAD"); assert.equal(d.weightOz, 42.33);
  assert.equal(d.brand, "Example"); assert.equal(d.model, "Trail 45"); assert.equal(d.capacity, "45 L");
  assert.equal(d.dimensions, "Width: 30 cm"); assert.equal(d.materials, "Material: nylon, aluminum");
});
test("shipping weights, price ranges, unknown currency and recommendations never autofill", () => {
  const p = { "@type": "Product", name: "Pad", offers: { "@type": "AggregateOffer", lowPrice: 100, highPrice: 150, priceCurrency: "USD" }, isRelatedTo: { "@type": "Product", weight: "9 lb", offers: { price: 99, priceCurrency: "USD" } } };
  const d = draft(ld(p) + '<p>Shipping Weight: 5 lb</p><p>Weight: 10–14 oz</p><p>Price: $99</p>');
  assert.equal(d.price, undefined); assert.equal(d.weightOz, undefined);
  assert.equal(draft(ld({ "@type": "Product", offers: { price: 99 } })).price, undefined);
});
test("multiple offers require selection instead of choosing the cheapest", () => {
  const d = draft(ld({ "@type": "Product", offers: [{ price: 100, priceCurrency: "USD" }, { price: 120, priceCurrency: "USD" }] }));
  assert.equal(d.price, undefined);
});
test("variant selection keeps prices, weights and packed dimensions together", () => {
  const html = ld({ "@type": "ProductGroup", name: "Pad", brand: { name: "Example" }, hasVariant: [
    { "@type": "Product", name: "Pad Regular", offers: { url: url+"?variant=1", price: 100, priceCurrency: "USD" } },
    { "@type": "Product", name: "Pad Wide", offers: { url: url+"?variant=2", price: 125, priceCurrency: "CAD" } },
  ] }) + `<script type="application/json" data-pdp-variant-specs-data>${JSON.stringify({ "1": [{ specification: "Packed Weight", value: "14 oz" }, { specification: "Packed Size", value: "8 x 3 in" }], "2": [{ specification: "Packed Weight", value: "18 oz" }, { specification: "Packed Size", value: "10 x 4 in" }] })}</script>`;
  const p = parseProduct(html, url);
  assert.equal(makeProductDraft(p, "", {}), null);
  const wide = makeProductDraft(p, "1", defaultSelections(p.variants[1].facts))!;
  assert.equal(wide.weightOz, 18); assert.equal(wide.price, 125); assert.equal(wide.priceCurrency, "CAD");
  assert.equal(wide.packedSize, "10 x 4 in"); assert.equal(wide.sourceUrl, url+"?variant=2");
});
test("visible page weights on a variant page require explicit confirmation", () => {
  const p = parseProduct(ld({ "@type": "ProductGroup", hasVariant: [{ name: "Small" }, { name: "Large" }] }) + '<p>Weight: 10 oz</p><p>Packed Size: 8 x 3 in</p>', url);
  const d = makeProductDraft(p, "1", defaultSelections(p.variants[1].facts))!;
  assert.equal(d.weightOz, undefined); assert.equal(d.packedSize, undefined);
});
test("labelled fallback survives malformed JSON and excludes navigation and fabric prose", () => {
  const d = draft('<script type="application/ld+json">{bad</script><nav><p>Brand: Wrong</p></nav><p>Packaged Weight: 3 lb 6 oz</p><p>Minimum Weight: 3 lb</p><p>Packed Size: 20 x 5 in</p><p>Capacity: 2</p><p>Rainfly Fabric: 20D nylon</p><p>Fabric variances: some pieces are heavier</p>');
  assert.equal(d.weightOz, 54); assert.equal(d.capacity, "2"); assert.equal(d.brand, undefined);
  assert.equal(d.materials, "Rainfly Fabric: 20D nylon");
});
test("missing fields do not erase manual details, and imported metadata survives memory round trips", () => {
  const manual = { id: "local:test", name: "Existing", category: "Misc", type: "Base", qty: 1, weightOz: 12, packedSize: "8 x 4 in", price: 95, priceCurrency: "CAD", capacity: "30 L", materials: "nylon" };
  const merged = { ...manual, ...draft(ld({ "@type": "Product", name: "New name", brand: "Example" })) };
  const stored = parseMemory(JSON.stringify({ version: 1, gear: [merged] })).gear[0];
  assert.equal(stored.weightOz, 12); assert.equal(stored.price, 95); assert.equal(stored.priceCurrency, "CAD");
  assert.equal(stored.materials, "nylon"); assert.equal(stored.capacity, "30 L"); assert.equal(stored.brand, "Example");
  assert.equal(stored.sourceUrl, url); assert.ok(stored.sourceCheckedAt);
});
test("currency totals are separate without an invented exchange rate", () => {
  const item: GearItem = { id: "a", name: "a", category: "Misc", type: "Base", qty: 2, weight: 1, price: 100, link: "", productDetails: { priceCurrency: "CAD" } };
  const stats = calcStats([item, { ...item, id: "b", qty: 1, productDetails: { priceCurrency: "USD" } }]);
  assert.deepEqual(stats.costsByCurrency, { CAD: 200, USD: 100 });
});

test("explicit product price metadata is used without guessing a currency from a dollar sign", () => {
  assert.equal(draft('<meta property="product:price:amount" content="219.95"><meta property="product:price:currency" content="CAD">').priceCurrency, "CAD");
  assert.equal(draft('<meta property="product:price:amount" content="219.95">').price, undefined);
});

test("ambiguous weights remain unknown instead of partially parsing numbers", () => {
  for (const value of ["-1 oz", "1/2 oz", "1,2 kg", "10–14 oz", "10 oz – 14 oz", "10 oz to 14 oz", ".5 oz", "<1 oz"]) assert.equal(weightToOz(value), null);
  assert.equal(weightToOz("1,200 g"), 42.33);
});

test("a different product URL in page recommendations cannot become the main product", () => {
  const d = draft(ld({ "@type": "Product", url: "https://example.com/products/other", name: "Other product", weight: "7 lb", offers: { price: 99, priceCurrency: "USD" } }) + "<title>Requested pad</title><p>Weight: 15 oz</p>");
  assert.equal(d.name, "Requested pad"); assert.equal(d.weightOz, 15); assert.equal(d.price, undefined);
});
