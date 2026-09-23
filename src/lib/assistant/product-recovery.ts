import { fetchSource, parseProduct, searchProductWeb, sourceUrl } from "./research";
import { isProductCollection, matchesProductIdentity, productNameFromUrl, sameProductListing } from "./product-input";
import { productFromExcerpt } from "./product-excerpt";
import type { ProductResearch, WebSource } from "./types";

type Dependencies = {
  fetch: typeof fetchSource;
  search: (query: string, requestedUrl: string) => Promise<WebSource[]>;
};
const dependencies: Dependencies = { fetch: fetchSource, search: searchProductWeb };
const useful = (p: ProductResearch) => [...p.facts, ...p.variants.flatMap(v => v.facts)].some(f => !["brand", "model", "sku"].includes(f.kind));

export async function researchProduct(url: string, name = "", deps = dependencies): Promise<ProductResearch> {
  sourceUrl(url); // Reject unsafe inputs before searching or fetching alternatives.
  let original: ProductResearch | undefined;
  try {
    const page = await deps.fetch(url);
    original = parseProduct(page.body, page.url);
    if (useful(original) && !isProductCollection(url)) return original;
    if (isProductCollection(url)) original = undefined;
  } catch { /* Public alternate sources can recover a blocked/unreadable page. */ }
  const identity = name.trim().slice(0, 180) || productNameFromUrl(url);
  const query = identity || url;
  let sources: WebSource[] = [];
  try { sources = await deps.search(query, url); } catch { /* Keep the draft editable if discovery is offline. */ }
  // Prefer the indexed excerpt of the exact listing over specifications from a
  // lookalike. Still require review: search indexes may be stale or truncated.
  const exact = sources.find(s => sameProductListing(url, s.url));
  const excerpt = exact ? productFromExcerpt(exact) : undefined;
  const recovery = (method: NonNullable<ProductResearch["recovery"]>["method"], notice: string) => ({ method, notice, requestedUrl: url, sources });
  if (excerpt && useful(excerpt)) return { ...excerpt, recovery: recovery("search-excerpt", "The product page could not be read. These details come from its public search excerpt and are unverified. Confirm your exact model and values before filling the form.") };
  const candidates = sources.filter(s => !sameProductListing(url, s.url) && !isProductCollection(s.url) && identity && matchesProductIdentity(identity, s.title)).slice(0, 2);
  const pages = await Promise.allSettled(candidates.map(async s => {
    const page = await deps.fetch(s.url);
    const product = parseProduct(page.body, page.url);
    return useful(product) && !isProductCollection(product.url) && matchesProductIdentity(identity, product.title) ? product : null;
  }));
  const alternate = pages.flatMap(r => r.status === "fulfilled" && r.value ? [r.value] : [])[0];
  if (alternate) return { ...alternate, recovery: recovery("alternate-page", "The original page could not be read. Found specifications on another public page. Confirm the model, size and included parts match your item before filling the form.") };
  return { ...(original ?? { title: identity || "Find your product", url, retrievedAt: new Date().toISOString(), facts: [], variants: [], excerpt: "" }), recovery: recovery("not-found", sources.length ? "Found possible matches, but no usable specifications yet. Choose your exact product below, or paste its specifications to extract them." : identity ? "No usable public specifications found yet. Paste the specifications from your product page below to extract them." : "This link does not identify the product. Enter the brand and model in Item name and try again, or paste its specifications below.") };
}
