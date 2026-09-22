"use client";
import { useEffect, useId, useRef, useState } from "react";
import { defaultSelections, makeProductDraft, PRODUCT_FIELDS } from "@/lib/assistant/product-draft";
import type { ProductDraft, ProductFactKind, ProductResearch, WebSource } from "@/lib/assistant/types";

export function ProductLookup({ onUse }: { onUse: (draft: ProductDraft) => void }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<WebSource[]>([]);
  const [product, setProduct] = useState<ProductResearch | null>(null);
  const [variantIndex, setVariantIndex] = useState("");
  const [selections, setSelections] = useState<Partial<Record<ProductFactKind, string>>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function lookup(value: string, isPage = false) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort("timeout"), 45_000);
    setBusy(true); setStatus(""); setProduct(null); setVariantIndex(""); setSelections({});
    if (!isPage) setSources([]);
    const page = isPage || /^https?:\/\//i.test(value.trim());
    try {
      const response = await fetch(page ? "/api/assistant/product" : `/api/assistant/research?kind=product&q=${encodeURIComponent(value.trim())}`, {
        ...(page ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: value.trim() }) } : {}), signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "This source is unavailable.");
      if (request.current !== controller) return;
      if (page) {
        const result = data as ProductResearch;
        setProduct(result);
        let selected = "";
        if (result.variants.length === 1) selected = "0";
        else if (result.variants.length) {
          const variantId = new URL(value).searchParams.get("variant");
          const index = variantId ? result.variants.findIndex(v => new URL(v.url).searchParams.get("variant") === variantId) : -1;
          if (index >= 0) selected = String(index);
        }
        setVariantIndex(selected);
        setSelections(defaultSelections(selected !== "" ? result.variants[Number(selected)].facts : result.facts));
        setStatus(result.variants.length && selected === "" ? "Choose your exact size or variant to see its specifications." : result.facts.length || result.variants.length ? "Specifications found. Review the values, then fill your gear form." : "No readable specifications found. Open the source and enter details manually, or try a different product link.");
      } else {
        setSources(data.sources);
        setStatus(data.sources.length ? `${data.sources.length} matches. Choose your product to read its specifications.` : "No matching product found. Try the exact brand and model, or paste a manufacturer or retailer link.");
      }
    } catch (e) {
      if (request.current === controller) setStatus(controller.signal.aborted ? "Lookup timed out. Try another product link." : e instanceof Error ? e.message : "Lookup failed. Try another product link.");
    } finally {
      clearTimeout(timer);
      if (request.current === controller) setBusy(false);
    }
  }
  const facts = product ? product.variants.length ? product.variants[Number(variantIndex)]?.facts ?? [] : product.facts : [];
  const hasVariant = !product?.variants.length || variantIndex !== "";
  return <div className="planner-product">
    <p id={`${id}-help`}>Paste a product link or enter its brand and model. Review weight, price, dimensions, capacity, and materials before saving.</p>
    <form className="planner-inline" onSubmit={e => { e.preventDefault(); void lookup(query); }}>
      <label className="planner-grow">Product name or link<input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. NEMO Tensor All-Season or https://…" maxLength={2000} minLength={3} required aria-describedby={`${id}-help`} /></label>
      <button className="planner-button secondary" disabled={busy}>{busy ? "Looking up…" : "Find product details"}</button>
      {busy && <button type="button" className="planner-link" onClick={() => { request.current?.abort(); request.current = null; setBusy(false); setStatus("Lookup cancelled. You can enter details manually."); }}>Cancel lookup</button>}
    </form>
    <p role="status" className="planner-help">{busy ? "Reading public product sources…" : status}</p>
    {sources.length > 0 && <ul className="planner-sources product-matches">{sources.map((s, i) => <li key={`${s.url}-${i}`}><div><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a><small>{new URL(s.url).hostname}</small></div><button className="planner-button secondary" type="button" disabled={busy} aria-label={`Read details for ${s.title}`} onClick={() => void lookup(s.url, true)}>Read details</button></li>)}</ul>}
    {product && <div className="planner-extracted">
      <h4>{product.title}</h4>
      <p>Listed prices may change and exclude tax or delivery. Check what is included in each weight.</p>
      {product.variants.length > 0 && <label className="product-variant">Size / variant<select value={variantIndex} onChange={e => { setVariantIndex(e.target.value); setSelections(defaultSelections(e.target.value === "" ? [] : product.variants[Number(e.target.value)].facts)); }}><option value="">Choose your exact variant</option>{product.variants.map((v, i) => <option key={v.id} value={i}>{v.name}</option>)}</select></label>}
      {hasVariant && <div className="planner-fields">{PRODUCT_FIELDS.map(({ kind, label }) => {
        const options = facts.map((f, i) => ({ ...f, i })).filter(f => f.kind === kind);
        return <label key={kind}>{label}<select aria-label={label} aria-describedby={selections[kind] ? `${id}-${kind}-evidence` : undefined} disabled={!options.length} value={selections[kind] ?? ""} onChange={e => setSelections(s => ({ ...s, [kind]: e.target.value }))}>
          <option value="">{options.length ? "Leave current value unchanged" : "Not found — enter manually"}</option>
          {["materials", "dimensions"].includes(kind) && options.length > 1 && <option value="all">Use all {label.toLowerCase()}</option>}
          {options.map(f => <option key={f.i} value={f.i}>{f.label}: {f.value}{f.requiresChoice ? " (confirm variant)" : ""}</option>)}
        </select>{options.length > 0 && selections[kind] && <small id={`${id}-${kind}-evidence`}>{selections[kind] === "all" ? options.map(f => f.evidence).join("; ") : facts[Number(selections[kind])]?.evidence}</small>}</label>;
      })}</div>}
      <p className="planner-help"><a href={variantIndex !== "" ? product.variants[Number(variantIndex)]?.url ?? product.url : product.url} target="_blank" rel="noopener noreferrer">Check source page</a> · Retrieved {new Date(product.retrievedAt).toLocaleDateString()}</p>
      <button type="button" className="planner-button" disabled={!hasVariant || !facts.length} onClick={() => { const draft = makeProductDraft(product, variantIndex, selections); if (draft) { onUse(draft); setStatus("Details copied to your gear form. Review and save when ready."); } }}>Fill gear form</button>
    </div>}
  </div>;
}
