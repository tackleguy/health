import { htmlText, weightToOz } from "./product-text";
import type { ProductFact, ProductFactKind, ProductResearch, ProductVariant } from "./types";

type Data = Record<string, unknown>;
const obj = (v: unknown): Data => v && typeof v === "object" && !Array.isArray(v) ? v as Data : {};
const list = (v: unknown): unknown[] => v == null ? [] : Array.isArray(v) ? v : [v];
const clean = (v: unknown, max = 500): string => typeof v === "string" || typeof v === "number" ? htmlText(String(v)).replace(/\s+/g, " ").trim().slice(0, max) : "";
const hasType = (v: Data, type: string) => list(v["@type"]).some(t => typeof t === "string" && t.split(/[\/#]/).pop() === type);
const quantity = (v: unknown): string => {
  const q = obj(v);
  const units: Record<string, string> = { GRM: "g", KGM: "kg", ONZ: "oz", LBR: "lb", CMT: "cm", MMT: "mm", INH: "in", LTR: "L" };
  return Object.keys(q).length ? [clean(q.value), units[clean(q.unitCode)] ?? clean(q.unitText ?? q.unitCode)].filter(Boolean).join(" ") : clean(v);
};
function fact(kind: ProductFactKind, label: string, value: string): ProductFact | null {
  if (!value || /^(?:n\/?a|unknown|not available)$/i.test(value)) return null;
  const weightOz = kind === "weight" ? weightToOz(value) : null;
  if (kind === "weight" && weightOz === null) return null;
  return { kind, label, value, weightOz, evidence: `${label}: ${value}` };
}
function labelled(label: string, value: string): ProductFact | null {
  if (/shipping|dimensional weight|freight|review/i.test(label) || !value || value.length > 500) return null;
  const kind: ProductFactKind | null = /^(?:(?:minimum|packaged|packed|trail|total|average|item|product|net)\s+)?weight(?:\s*\([^)]*\))?$/i.test(label) ? "weight"
    : /^(?:packed|pack|compressed|stuff sack)\s+(?:size|dimensions|length|width|diameter)$/i.test(label) ? "packed-size"
    : /^(?:(?:floor|unfolded|product|interior peak)\s+)?(?:dimensions|height|width|length|depth|thickness)$/i.test(label) ? "dimensions"
    : /^(?:(?:water|volume|sleeping|person)\s+)?(?:capacity|volume)$/i.test(label) ? "capacity"
    : /^(?:(?:shell|floor|canopy|rainfly|body|lining|outer|inner)\s+)?(?:materials?|fabric)$|^insulation$/i.test(label) ? "materials"
    : /^(?:brand|manufacturer)$/i.test(label) ? "brand" : /^model$/i.test(label) ? "model" : /^(?:sku|mpn)$/i.test(label) ? "sku" : null;
  if (!kind) return null;
  if (["packed-size", "dimensions", "capacity"].includes(kind) && !/\d/.test(value)) return null;
  return fact(kind, label, value);
}
function metadataPrice(html: string): ProductFact[] {
  const metadata: Record<string, string> = {};
  for (const match of html.matchAll(/<meta\b([^>]+)>/gi)) {
    const attrs = Object.fromEntries([...match[1].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m => [m[1].toLowerCase(), m[2]]));
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? "").toLowerCase();
    if (key) metadata[key] = attrs.content ?? "";
  }
  const amount = metadata["product:price:amount"] ?? metadata["og:price:amount"];
  const currency = metadata["product:price:currency"] ?? metadata["og:price:currency"];
  return structuredFacts({ offers: { price: amount, priceCurrency: currency } });
}
function visibleFacts(html: string): ProductFact[] {
  const lines = htmlText(html.replace(/<(header|footer|nav)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")).split("\n").map(l => l.trim()).filter(Boolean);
  const facts: ProductFact[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^([A-Za-z][A-Za-z ()/-]{1,55}?)\s*:\s*(.*)$/) ?? lines[i].match(/^((?:(?:minimum|packaged|packed|trail|total|average|item|product|net)\s+)?weight|packed size|packed dimensions|floor dimensions|dimensions|capacity|materials?|fabric|brand|model|sku)(?:\s+(.+))?$/i);
    if (!match) continue;
    const f = labelled(match[1].trim(), match[2]?.trim() || lines[i+1] || "");
    if (f) facts.push(f);
  }
  return facts;
}
function structuredFacts(p: Data): ProductFact[] {
  const facts: ProductFact[] = [];
  const add = (kind: ProductFactKind, label: string, value: string) => { const f = fact(kind, label, value); if (f) facts.push(f); };
  add("brand", "Brand", clean(obj(p.brand).name ?? p.brand ?? obj(p.manufacturer).name));
  add("model", "Model", clean(obj(p.model).name ?? p.model));
  add("sku", "SKU", clean(p.sku ?? p.mpn));
  add("weight", "Product weight", quantity(p.weight));
  add("materials", "Material", list(p.material).map(m => clean(obj(m).name ?? m)).filter(Boolean).join(", "));
  for (const key of ["height", "width", "depth", "length"] as const) add("dimensions", key[0].toUpperCase()+key.slice(1), quantity(p[key]));
  for (const value of list(p.additionalProperty).slice(0, 60)) {
    const prop = obj(value); const f = labelled(clean(prop.name ?? prop.propertyID), quantity(prop)); if (f) facts.push(f);
  }
  for (const value of list(p.offers).slice(0, 30)) {
    const offer = obj(value);
    if (hasType(offer, "AggregateOffer")) continue; // A "from" price is not this variant's price.
    const priceSpec = obj(offer.priceSpecification);
    const raw = offer.price ?? priceSpec.price;
    const currency = clean(offer.priceCurrency ?? priceSpec.priceCurrency).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency) || !/^(?:\d+)(?:\.\d{1,4})?$/.test(String(raw))) continue;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) continue;
    facts.push({ kind: "price", label: clean(offer.name) || "Listed price", value: `${amount.toFixed(2)} ${currency}`, amount, currency, weightOz: null, evidence: `Listed price: ${amount.toFixed(2)} ${currency}${offer.availability ? ` · ${clean(offer.availability).split('/').pop()}` : ""}` });
  }
  return facts;
}
function unique(facts: ProductFact[]) {
  return facts.filter((f, i) => facts.findIndex(other => other.kind === f.kind && other.label.toLowerCase() === f.label.toLowerCase() && other.value === f.value) === i).slice(0, 60);
}
function productUrl(p: Data, base: string) {
  try { const u = new URL(clean(p.url ?? obj(list(p.offers)[0]).url ?? p["@id"], 2000), base); return u.protocol === "https:" && !u.username && !u.password ? u.href.replace(/#.*$/, "") : base; } catch { return base; }
}
export function parseProduct(html: string, url: string): ProductResearch {
  const pageTitle = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  if (/^(?:robot or human\??|just a moment[.!…]*|access denied|verify (?:you are|you’re|you're) human)$/i.test(pageTitle)) {
    throw new Error("This retailer blocks automated lookup. Use another public product page or enter its specifications manually.");
  }
  const roots: Data[] = [];
  // Inspect only document entities, never recommendations or arbitrary nested objects.
  const visit = (v: unknown, depth = 0) => {
    if (depth > 5) return;
    if (Array.isArray(v)) { v.slice(0, 60).forEach(item => visit(item, depth+1)); return; }
    const p = obj(v);
    if (hasType(p, "Product") || hasType(p, "ProductGroup")) { roots.push(p); return; }
    if (p["@graph"]) visit(p["@graph"], depth+1);
    if (p.mainEntity) visit(p.mainEntity, depth+1);
  };
  const variantSpecs: Record<string, ProductFact[]> = {};
  for (const match of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].slice(0, 200)) {
    if (match[2].length > 500_000) continue;
    try {
      if (/type\s*=\s*["']application\/ld\+json["']/i.test(match[1])) visit(JSON.parse(match[2]));
      // Manufacturer-published variant specs, tied to the exact variant ID (e.g. NEMO).
      else if (/data-pdp-variant-specs-data\b/.test(match[1])) {
        const data = obj(JSON.parse(match[2]));
        for (const [id, values] of Object.entries(data).slice(0, 100)) variantSpecs[id] = list(values).slice(0, 60).flatMap(v => { const spec = obj(v); const f = labelled(clean(spec.specification), clean(spec.value)); return f ? [f] : []; });
      }
    } catch { /* Malformed structured data must not prevent labelled-spec extraction. */ }
  }
  const base = new URL(url);
  const matching = roots.filter(p => { const u = new URL(productUrl(p, url)); return u.origin === base.origin && u.pathname.replace(/\/$/, "") === base.pathname.replace(/\/$/, ""); });
  const selected = matching;
  const visible = [...visibleFacts(html), ...metadataPrice(html)];
  const fallback = (structured: ProductFact[]) => visible.filter(f => !["brand", "model", "sku", "price"].includes(f.kind) || !structured.some(s => s.kind === f.kind));
  let title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? base.hostname, 240);
  const variants: ProductVariant[] = [];
  let facts: ProductFact[] = [];
  for (const p of selected.slice(0, 20)) {
    const children = list(p.hasVariant).map(obj).filter(v => Object.keys(v).length);
    const name = clean(p.name, 240);
    if (selected.length === 1 && name) title = name;
    if (children.length) {
      for (const child of children.slice(0, 60)) {
        const combined = { ...p, ...child, hasVariant: undefined, offers: child.offers, weight: child.weight, additionalProperty: child.additionalProperty };
        const childUrl = productUrl(child, url);
        const id = new URL(childUrl).searchParams.get("variant") ?? clean(child.sku) ?? String(variants.length);
        const specific = variantSpecs[id] ?? [];
        variants.push({ id: `${variants.length}:${id}`, name: clean(child.name, 240) || name, url: childUrl, facts: unique([...structuredFacts(combined), ...specific, ...fallback(structuredFacts(combined)).map(f => ({ ...f, requiresChoice: true }))]) });
      }
    } else {
      const structured = structuredFacts(p);
      const extracted = unique([...structured, ...fallback(structured).map(f => selected.length > 1 ? { ...f, requiresChoice: true } : f)]);
      if (selected.length > 1) variants.push({ id: String(variants.length), name: name || `Product ${variants.length+1}`, url: productUrl(p, url), facts: extracted });
      else facts = extracted;
    }
  }
  if (!selected.length) facts = unique(visible);
  return { title, url, retrievedAt: new Date().toISOString(), facts, variants, excerpt: facts.map(f => f.evidence).join("\n").slice(0, 1600) };
}
