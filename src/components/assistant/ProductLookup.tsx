"use client";
import { useState } from "react";
import type { ProductResearch, WebSource } from "@/lib/assistant/types";
export function ProductLookup({ onUse }: { onUse: (name: string, weightOz: number | null, packedSize: string | null, url: string) => void }) {
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [sources, setSources] = useState<WebSource[]>([]);
  const [product, setProduct] = useState<ProductResearch | null>(null);
  const [weightIndex, setWeightIndex] = useState("");
  const [sizeIndex, setSizeIndex] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function find() {
    setBusy(true); setError(""); setSources([]); setProduct(null);
    try { const response = await fetch(`/api/assistant/research?kind=product&q=${encodeURIComponent(query)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error); setSources(data.sources); if (!data.sources.length) setError("No indexed product found. Use the web search link, then paste the manufacturer’s product URL below."); }
    catch (e) { setError(e instanceof Error ? e.message : "Search failed. Try an official product URL."); } finally { setBusy(false); }
  }
  async function read(page: string) {
    setBusy(true); setError(""); setProduct(null); setWeightIndex(""); setSizeIndex(""); setUrl(page);
    try { const response = await fetch("/api/assistant/product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: page }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setProduct(data); if (!data.facts.length) setError("No labelled specifications were found. Open the source and enter the exact model’s weight and packed size manually."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not read this source. Enter the specs manually."); } finally { setBusy(false); }
  }
  return <div className="planner-product">
    <p>Enter the exact brand, model, size, and year. Built-in name lookup covers Cascade Designs brands; use a source URL for other products.</p>
    <form className="planner-inline" onSubmit={e => { e.preventDefault(); void find(); }}>
      <label className="planner-grow">Product name<input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. MSR Hubba Hubba LT 2" maxLength={180} minLength={3} required /></label>
      <button className="planner-button secondary" disabled={busy}>Find product</button>
    </form>
    {sources.length > 0 && <ul className="planner-sources">{sources.map((s, i) => <li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a><button className="planner-link" type="button" disabled={busy} onClick={() => void read(s.url)}>Read specs</button></li>)}</ul>}
    <form className="planner-inline" onSubmit={e => { e.preventDefault(); void read(url); }}>
      <label className="planner-grow">Or paste a product page<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://manufacturer.com/product" required maxLength={2000} /></label><button className="planner-button secondary" disabled={busy}>Read page</button>
    </form>
    <div role="status" className="planner-help">{busy ? "Looking up public source pages…" : error}</div>
    {query.length >= 3 && <a className="planner-link" href={`https://www.google.com/search?q=${encodeURIComponent(`${query} official weight packed dimensions`)}`} target="_blank" rel="noopener noreferrer">Search the web yourself</a>}
    {product && product.facts.length > 0 && <div className="planner-extracted">
      <h4>{product.title}</h4><p>Extracted from the page; confirm the exact variant and what is included. Minimum, packaged, and shipping weights are different.</p>
      <div className="planner-fields">
        <label>Weight to use<select value={weightIndex} onChange={e => setWeightIndex(e.target.value)}><option value="">Choose a weight</option>{product.facts.map((f, i) => f.kind === "weight" && <option key={i} value={i}>{f.label}: {f.value}</option>)}</select></label>
        <label>Packed size to use<select value={sizeIndex} onChange={e => setSizeIndex(e.target.value)}><option value="">Not found / not selected</option>{product.facts.map((f, i) => f.kind === "packed-size" && <option key={i} value={i}>{f.label}: {f.value}</option>)}</select></label>
      </div>
      {product.facts.filter(f => f.kind === "dimensions").map((f, i) => <p key={i} className="planner-help">{f.label}: {f.value} · not confirmed as packed size</p>)}
      <a href={product.url} target="_blank" rel="noopener noreferrer">Check source page</a>
      <button type="button" className="planner-button secondary" disabled={weightIndex === "" && sizeIndex === ""} onClick={() => onUse(query || product.title, weightIndex === "" ? null : product.facts[Number(weightIndex)].weightOz, sizeIndex === "" ? null : product.facts[Number(sizeIndex)].value, product.url)}>Use these specifications in the form below</button>
    </div>}
  </div>;
}
