"use client";

import { productLookupInput } from "@/lib/assistant/product-input";
import { ProductLookup, type ProductLookupHandle } from "@/components/assistant/ProductLookup";
import { ProductDetailsFields } from "@/components/assistant/ProductDetailsFields";
import type { ProductDetails } from "@/lib/assistant/types";
import "@/components/assistant/planner.css";
import { useEffect, useId, useRef, useState } from "react";
import {
  CATEGORY_ORDER,
  type GearCategory,
  type GearItem,
  type GearType,
} from "@/lib/gear";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (item: Omit<GearItem, "id">) => Promise<boolean>;
  editItem?: GearItem | null;
}

const inputClass =
  "w-full rounded-lg border border-[var(--control-border)] bg-background/60 px-3 py-2.5 text-base text-cream outline-none transition placeholder:text-mist/50 focus:border-accent/50";
const labelClass =
  "mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-sage";

export function GearModal(props: Props) {
  return props.open ? <GearModalForm key={props.editItem?.id ?? "new"} {...props} /> : null;
}

function GearModalForm({ onClose, onSave, editItem }: Props) {
  const id = useId();
  const productLookup = useRef<ProductLookupHandle>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const lookupDetails = useRef<HTMLDetailsElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(editItem?.name ?? "");
  const [category, setCategory] = useState<GearCategory>(editItem?.category ?? "Shelter");
  const [qty, setQty] = useState(editItem?.qty ?? 1);
  const [weight, setWeight] = useState(editItem ? String(editItem.weight) : "");
  const [details, setDetails] = useState<ProductDetails>({ ...editItem?.productDetails, price: editItem?.price ?? null, priceCurrency: editItem?.productDetails?.priceCurrency ?? "USD" });
  const [packedSize, setPackedSize] = useState(editItem?.productDetails?.packedSize ?? "");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<GearType>(editItem?.type ?? "Base");
  const [link, setLink] = useState(editItem?.link ?? "");
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const handleSave = async () => {
    if (saving) return;
    if (!name.trim() || !Number.isFinite(Number(weight)) || Number(weight) <= 0 || !Number.isInteger(qty) || qty < 1) return;
    setSaving(true);
    try {
    const saved = await onSave({
      name: name.trim(),
      category,
      qty,
      weight: parseFloat(weight),
      price: details.price ?? 0,
      productDetails: { ...details, packedSize },
      type,
      link: link.trim(),
    });
    if (saved) onClose();
    else setNotice("Could not save your gear. Your draft is still here; try again.");
    } catch { setNotice("Could not save your gear. Your draft is still here; try again."); }
    finally { setSaving(false); }
  };

  function fillParameters() {
    const input = productLookupInput(name, link);
    if (!input) { setNotice("Enter an item name or product link first."); nameInput.current?.focus(); return; }
    setNotice("");
    if (lookupDetails.current) lookupDetails.current.open = true;
    productLookup.current?.fill(input);
  }
  return (
    <dialog ref={dialog} aria-labelledby={`${id}-title`} onCancel={onClose}
      className="gear-dialog m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-[560px] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-surface-elevated p-6 text-cream shadow-2xl sm:p-8"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="planner-shell gear-dialog-content">
        <h3 id={`${id}-title`} className="mb-6 font-display text-xl font-semibold text-cream">
          {editItem ? "Edit Gear" : "Add New Gear"}
        </h3>
        <details ref={lookupDetails} className="product-more"><summary>Fill details from a product name or link</summary><ProductLookup ref={productLookup} onBusyChange={setLookingUp} onUse={draft => {
          const { name: foundName, weightOz, packedSize: foundSize, sourceUrl, ...metadata } = draft;
          setName(foundName.slice(0, 180)); if (weightOz !== undefined) setWeight(String(weightOz));
          if (foundSize !== undefined) setPackedSize(foundSize);
          setLink(sourceUrl); setDetails(current => ({ ...current, ...metadata }));
          setNotice("Details filled below. Review, then save your gear.");
          if (lookupDetails.current) lookupDetails.current.open = false;
          nameInput.current?.focus();
        }} /></details>
      <form onSubmit={event => { event.preventDefault(); void handleSave(); }}>
        <div className="mb-4">
          <label htmlFor={`${id}-name`} className={labelClass}>Item Name</label>
          <input
            className={inputClass}
            id={`${id}-name`} ref={nameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required maxLength={180}
            placeholder="e.g., Nemo Tensor Sleeping Pad"
          />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-category`} className={labelClass}>Category</label>
            <select
              className={inputClass}
              id={`${id}-category`}
            value={category}
              onChange={(e) => setCategory(e.target.value as GearCategory)}
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-qty`} className={labelClass}>Quantity</label>
            <input
              className={inputClass}
              type="number"
              min={1}
              id={`${id}-qty`}
            value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
            />
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-weight`} className={labelClass}>Weight (oz)</label>
            <input
              className={inputClass}
              type="number"
              step="any" min="0.01" required
              id={`${id}-weight`}
            value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="16.0"
            />
          </div>
          <div>
            <label htmlFor={`${id}-type`} className={labelClass}>Type</label>
            <select
              className={inputClass}
              id={`${id}-type`}
            value={type}
              onChange={(e) => setType(e.target.value as GearType)}
            >
              <option value="Base">Base Weight</option>
              <option value="Worn">Worn</option>
              <option value="Consumable">Consumable</option>
            </select>
          </div>
        </div>
        <label className="mb-4">Packed dimensions<input value={packedSize} onChange={e => setPackedSize(e.target.value)} maxLength={160} /></label>
        <ProductDetailsFields value={details} onChange={setDetails} />
        <div className="mb-6">
          <label htmlFor={`${id}-link`} className={labelClass}>Link / Notes</label>
          <input
            className={inputClass}
            id={`${id}-link`}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Optional URL or notes"
          />
        </div>
        <div className="gear-form-actions">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] bg-surface px-5 py-2.5 text-sm font-semibold text-cream transition hover:border-[var(--border-strong)]"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : editItem ? "Save Changes" : "Add Gear"}
          </button>
          <button type="button" className="planner-button secondary" disabled={saving || lookingUp} onClick={fillParameters}>{lookingUp ? "Filling parameters…" : "Fill out parameters"}</button>
        </div>
        <p className="planner-help" role="status">{notice}</p>
      </form>
      </div>
    </dialog>
  );
}
