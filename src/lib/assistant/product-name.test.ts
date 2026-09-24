import test from "node:test";
import assert from "node:assert/strict";
import { researchProductName } from "./product-recovery";
import { findCatalogProduct } from "./product-catalog";
import { validateProductQueries } from "./product-queries";
const source = { title: "Tensor™ All-Season Sleeping Pad", url: "https://example.com/tensor", snippet: "NEMO Equipment" };
test("a product name reads a matching product page automatically", async () => {
  const result = await researchProductName("NEMO Tensor All-Season", { search: async () => [source], fetch: async url => ({url,body:`<script type="application/ld+json">${JSON.stringify({"@type":"Product",name:source.title,brand:"NEMO",weight:"17 oz"})}</script>`}) });
  assert.equal(result.product?.facts.find(f=>f.kind==="weight")?.weightOz,17);
  assert.equal(result.sources[0].url,source.url);
});
test("broad names and pages redirected to another model remain choices", async () => {
  const broad = await researchProductName("NEMO pads", { search: async () => [source], fetch: async () => {throw Error("must not read")}});
  assert.equal(broad.product,undefined);
  const wrong = await researchProductName("NEMO Tensor All-Season", { search: async () => [source], fetch: async url => ({url,body:'<title>NEMO Tensor Extreme</title><p>Weight: 99 oz</p>'})});
  assert.equal(wrong.product,undefined);
});
test("exact tent-name aliases work offline without matching other capacities or brands", async () => {
  assert.ok(findCatalogProduct("Ozark Trail solo tent"));
  assert.equal(findCatalogProduct("Ozark Trail 2 person tent"),undefined);
  assert.equal(findCatalogProduct("REI solo tent"),undefined);
  assert.equal((await researchProductName("Ozark Trail solo tent")).product?.recovery?.method,"catalog");
});
test("model-planned searches preserve brand, product, and size rather than inventing identifiers", () => {
  const result=validateProductQueries(JSON.stringify({queries:["Ozark Trail 1 person tent specifications","Ozark Trail 2 person tent","NEMO Trail 1 person tent","https://example.com"]}),"Ozark Trail solo tent");
  assert.deepEqual(result,["Ozark Trail 1 person tent specifications"]);
  assert.deepEqual(validateProductQueries('{"queries":["NEMO Tensor 2025 sleeping pad specifications"]}',"NEMO Tensor 2024 sleeping pad"),[]);
});
