import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { decodeText, htmlText } from "./product-text";
export { decodeText, htmlText, weightToOz } from "./product-text";
export { parseProduct } from "./product-parser";
import type { WebSource } from "./types";

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
    const request = https.get(url, { family: 4, lookup: (_hostname, _options, callback) => callback(null, addresses[0].address, 4), headers: { "User-Agent": "TrailPack/1.0 (product-specification-research)", Accept: "text/html,application/xml,text/xml,application/rss+xml", "Accept-Encoding": "identity" } }, res => {
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
    // Public manufacturer catalogs work without a search key or model download.
    const catalogs = [
      { match: /\b(msr|hubba|therm.?a.?rest|platypus|seal.?line|packtowl|cascade designs)\b/i, strip: /\b(msr|therm.?a.?rest|platypus|seal.?line|packtowl|cascade designs)\b/gi, origin: "https://cascadedesigns.com" },
      { match: /\b(nemo|tensor)\b/i, strip: /\bnemo(?: equipment)?\b/gi, origin: "https://www.nemoequipment.com" },
      { match: /\b(big agnes|copper spur)\b/i, strip: /\bbig agnes\b/gi, origin: "https://www.bigagnes.com" },
      { match: /\bsea\s*to\s*summit\b/i, strip: /\bsea\s*to\s*summit\b/gi, origin: "https://seatosummit.com" },
    ];
    const catalog = catalogs.find(c => c.match.test(query));
    if (catalog) {
      const terms = query.replace(catalog.strip, "").trim() || query;
      try {
        const result = await fetchSource(`${catalog.origin}/search/suggest.json?q=${encodeURIComponent(terms)}&resources%5Btype%5D=product&resources%5Blimit%5D=5`);
        const data = JSON.parse(result.body);
        const products = (data.resources?.results?.products ?? []).slice(0, 5).flatMap((p: { title?: string; url?: string; body?: string; vendor?: string }) => {
          try {
            if (!p.url || !p.title) return [];
            const url = sourceUrl(new URL(p.url, catalog.origin).href);
            for (const key of ["_pos", "_sid", "_ss", "_psq", "_psid"]) url.searchParams.delete(key);
            return [{ title: htmlText(p.title).slice(0, 200), url: url.href, snippet: `${htmlText(p.vendor ?? "")} · Manufacturer catalog. ${htmlText(p.body ?? "").slice(0, 200)}` }];
          } catch { return []; }
        });
        if (products.length) return products;
      } catch { /* Fall back to public search when a manufacturer's catalog is unavailable. */ }
    }
    const result = await fetchSource(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query + " product specifications weight price")}`);
    const tokens = query.toLowerCase().match(/[a-z0-9]+/g)?.filter(t => t.length > 2) ?? [];
    return parseSearch(result.body).filter(s => {
      const text = `${s.title} ${s.snippet} ${s.url}`.toLowerCase();
      return tokens.length > 0 && tokens.filter(t => text.includes(t)).length >= Math.max(1, Math.ceil(tokens.length * 0.7));
    });
  }
  // Public encyclopedia search is discovery only: it never supplies an automatically chosen route.
  const region = query.replace(/\b\d+(?:\.\d+)?\s*(?:miles?|days?)\b/gi, "").trim();
  const response = await fetchSource(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${region} hiking trail`)}&format=json&srlimit=6`);
  const data = JSON.parse(response.body);
  return (data.query?.search ?? []).map((r: { title: string; snippet: string }) => ({ title: `${r.title} · Wikipedia`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replaceAll(" ", "_"))}`, snippet: htmlText(r.snippet).slice(0, 350) }));
}
