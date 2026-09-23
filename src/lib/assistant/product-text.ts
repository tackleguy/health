export function decodeText(text: string) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&nbsp;|&#160;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x([a-f\d]+);/gi, (_, n) => parseInt(n, 16) <= 0x10ffff ? String.fromCodePoint(parseInt(n, 16)) : "").replace(/&#(\d+);/g, (_, n) => Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : "");
}
export function htmlText(html: string) {
  return decodeText(html.replace(/<(script|style|noscript|title)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<\/(?:p|div|li|tr|td|th|dt|dd|h[1-6])>|<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[\t\r ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n+/g, "\n").trim();
}
export function weightToOz(text: string): number | null {
  // Metric and imperial equivalents describe one weight. Ranges need a human choice.
  if (/\d[^|()]*[-–—][^|()]*\d|\d[^|()]*\bto\b[^|()]*\d|(?:^|\s)[-−]\d|\d\s*\/\s*\d|[¼½¾<>≤≥≈~]|(?:^|\s)\.\d/i.test(text)) return null;
  text = text.replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, number => number.replaceAll(",", ""));
  if (/\d,\d/.test(text)) return null;
  const lb = text.match(/(\d+(?:\.\d+)?)\s*(?:lbs?\.?|pounds?)\b/i);
  const oz = text.match(/(\d+(?:\.\d+)?)\s*(?:oz\.?|ounces?)\b/i);
  const kg = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\b/i);
  const grams = text.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/i);
  const value = lb ? Number(lb[1])*16 + (oz ? Number(oz[1]) : 0) : oz ? Number(oz[1]) : kg ? Number(kg[1])*35.27396195 : grams ? Number(grams[1])/28.349523125 : null;
  return value != null && value > 0 && value < 16000 ? Math.round(value*100)/100 : null;
}
