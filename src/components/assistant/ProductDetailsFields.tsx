"use client";
import type { ProductDetails } from "@/lib/assistant/types";

export function ProductDetailsFields({ value, onChange }: { value: ProductDetails; onChange: (value: ProductDetails) => void }) {
  const set = (key: keyof ProductDetails, text: string) => onChange({ ...value, [key]: text || null });
  return <>
    <div className="planner-fields">
      <label>Price per item<input type="number" min="0" max="1000000" step="0.01" value={value.price ?? ""} placeholder="Unknown" onChange={e => onChange({ ...value, price: e.target.value === "" ? null : Number(e.target.value) })} /></label>
      <label>Currency<input value={value.priceCurrency ?? ""} onChange={e => set("priceCurrency", e.target.value.toUpperCase())} placeholder="USD or CAD" pattern="[A-Z]{3}" maxLength={3} required={value.price != null} autoCapitalize="characters" /></label>
    </div>
    <details className="product-more"><summary>Brand, dimensions & other details</summary><div className="planner-fields">
      {([ ["brand", "Brand"], ["model", "Model"], ["sku", "SKU"], ["capacity", "Capacity"] ] as const).map(([key, label]) => <label key={key}>{label}<input value={value[key] ?? ""} onChange={e => set(key, e.target.value)} maxLength={160} /></label>)}
      <label className="planner-span">Product dimensions<textarea value={value.dimensions ?? ""} onChange={e => set("dimensions", e.target.value)} rows={2} maxLength={1000} /></label>
      <label className="planner-span">Materials<textarea value={value.materials ?? ""} onChange={e => set("materials", e.target.value)} rows={2} maxLength={1000} /></label>
    </div></details>
  </>;
}
