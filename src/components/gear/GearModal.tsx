"use client";

import { useEffect, useState } from "react";
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
  "w-full rounded-lg border border-[var(--border)] bg-background/60 px-3 py-2.5 text-sm text-cream outline-none transition placeholder:text-mist/50 focus:border-accent/50";
const labelClass =
  "mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-sage";

export function GearModal({ open, onClose, onSave, editItem }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GearCategory>("Shelter");
  const [qty, setQty] = useState(1);
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState<GearType>("Base");
  const [link, setLink] = useState("");

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setCategory(editItem.category);
      setQty(editItem.qty);
      setWeight(String(editItem.weight));
      setPrice(String(editItem.price));
      setType(editItem.type);
      setLink(editItem.link);
    } else {
      setName("");
      setCategory("Shelter");
      setQty(1);
      setWeight("");
      setPrice("");
      setType("Base");
      setLink("");
    }
  }, [editItem, open]);

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim() || !weight) return;
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
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center bg-forest/80 px-4 py-8 backdrop-blur-md sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-surface-elevated p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-6 font-display text-xl font-semibold text-cream">
          {editItem ? "Edit Gear" : "Add New Gear"}
        </h3>
        <div className="mb-4">
          <label className={labelClass}>Item Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Nemo Tensor Sleeping Pad"
          />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Category</label>
            <select
              className={inputClass}
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
            <label className={labelClass}>Quantity</label>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
            />
          </div>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Weight (oz)</label>
            <input
              className={inputClass}
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="16.0"
            />
          </div>
          <div>
            <label className={labelClass}>Price ($)</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="299.99"
            />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select
              className={inputClass}
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
          <label className={labelClass}>Link / Notes</label>
          <input
            className={inputClass}
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
          <button type="button" onClick={handleSave} className="btn-primary">
            {editItem ? "Save Changes" : "Add Gear"}
          </button>
        </div>
      </div>
    </div>
  );
}
