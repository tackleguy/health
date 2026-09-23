import { parseProduct } from "./product-parser";
import { weightToOz } from "./product-text";
import type { ProductFact, ProductResearch, WebSource } from "./types";

// Excerpts are lower-confidence evidence, never a verified measurement. Only
// extract explicit, labelled values; no model-generated numbers or currency guesses.
export function productFromExcerpt(source: WebSource): ProductResearch {
  const text = `${source.title}\n${source.snippet}`;
  const facts: ProductFact[] = [];
  const add = (kind: ProductFact["kind"], label: string, value: string, extra: Partial<ProductFact> = {}) => {
    if (!facts.some(f => f.kind === kind && f.value === value)) facts.push({ kind, label, value, weightOz: null, evidence: `Search excerpt (unverified): ${source.snippet || source.title}`, ...extra });
  };
  const measure = String.raw`\d+(?:\.\d+)?\s*(?:lbs?\.?|pounds?|oz\.?|ounces?|kg|kilograms?|g|grams?)\b(?:\s+\d+(?:\.\d+)?\s*(?:oz\.?|ounces?)\b)?`;
  const weight = new RegExp(String.raw`\b((?:(?:carry|packed|packaged|total|trail|minimum|product|item|net)\s+)?weight)\s*[:=–-]?\s*(${measure})|(${measure})\s*((?:(?:carry|packed|packaged|total|trail|minimum|product|item|net)\s+)?weight)`, "gi");
  for (const match of text.matchAll(weight)) {
    const before = text.slice(Math.max(0, match.index! - 35), match.index);
    const after = text.slice(match.index! + match[0].length, match.index! + match[0].length + 25);
    if (/(?:shipping|fabric|fill|freight|dimensional|up to|under|about|around|approximately|[<>])\s*$/i.test(before) || (!match[1] && /[\d,.\/–—~≈-]\s*$/.test(before)) || /^\s*(?:[-–—]|to\b)\s*\d/.test(after)) continue;
    const value = match[2] || match[3], weightOz = weightToOz(value);
    if (weightOz !== null) add("weight", match[1] || match[4], value, { weightOz });
  }
  for (const match of text.matchAll(/\b((?:packed|compressed|stuff sack)\s+(?:size|dimensions)|(?:floor|product|unfolded)\s+dimensions|dimensions)\s*[:=]?\s*(\d+(?:\.\d+)?\s*(?:in(?:ches)?\.?|cm|mm|ft|["′″'])?\s*[x×]\s*\d+(?:\.\d+)?\s*(?:in(?:ches)?\.?|cm|mm|ft|["′″'])?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\s*(?:in(?:ches)?\.?|cm|mm|ft|["′″']))/gi)) {
    add(/packed|compressed|stuff sack/i.test(match[1]) ? "packed-size" : "dimensions", match[1], match[2].replace(/\.$/, ""));
  }
  // A dollar sign alone does not establish USD vs CAD.
  for (const match of text.matchAll(/\b(?:price|listed price)\s*:\s*(?:(USD|CAD|EUR|GBP)\s*)?(\d+(?:\.\d{1,2})?)\s*(USD|CAD|EUR|GBP)?\b/gi)) {
    const currency = (match[1] || match[3])?.toUpperCase();
    if (currency && Number(match[2]) <= 1_000_000) add("price", "Indexed price", `${match[2]} ${currency}`, { amount: Number(match[2]), currency });
  }
  return { title: source.title, url: source.url, retrievedAt: new Date().toISOString(), facts, variants: [], excerpt: source.snippet };
}

export function productFromPastedSpecs(text: string, title: string, url: string): ProductResearch {
  const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const input = text.slice(0, 12000);
  const parsed = parseProduct(input.split(/\n|\t/).map(line => `<p>${escape(line)}</p>`).join(""), url);
  const excerpt = productFromExcerpt({ title: "", snippet: input, url });
  const facts = [...parsed.facts, ...excerpt.facts].filter((f, i, all) => all.findIndex(other => other.kind === f.kind && other.value === f.value) === i);
  return { ...parsed, title: title || "Your product", facts: facts.map(f => ({ ...f, label: f.kind === "price" ? "Price" : f.label, evidence: `Pasted specifications (unverified): ${f.kind === "price" ? "Price" : f.label}: ${f.value}` })), recovery: { method: "pasted-specs", requestedUrl: url, notice: "Extracted from the text you pasted. Check that the values and units describe your exact item before filling the form.", sources: [] } };
}
