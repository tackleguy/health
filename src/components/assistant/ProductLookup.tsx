"use client";
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from "react";
import { normalizeProductInput } from "@/lib/assistant/product-input";
import { defaultSelections, makeProductDraft, PRODUCT_FIELDS } from "@/lib/assistant/product-draft";
import { productFromPastedSpecs } from "@/lib/assistant/product-excerpt";
import type { ProductDraft, ProductFactKind, ProductResearch, WebSource } from "@/lib/assistant/types";

export interface ProductLookupHandle { fill: (input: string) => void }
export function ProductLookup({ onUse, ref, onBusyChange, productName = "" }: { onUse: (draft: ProductDraft) => void; ref?: Ref<ProductLookupHandle>; onBusyChange?: (busy: boolean) => void; productName?: string }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<WebSource[]>([]);
  const [product, setProduct] = useState<ProductResearch | null>(null);
  const [variantIndex, setVariantIndex] = useState("");
  const [selections, setSelections] = useState<Partial<Record<ProductFactKind, string>>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [pasted, setPasted] = useState("");
  const request = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const autoFill = useRef(false);
  useImperativeHandle(ref, () => ({ fill(value) {
    const input = normalizeProductInput(value);
    setQuery(input);
    inputRef.current?.focus();
    if (input.length < 3) { setStatus("Enter a product name or paste a product link to fill its parameters."); return; }
    autoFill.current = true;
    if (product && (input === normalizeProductInput(query) || input === product.url || product.variants.some(v => v.url === input))) {
      if (product.recovery) { setStatus("Review the recovered details below, then choose Fill out parameters to use them."); resultRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" }); return; }
      const draft = makeProductDraft(product, variantIndex, selections);
      if (!draft) { setStatus("Choose your exact size or variant, then fill out parameters."); resultRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" }); return; }
      if (Object.keys(draft).length > 3) { onUse(draft); setStatus("Parameters filled. Review your gear before saving."); return; }
    }
    void lookup(input);
  } }));
  useEffect(() => () => request.current?.abort(), []);

  async function lookup(value: string, isPage = false, sourceName = "") {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort("timeout"), 55_000);
    setBusy(true); onBusyChange?.(true); setStatus(""); setProduct(null); setVariantIndex(""); setSelections({});
    setPasted("");
    if (!isPage) setSources([]);
    value = normalizeProductInput(value);
    const page = isPage || /^https?:\/\//i.test(value.trim());
    try {
      const response = await fetch(page ? "/api/assistant/product" : `/api/assistant/research?kind=product&q=${encodeURIComponent(value.trim())}`, {
        cache: "no-store",
        ...(page ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: value.trim(), name: (sourceName || productName).slice(0, 240) }) } : {}), signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "This source is unavailable.");
      if (request.current !== controller) return;
      if (page) {
        const result = data as ProductResearch;
        setProduct(result);
        if (result.recovery) setSources(result.recovery.sources.filter(s => s.url !== result.url));
        let selected = "";
        if (result.variants.length === 1) selected = "0";
        else if (result.variants.length) {
          const variantId = new URL(value).searchParams.get("variant");
          const index = variantId ? result.variants.findIndex(v => new URL(v.url).searchParams.get("variant") === variantId) : -1;
          if (index >= 0) selected = String(index);
        }
        setVariantIndex(selected);
        const facts = selected !== "" ? result.variants[Number(selected)].facts : result.facts;
        const defaults = defaultSelections(facts);
        setSelections(defaults);
        if (autoFill.current && !result.recovery && (!result.variants.length || selected !== "") && facts.length && Object.values(defaults).some(v => v !== "")) {
          const draft = makeProductDraft(result, selected, defaults);
          if (draft) { onUse(draft); setStatus("Parameters filled. Review your gear before saving."); return; }
        }
        setStatus(result.recovery?.notice ?? (result.variants.length && selected === "" ? "Choose your exact size or variant to see its specifications." : result.facts.length || result.variants.length ? "Specifications found. Review the values, then fill your gear form." : "No readable specifications found. Try another product link."));
      } else {
        setSources(data.sources);
        setStatus(data.sources.length ? `${data.sources.length} matches. Choose your product to read its specifications.` : "No matching product found. Try the exact brand and model, or paste a manufacturer or retailer link.");
      }
    } catch (e) {
      if (request.current === controller) setStatus(controller.signal.aborted ? "Lookup timed out. Try another product link." : e instanceof Error ? e.message : "Lookup failed. Try another product link.");
    } finally {
      clearTimeout(timer);
      if (request.current === controller) {
        setBusy(false); onBusyChange?.(false);
        resultRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
      }
    }
  }
  const facts = product ? product.variants.length ? product.variants[Number(variantIndex)]?.facts ?? [] : product.facts : [];
  const hasVariant = !product?.variants.length || variantIndex !== "";
  const canApply = hasVariant && Object.values(selections).some(Boolean);
  return <div className="planner-product">
    <p id={`${id}-help`}>Paste a product link or enter its brand and model. Review weight, price, dimensions, capacity, and materials before saving.</p>
    <form className="planner-inline" onSubmit={e => { e.preventDefault(); autoFill.current = false; void lookup(query); }}>
      <label className="planner-grow">Product name or link<input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. NEMO Tensor All-Season or https://…" maxLength={2000} minLength={3} required aria-describedby={`${id}-help`} /></label>
      <button className="planner-button secondary" disabled={busy}>{busy ? "Looking up…" : "Find product details"}</button>
      {busy && <button type="button" className="planner-link" onClick={() => { request.current?.abort(); request.current = null; setBusy(false); onBusyChange?.(false); setStatus("Lookup cancelled. You can enter details manually."); }}>Cancel lookup</button>}
    </form>
    <div ref={resultRef}><p role="status" className="planner-help">{busy ? "Checking the product page and alternate public sources…" : status}</p>
    {status && !busy && !product && sources.length === 0 && query.trim().length >= 3 && <p className="planner-help"><a href={`https://www.google.com/search?q=${encodeURIComponent(`${query} product specifications`)}`} target="_blank" rel="noopener noreferrer">Find the exact product page</a>, then paste its link above. Some retailers block automated lookup.</p>}
    {sources.length > 0 && <details open={!product || !facts.length}><summary>{product?.recovery ? "Other possible product matches" : "Matching products"}</summary><ul className="planner-sources product-matches">{sources.map((s, i) => <li key={`${s.url}-${i}`}><div><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a><small>{new URL(s.url).hostname}</small></div><button className="planner-button secondary" type="button" disabled={busy} aria-label={`Read details for ${s.title}`} onClick={() => void lookup(s.url, true, s.title)}>Read details</button></li>)}</ul></details>}
    {product && <div className="planner-extracted">
      <h4>{product.title}</h4>
      {product.recovery?.method === "search-excerpt" && <p><strong>Unverified · search excerpt</strong></p>}
      {product.recovery?.method === "alternate-page" && <p><strong>Alternate source · confirm the model</strong></p>}
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
      <button type="button" className="planner-button" disabled={!canApply} onClick={() => { const draft = makeProductDraft(product, variantIndex, selections); if (draft) { onUse(draft); setStatus("Details copied to your gear form. Review and save when ready."); } }}>Fill out parameters</button>
    </div>}
    {product?.recovery && !busy && <details className="product-more"><summary>Extract details from copied specifications</summary><p className="planner-help">Open the product page yourself and paste its specification list here. Include units and the price currency. This text is processed in your browser.</p><label>Product specifications<textarea value={pasted} onChange={e => setPasted(e.target.value)} rows={5} maxLength={12000} placeholder={"Weight: 4.4 lb\nPacked size: 18 x 5 in\nPrice: 39.95 USD"} /></label><button type="button" className="planner-button secondary" disabled={!pasted.trim()} onClick={() => {
      const result = productFromPastedSpecs(pasted, productName || product.title, product.recovery!.requestedUrl);
      setProduct(result); setVariantIndex(""); setSelections(defaultSelections(result.facts)); setSources([]);
      setStatus(result.facts.length ? result.recovery!.notice : "No labelled specifications found. Paste lines such as Weight: 4.4 lb or Packed size: 18 x 5 in, including units.");
      resultRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
    }}>Extract pasted specifications</button></details>}
    </div>
  </div>;
}
