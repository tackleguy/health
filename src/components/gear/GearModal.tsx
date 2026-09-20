"use client";

import { useEffect, useState } from "react";
import {
  CATEGORY_ORDER,
  type GearCategory,
  type GearItem,
  type GearType,
} from "@/lib/gear";
import { GEAR_MODEL_PRESETS, resolveGearModelUrl } from "@/lib/gear-models";
import { GearModelViewer } from "./GearModelViewer";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (item: Omit<GearItem, "id">) => void;
  editItem?: GearItem | null;
}

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-background/40 px-3 py-2.5 text-sm text-cream outline-none transition placeholder:text-mist/50 focus:border-accent/50";
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
  const [modelUrl, setModelUrl] = useState("");
  const [customModel, setCustomModel] = useState("");

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setCategory(editItem.category);
      setQty(editItem.qty);
      setWeight(String(editItem.weight));
      setPrice(String(editItem.price));
      setType(editItem.type);
      setLink(editItem.link);
      const preset = GEAR_MODEL_PRESETS.find(
        (p) => p.id === editItem.modelUrl || p.url === editItem.modelUrl,
      );
      if (preset) {
        setModelUrl(preset.id);
        setCustomModel("");
      } else if (editItem.modelUrl) {
        setModelUrl("custom");
        setCustomModel(editItem.modelUrl);
      } else {
        setModelUrl("");
        setCustomModel("");
      }
    } else {
      setName("");
      setCategory("Shelter");
      setQty(1);
      setWeight("");
      setPrice("");
      setType("Base");
      setLink("");
      setModelUrl("");
      setCustomModel("");
    }
  }, [editItem, open]);

  if (!open) return null;

  const resolvedPreview = resolveGearModelUrl(
    modelUrl === "custom" ? customModel : modelUrl,
  );

  const handleSave = () => {
    if (!name.trim() || !weight) return;
    const resolved =
      modelUrl === "custom"
        ? customModel.trim()
        : modelUrl.trim();
    onSave({
      name: name.trim(),
      category,
      qty,
      weight: parseFloat(weight),
      price: parseFloat(price) || 0,
      type,
      link: link.trim(),
      modelUrl: resolved,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center bg-forest/70 px-4 py-8 backdrop-blur-md sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-modal max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-2xl p-8"
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
        <div className="mb-4">
          <label className={labelClass}>Link / Notes</label>
          <input
            className={inputClass}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Optional URL or notes"
          />
        </div>

        <div className="mb-4">
          <label className={labelClass}>3D Model</label>
          <select
            className={inputClass}
            value={modelUrl}
            onChange={(e) => setModelUrl(e.target.value)}
          >
            <option value="">None</option>
            {GEAR_MODEL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom GLB/GLTF URL…</option>
          </select>
          {modelUrl === "custom" && (
            <input
              className={`${inputClass} mt-2`}
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="https://…/model.glb"
            />
          )}
          <p className="mt-1.5 text-[0.65rem] text-mist">
            Connect a demo glass/gear model or paste your own .glb URL.
          </p>
        </div>

        {resolvedPreview && (
          <div className="mb-6 overflow-hidden rounded-xl border border-[var(--border)]">
            <GearModelViewer
              src={resolvedPreview}
              alt={name || "Gear model preview"}
              className="h-48 w-full"
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] bg-white/5 px-5 py-2.5 text-sm font-semibold text-cream transition hover:border-[var(--border-strong)]"
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
