import test from "node:test";
import assert from "node:assert/strict";
import { productLinkInput, validateProductLinks } from "./product-links";
import type { WebSource } from "./types";

const sources: WebSource[] = [
  { title: "NEMO Tensor All-Season Sleeping Pad", url: "https://www.nemoequipment.com/products/tensor-all-season", snippet: "Packed weight 1 lb 1 oz" },
  { title: "Best sleeping pads 2026 comparison", url: "https://example.com/reviews/pads", snippet: "We compared ten pads" },
  { title: "NEMO Tensor Extreme", url: "https://www.nemoequipment.com/products/tensor-extreme", snippet: "Different model" },
  { title: "NEMO Tensor All-Season at REI", url: "https://www.rei.com/product/tensor-all-season", snippet: "Specifications and weight" },
];

test("link selection keeps only valid unique source indexes in order", () => {
  assert.deepEqual(
    validateProductLinks(JSON.stringify({ indexes: [0, 3, 0, 99, "1", 1.5] }), sources).map(s => s.url),
    [sources[0].url, sources[3].url],
  );
});

test("empty or invalid answers never invent links", () => {
  assert.deepEqual(validateProductLinks("{}", sources), []);
  assert.deepEqual(validateProductLinks("not json", sources), []);
  assert.deepEqual(validateProductLinks(JSON.stringify({ indexes: [] }), sources), []);
  assert.deepEqual(validateProductLinks(JSON.stringify({ indexes: [0] }), []), []);
});

test("product link prompt input stays bounded and indexed", () => {
  const input = productLinkInput("NEMO Tensor All-Season", sources);
  assert.equal(input.product, "NEMO Tensor All-Season");
  assert.equal(input.sources.length, 4);
  assert.equal(input.sources[0].index, 0);
  assert.match(input.sources[0].url, /nemoequipment/);
});
