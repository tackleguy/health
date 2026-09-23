import { fetchSource, parsePublicSearch, parseSearch, sourceUrl } from "./research";
import { htmlText } from "./product-text";
import { expandRegion, normalizeRegion } from "./regions";
import type { TrailResearchSource, WebSource } from "./types";

export function trailPublisher(raw: string) {
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    const within = (domain: string) => host === domain || host.endsWith(`.${domain}`);
    if (["nps.gov", "fs.usda.gov", "blm.gov", "parks.canada.ca", "parcs.canada.ca", "pc.gc.ca", "bcparks.ca", "albertaparks.ca", "ontarioparks.ca", "sepaq.com"].some(within)) return "Park or land manager";
    if (within("recreation.gov")) return "Official reservations";
    if (host.endsWith(".gov") || host.endsWith(".gc.ca") || /\.gov\.[a-z]{2}\.ca$/.test(host)) return "Government source";
    return "Independent guide · verify details";
  } catch { return "Independent guide · verify details"; }
}
export function trailSearchLocation(query: string) {
  return expandRegion(query.replace(/\b\d+(?:\.\d+)?\s*(?:-\s*)?(?:miles?|mi|km|kilomet(?:er|re)s?|days?|nights?)\b/gi, "").replace(/\s+/g, " ").trim());
}
export function rankTrailSources(query: string, sources: WebSource[], now = new Date().toISOString()): TrailResearchSource[] {
  const location = trailSearchLocation(query);
  const terms = location.split(" ").filter(t => t.length > 2 && !["the", "and", "near", "around", "for"].includes(t));
  const days = Number(query.match(/\b(\d+)\s*days?\b/i)?.[1] ?? 0);
  const overnight = days > 1 || /\b[1-9]\d*\s*nights?\b/i.test(query);
  if (!terms.length) return [];
  return sources.flatMap(source => {
    try { sourceUrl(source.url); } catch { return []; }
    let path = new URL(source.url).pathname;
    try { path = decodeURIComponent(path); } catch { /* Malformed escaped paths still need relevance checks. */ }
    const text = normalizeRegion(`${source.title} ${source.snippet} ${path}`);
    const words = new Set(text.split(" "));
    if (terms.filter(t => words.has(t)).length < Math.ceil(terms.length * 0.6) || !/\b(trails?|hiking|backpacking|backcountry|wilderness|camping|hikes?|trek|randonnee)\b/.test(text)) return [];
    const publisher = trailPublisher(source.url);
    if (overnight && publisher.startsWith("Independent") && !/\b(backpacking|backcountry|overnight|multi day|trek|camping)\b/.test(text)) return [];
    const topics = [
      /permit|reserv|booking/.test(text) ? "Permits & booking" : "",
      /closure|closed|conditions|alerts|bulletins/.test(text) ? "Conditions & access" : "",
      /camp|overnight|backcountry/.test(text) ? "Overnight planning" : "",
      /itinerar|loop|route|distance/.test(text) ? "Route details" : "",
    ].filter(Boolean);
    return [{ ...source, publisher, topics, retrievedAt: now }];
  }).filter((source, index, all) => all.findIndex(other => {
    const clean = (url: string) => { const u = new URL(url); return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, ""); };
    return clean(other.url) === clean(source.url);
  }) === index).sort((a, b) => Number(a.publisher.startsWith("Independent")) - Number(b.publisher.startsWith("Independent")) || b.topics.length - a.topics.length).slice(0, 8);
}

export async function searchTrailSources(query: string): Promise<TrailResearchSource[]> {
  const location = trailSearchLocation(query);
  if (!location) return [];
  const numbers = query.match(/\b\d+(?:\.\d+)?\s*(?:miles?|mi|km|days?|nights?)\b/gi)?.join(" ") ?? "";
  const focused = `${location} ${numbers} backpacking route`;
  const official = `${location} backpacking trails official`;
  const publicSearch = async (q: string) => {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(12000), cache: "no-store", redirect: "error" });
    if (response.status !== 200) throw new Error("Trail search unavailable");
    const html = await response.text();
    return html.length <= 2_000_000 ? parsePublicSearch(html) : [];
  };
  const jobs: Promise<WebSource[]>[] = [publicSearch(focused), publicSearch(official), fetchSource(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(official)}`).then(r => parseSearch(r.body))];
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  if (braveKey) jobs.push((async () => {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(focused)}&count=8`, { headers: { "X-Subscription-Token": braveKey, Accept: "application/json" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
    if (!response.ok) throw new Error("Trail search unavailable");
    const data = await response.json();
    return (data.web?.results ?? []).flatMap((source: { title?: string; url?: string; description?: string }) => {
      try { return [{ title: htmlText(source.title ?? "").slice(0, 240), url: sourceUrl(source.url ?? "").href, snippet: htmlText(source.description ?? "").slice(0, 600) }]; } catch { return []; }
    });
  })());
  const results = await Promise.allSettled(jobs);
  if (results.every(r => r.status === "rejected")) throw new Error("Online trail research is unavailable. Your saved route comparisons still work. Try again shortly.");
  return rankTrailSources(query, results.flatMap(r => r.status === "fulfilled" ? r.value : []));
}
