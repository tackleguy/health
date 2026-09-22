import type { ProductDetails } from "./types";
export function cleanProductDetails(value: unknown): ProductDetails {
  const v = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const details: ProductDetails = {};
  for (const key of ["brand", "model", "sku", "capacity", "materials", "dimensions"] as const) {
    if (typeof v[key] === "string") details[key] = v[key].trim().slice(0, ["materials", "dimensions"].includes(key) ? 1000 : 160) || null;
  }
  if (typeof v.price === "number" && Number.isFinite(v.price) && v.price >= 0 && v.price <= 1_000_000) details.price = v.price;
  if (typeof v.priceCurrency === "string" && /^[A-Z]{3}$/.test(v.priceCurrency)) details.priceCurrency = v.priceCurrency;
  if (typeof v.sourceCheckedAt === "string" && !Number.isNaN(Date.parse(v.sourceCheckedAt))) details.sourceCheckedAt = new Date(v.sourceCheckedAt).toISOString();
  return details;
}

export function cleanStoredProductDetails(value: unknown): ProductDetails & { packedSize?: string | null } {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { ...cleanProductDetails(v), ...(typeof v.packedSize === "string" ? { packedSize: v.packedSize.slice(0, 160) } : {}) };
}
