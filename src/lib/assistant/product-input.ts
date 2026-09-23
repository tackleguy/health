import type { WebSource } from "./types";

export function productLookupInput(name: string, link: string): string {
  const value = link.trim();
  // Notes belong to the gear form, not the search query. Prefer an actual link.
  return /^(?:https?:\/\/|www\.)/i.test(value) ? normalizeProductInput(value) : normalizeProductInput(name);
}
export function normalizeProductInput(value: string) {
  const input = value.trim();
  return /^www\./i.test(input) ? `https://${input}` : input;
}
function words(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
}
export function sameProductListing(a: string, b: string) {
  try {
    const left = new URL(a), right = new URL(b);
    if (left.hostname.replace(/^www\./, "") !== right.hostname.replace(/^www\./, "")) return false;
    const path = (u: URL) => u.pathname.replace(/\/$/, "");
    // Walmart's descriptive slug changes; its public item ID stays the same.
    const walmartId = (u: URL) => u.hostname.endsWith("walmart.com") ? u.pathname.match(/^\/ip\/(?:[^/]+\/)?(\d+)\/?$/)?.[1] : undefined;
    if (path(left) !== path(right) && !(walmartId(left) && walmartId(left) === walmartId(right))) return false;
    for (const key of ["variant", "sku", "pid", "id"]) if (left.searchParams.get(key) !== right.searchParams.get(key)) return false;
    return true;
  } catch { return false; }
}
export function productNameFromUrl(raw: string) {
  try {
    return new URL(raw).pathname.split("/").map(part => decodeURIComponent(part))
      .filter(part => /[a-z]{3}/i.test(part) && !/^(?:ip|dp|p|products?|shop|item|index\.html?)$/i.test(part))
      .sort((a, b) => b.length - a.length)[0]?.replace(/\.html?$/i, "").replace(/[-_]+/g, " ").slice(0, 180) ?? "";
  } catch { return ""; }
}
export function isProductCollection(raw: string) {
  try {
    const path = new URL(raw).pathname;
    return !/\/products\/[^/]+/i.test(path) && (/\/(?:collections?|categories|search)(?:\/|$)/i.test(path) || /\/(?:tents|backpacks|sleeping-bags)\/?$/i.test(path));
  } catch { return true; }
}
export function matchesProductIdentity(query: string, title: string) {
  const normalized = (value: string) => words(value.replace(/\bsolo\b|\bone[ -]person\b/gi, "1 person"))
    .filter(w => !["the", "a", "for", "with", "and", "by"].includes(w));
  const target = normalized(query);
  const actual = new Set(normalized(title));
  // Recovery must not promote a category page or a different model just because
  // its brand and category overlap. Loose matches remain user-selected leads.
  return target.length >= 2 && target.every(t => actual.has(t) || actual.has(`${t}s`) || (t.endsWith("s") && actual.has(t.slice(0, -1))));
}
export function matchesProductSearch(query: string, source: WebSource) {
  const tokens = [...new Set(words(query).filter(w => w.length > 2 || /^\d+$/.test(w)))];
  const title = new Set(words(source.title));
  const all = new Set(words(`${source.title} ${source.snippet}`));
  const has = (set: Set<string>, word: string) => set.has(word) || set.has(`${word}s`);
  // Match words, not substrings: "trailers" and "rottentomatoes" are not trail tents.
  return tokens.length > 0
    && tokens.filter(t => /\d/.test(t)).every(t => all.has(t))
    && tokens.filter(t => has(title, t)).length >= Math.min(2, tokens.length)
    && tokens.filter(t => has(all, t)).length >= Math.ceil(tokens.length * 0.7);
}
