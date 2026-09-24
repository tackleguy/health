import { parseProduct } from "./product-parser";
import type { ProductFact, ProductResearch } from "./types";

/** The public product endpoint is used only after the page identifies its storefront. */
export function storefrontProductUrl(html: string, raw: string): string | null {
  if (!/cdn\.shopify\.com|Shopify\.(?:shop|theme|routes)|shopify-section/i.test(html)) return null;
  const url = new URL(raw);
  const match = url.pathname.match(/^(.*?)(?:\/collections\/[^/]+)?\/products\/([^/]+)\/?$/);
  if (!match || /\.(?:js|json)$/i.test(match[2])) return null;
  url.pathname = `${match[1]}/products/${match[2]}.js`;
  url.search = ""; url.hash = "";
  return url.href;
}
const variantId = (url: string) => new URL(url).searchParams.get("variant");
function addMissing(primary: ProductFact[], extra: ProductFact[]) {
  return [...primary, ...extra.filter(f => !primary.some(p => p.kind === f.kind))].slice(0, 60);
}
export function combineSameProduct(primary: ProductResearch, extra: ProductResearch): ProductResearch {
  // Fields from different size IDs must never leak across variants.
  if (primary.variants.length) return { ...primary, variants: primary.variants.map(v => {
    const match = extra.variants.find(other => variantId(v.url) && variantId(other.url) === variantId(v.url));
    return { ...v, facts: addMissing(v.facts, match?.facts ?? []) };
  }) };
  if (extra.variants.length) return { ...extra, variants: extra.variants.map(v => ({ ...v, facts: addMissing(v.facts, primary.facts.map(f => ["brand", "model"].includes(f.kind) ? f : { ...f, requiresChoice: true })) })) };
  return { ...primary, facts: addMissing(primary.facts, extra.facts) };
}
export function parseStorefrontProduct(body: string, pageUrl: string, primary: ProductResearch): ProductResearch {
  const data = JSON.parse(body);
  const base = new URL(pageUrl);
  const handle = decodeURIComponent(base.pathname.match(/\/products\/([^/]+)\/?$/)?.[1] ?? "");
  if (!data || typeof data !== "object" || !handle || data.handle !== handle || typeof data.title !== "string" || !Array.isArray(data.variants)) throw new Error("Product data did not match the requested page.");
  // Shopify's numeric variant weight is a fulfillment field, not verified carry
  // weight. Extract labelled specifications from the description instead.
  const currencies = new Set([...primary.facts, ...primary.variants.flatMap(v => v.facts)].filter(f => f.kind === "price" && f.currency).map(f => f.currency));
  const currency = currencies.size === 1 ? [...currencies][0] : undefined;
  const variants = data.variants.slice(0, 100).flatMap((v: Record<string, unknown>) => {
    if (!v || !/^\d+$/.test(String(v.id)) || typeof v.title !== "string") return [];
    const url = new URL(base); url.search = ""; url.hash = ""; url.searchParams.set("variant", String(v.id));
    const price = typeof v.price === "number" && Number.isInteger(v.price) && v.price >= 0 && v.price <= 100_000_000 && currency ? v.price / 100 : undefined;
    return [{ "@type": "Product", name: v.title === "Default Title" ? data.title : `${data.title} — ${v.title}`, url: url.href, sku: typeof v.sku === "string" ? v.sku : undefined, offers: price === undefined ? undefined : { price, priceCurrency: currency } }];
  });
  const product = { "@type": "Product", name: data.title, url: base.href, brand: typeof data.vendor === "string" ? data.vendor : undefined, description: typeof data.description === "string" ? data.description.slice(0, 60000) : "", ...(variants.length === 1 && data.variants[0].title === "Default Title" ? { sku: variants[0].sku, offers: variants[0].offers } : { hasVariant: variants }) };
  const html = `<script type="application/ld+json">${JSON.stringify(product).replaceAll("<", "\\u003c")}</script>`;
  return parseProduct(html, pageUrl);
}
