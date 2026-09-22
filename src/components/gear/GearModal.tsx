"use client";

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
  onSave: (item: Omit<GearItem, "id">) => void;
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
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(editItem?.name ?? "");
  const [category, setCategory] = useState<GearCategory>(editItem?.category ?? "Shelter");
  const [qty, setQty] = useState(editItem?.qty ?? 1);
  const [weight, setWeight] = useState(editItem ? String(editItem.weight) : "");
  const [price, setPrice] = useState(editItem ? String(editItem.price) : "");
  const [type, setType] = useState<GearType>(editItem?.type ?? "Base");
  const [link, setLink] = useState(editItem?.link ?? "");
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const handleSave = () => {
    if (!name.trim() || !Number.isFinite(Number(weight)) || Number(weight) <= 0 || !Number.isInteger(qty) || qty < 1) return;
    onSave({
      name: name.trim(),
      category,
      qty,
      weight: parseFloat(weight),
      price: parseFloat(price) || 0,
      type,
      link: link.trim(),
    });
    onClose();
  };

  return (
    <dialog ref={dialog} aria-labelledby={`${id}-title`} onCancel={onClose}
      className="gear-dialog m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-[560px] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-surface-elevated p-6 text-cream shadow-2xl sm:p-8"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <form onSubmit={event => { event.preventDefault(); handleSave(); }}>
        <h3 id={`${id}-title`} className="mb-6 font-display text-xl font-semibold text-cream">
          {editItem ? "Edit Gear" : "Add New Gear"}
        </h3>
        <div className="mb-4">
          <label htmlFor={`${id}-name`} className={labelClass}>Item Name</label>
          <input
            className={inputClass}
            id={`${id}-name`}
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
        <div className="mb-4 grid grid-cols-3 gap-3">
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
            <label htmlFor={`${id}-price`} className={labelClass}>Price ($)</label>
            <input
              className={inputClass}
              type="number"
              step="0.01" min="0"
              id={`${id}-price`}
            value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="299.99"
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
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] bg-surface px-5 py-2.5 text-sm font-semibold text-cream transition hover:border-[var(--border-strong)]"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {editItem ? "Save Changes" : "Add Gear"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
