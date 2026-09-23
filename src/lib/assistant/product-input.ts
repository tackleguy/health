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
export function matchesProductSearch(query: string, source: WebSource) {
  const tokens = [...new Set(words(query).filter(w => w.length > 2 || /^\d+$/.test(w)))];
  const title = new Set(words(source.title));
  const all = new Set(words(`${source.title} ${source.snippet}`));
  const has = (set: Set<string>, word: string) => set.has(word) || set.has(`${word}s`);
  // Match words, not substrings: "trailers" and "rottentomatoes" are not trail tents.
  return tokens.length > 0
    && tokens.filter(t => has(title, t)).length >= Math.min(2, tokens.length)
    && tokens.filter(t => has(all, t)).length >= Math.ceil(tokens.length * 0.7);
}
