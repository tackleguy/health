export const normalizeRegion = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const aliases: Record<string, string> = {
  al: "alabama", ak: "alaska", az: "arizona", ar: "arkansas", ca: "california", co: "colorado", ct: "connecticut", de: "delaware", fl: "florida", ga: "georgia", hi: "hawaii", id: "idaho", il: "illinois", in: "indiana", ia: "iowa", ks: "kansas", ky: "kentucky", la: "louisiana", me: "maine", md: "maryland", ma: "massachusetts", mi: "michigan", mn: "minnesota", ms: "mississippi", mo: "missouri", mt: "montana", ne: "nebraska", nv: "nevada", nh: "new hampshire", nj: "new jersey", nm: "new mexico", ny: "new york", nc: "north carolina", nd: "north dakota", oh: "ohio", ok: "oklahoma", or: "oregon", pa: "pennsylvania", ri: "rhode island", sc: "south carolina", sd: "south dakota", tn: "tennessee", tx: "texas", ut: "utah", vt: "vermont", va: "virginia", wa: "washington", wv: "west virginia", wi: "wisconsin", wy: "wyoming",
  ab: "alberta", bc: "british columbia", mb: "manitoba", nb: "new brunswick", nl: "newfoundland and labrador", ns: "nova scotia", nt: "northwest territories", nu: "nunavut", on: "ontario", pe: "prince edward island", qc: "quebec", sk: "saskatchewan", yt: "yukon", usa: "united states", us: "united states", "u s a": "united states", "u s": "united states",
};
export function expandRegion(value: string) {
  // Expand only standalone abbreviations or comma-delimited location parts.
  // This avoids turning the word "in" in a park name into Indiana.
  return value.split(",").map(part => aliases[normalizeRegion(part)] ?? normalizeRegion(part)).join(" ").replace(/\b(?:usa|united states of america|u s a)\b/g, "united states");
}
export function regionMatches(region: string, location: string) {
  const terms = expandRegion(region).split(" ").filter(Boolean);
  const haystack = new Set(expandRegion(location).split(" "));
  return terms.length > 0 && terms.every(t => haystack.has(t));
}
