import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { ProductFact, ProductResearch, WebSource } from "./types";

export function publicIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || b === 2)) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0));
}
export function sourceUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || isIP(url.hostname) || url.hostname.includes(":") || !url.hostname.includes(".") || /\.(local|internal|localhost)$/i.test(url.hostname)) throw new Error("Use a public HTTPS product page.");
  return url;
}
// Pin DNS to a validated public IPv4 address, including every redirect.
export async function fetchSource(raw: string, redirects = 0): Promise<{ url: string; body: string }> {
  const url = sourceUrl(raw);
  if (redirects > 3) throw new Error("The source redirected too many times.");
  const addresses = await lookup(url.hostname, { family: 4, all: true });
  if (!addresses.length || addresses.some(a => !publicIPv4(a.address))) throw new Error("This source address is unavailable.");
  const response = await new Promise<{ status: number; location?: string; body: string }>((resolve, reject) => {
    const request = https.get(url, { family: 4, lookup: (_hostname, _options, callback) => callback(null, addresses[0].address, 4), headers: { "User-Agent": "OutdoorOS/1.0 (product-specification-research)", Accept: "text/html,application/xml,text/xml,application/rss+xml", "Accept-Encoding": "identity" } }, res => {
      const status = res.statusCode ?? 500;
      if (status >= 300 && status < 400) { res.resume(); resolve({ status, location: res.headers.location, body: "" }); return; }
      if (status !== 200) { res.resume(); reject(new Error(`Source returned ${status}. Try another official page.`)); return; }
      if (!/text\/|xml|json/.test(res.headers["content-type"] ?? "")) { res.resume(); reject(new Error("Use an HTML product page; this source is not readable text.")); return; }
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", chunk => { size += chunk.length; if (size > 2_000_000) { request.destroy(new Error("Source page is too large.")); return; } chunks.push(chunk); });
      res.on("end", () => resolve({ status, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    const timeout = setTimeout(() => request.destroy(new Error("Source timed out. Try another page.")), 12_000);
    request.on("close", () => clearTimeout(timeout));
    request.on("error", reject);
  });
  if (response.status >= 300 && response.status < 400 && response.location) return fetchSource(new URL(response.location, url).href, redirects + 1);
  if (response.status !== 200) throw new Error("The source did not provide a readable page.");
  return { url: url.href, body: response.body };
}
export function decodeText(text: string) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&nbsp;|&#160;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : "");
}
export function htmlText(html: string) {
  return decodeText(html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<\/(?:p|div|li|tr|td|th|dt|dd|h[1-6])>|<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[\t\r ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n+/g, "\n").trim();
}
export function weightToOz(text: string): number | null {
  // An imperial pair and its metric equivalent describe the same weight, not two weights.
  const lb = text.match(/(\d+(?:\.\d+)?)\s*(?:lbs?\.?|pounds?)\b/i);
  const oz = text.match(/(\d+(?:\.\d+)?)\s*(?:oz\.?|ounces?)\b/i);
  const kg = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\b/i);
  const grams = text.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/i);
  const value = lb ? Number(lb[1])*16 + (oz ? Number(oz[1]) : 0) : oz ? Number(oz[1]) : kg ? Number(kg[1])*35.27396195 : grams ? Number(grams[1])/28.349523125 : null;
  return value != null && value > 0 && value < 16000 ? Math.round(value*100)/100 : null;
}
export function parseProduct(html: string, url: string): ProductResearch {
  const text = htmlText(html);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const facts: ProductFact[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 200 || /shipping|dimensional weight|freight|customer|review/i.test(line)) continue;
    const weight = line.match(/^((?:(?:minimum|packaged|packed|trail|total|average|item|product|net)\s+)?weight(?:\s*\([^)]*\))?)\s*:?[\s–-]*(.*)$/i);
    const size = line.match(/^((?:(?:packed|pack|compressed|stuff sack|package|floor|unfolded|product)\s+)?(?:size|dimensions)|packed length|packed width|packed diameter|height|width|length|depth)\s*:?[\s–-]*(.*)$/i);
    const match = weight ?? size;
    if (!match) continue;
    const value = match[2].trim() || lines[i+1] || "";
    if (value.length > 160 || !/\d/.test(value) || /shipping/i.test(value)) continue;
    const weightOz = weight ? weightToOz(value) : null;
    if (weight && weightOz === null) continue;
    if (!weight && !/\b(?:in|inch|inches|cm|mm|ft|feet|liters?|litres?|l)\b|[″′"]/i.test(value)) continue;
    facts.push({ label: match[1], value, weightOz, kind: weight ? "weight" : /packed|pack |compressed|stuff sack/i.test(match[1]) ? "packed-size" : "dimensions", evidence: `${match[1]}: ${value}` });
  }
  // Only explicitly labelled facts are offered. The model never invents missing specifications.
  const unique = facts.filter((fact, i) => facts.findIndex(f => f.evidence === fact.evidence) === i).slice(0, 20);
  const title = decodeText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? new URL(url).hostname).replace(/<[^>]+>/g, "").trim().slice(0, 240);
  return { title, url, retrievedAt: new Date().toISOString(), facts: unique, excerpt: unique.map(f => f.evidence).join("\n").slice(0, 1600) };
}
export function parseSearch(xml: string): WebSource[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(match => {
    const field = (name: string) => decodeText(match[1].match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? "").replace(/<[^>]*>/g, "").trim();
    try { const url = sourceUrl(field("link")); return [{ title: field("title").slice(0, 200), url: url.href, snippet: field("description").slice(0, 350) }]; } catch { return []; }
  }).slice(0, 6);
}
export async function searchSources(query: string, kind: "trail" | "product"): Promise<WebSource[]> {
  if (process.env.BRAVE_SEARCH_API_KEY) {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query + (kind === "trail" ? " backpacking trail official" : " manufacturer weight packed dimensions"))}&count=6`, { headers: { "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY, Accept: "application/json" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
    if (!response.ok) throw new Error("Online search is unavailable.");
    const data = await response.json();
    return (data.web?.results ?? []).flatMap((r: { title?: string; url?: string; description?: string }) => {
      try { return [{ title: htmlText(r.title ?? "").slice(0, 200), url: sourceUrl(r.url ?? "").href, snippet: htmlText(r.description ?? "").slice(0, 350) }]; } catch { return []; }
    }).slice(0, 6);
  }
  if (kind === "product") {
    // An official manufacturer catalog provides useful product-name lookup without an API key.
    if (!/msr|hubba|therm.?a.?rest|platypus|seal.?line|packtowl|cascade designs/i.test(query)) return [];
    const terms = query.replace(/\b(msr|therm.?a.?rest|platypus|seal.?line|packtowl|cascade designs)\b/gi, "").trim() || query;
    const result = await fetchSource(`https://cascadedesigns.com/search/suggest.json?q=${encodeURIComponent(terms)}&resources%5Btype%5D=product&resources%5Blimit%5D=5`);
    const data = JSON.parse(result.body);
    return (data.resources?.results?.products ?? []).map((p: { title: string; url: string; body: string; vendor: string }) => ({ title: p.title, url: sourceUrl(new URL(p.url, "https://cascadedesigns.com").href).href, snippet: `${p.vendor} · Official manufacturer catalog. ${htmlText(p.body).slice(0, 200)}` })).slice(0, 5);
  }
  // Public encyclopedia search is discovery only: it never supplies an automatically chosen route.
  const region = query.replace(/\b\d+(?:\.\d+)?\s*(?:miles?|days?)\b/gi, "").trim();
  const response = await fetchSource(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${region} hiking trail`)}&format=json&srlimit=6`);
  const data = JSON.parse(response.body);
  return (data.query?.search ?? []).map((r: { title: string; snippet: string }) => ({ title: `${r.title} · Wikipedia`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replaceAll(" ", "_"))}`, snippet: htmlText(r.snippet).slice(0, 350) }));
}
