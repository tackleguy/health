"use client";

import { useId, useState } from "react";
import { gearWeightOz } from "@/lib/assistant/planning";
import { formatPackWeight, type PackUnits } from "@/lib/assistant/packing";
import type { PlannerGear } from "@/lib/assistant/types";

export function PackInventory({ gear, packed, units, onToggle, onEdit }: { gear: PlannerGear[]; packed: string[]; units: PackUnits; onToggle: (id: string, checked: boolean) => void; onEdit: (item: PlannerGear) => void }) {
  const [sort, setSort] = useState("category");
  const id = useId();
  const ordered = [...gear].sort((a, b) => sort === "weight" ? (gearWeightOz(b) ?? -1) - (gearWeightOz(a) ?? -1) : sort === "name" ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  if (!gear.length) return <p className="planner-empty">Add your equipment below to build a packing list with real weights.</p>;
  return <div className="pack-inventory-detail">
    <div className="pack-list-toolbar"><h3 id={`${id}-title`}>Item weights</h3><label>Sort equipment<select value={sort} onChange={event => setSort(event.target.value)}><option value="category">Category</option><option value="weight">Heaviest first</option><option value="name">Name</option></select></label></div>
    <table className="pack-item-table" aria-labelledby={`${id}-title`}>
      <thead><tr><th scope="col"><span className="sr-only">Packed</span></th><th scope="col">Equipment</th><th className="pack-item-each" scope="col">Each</th><th className="pack-item-qty" scope="col">Qty</th><th scope="col">Total</th></tr></thead>
      <tbody>{ordered.map(item => {
        const total = gearWeightOz(item);
        return <tr key={item.id}>
          <td><label className="pack-item-check"><input type="checkbox" checked={packed.includes(item.id)} onChange={event => onToggle(item.id, event.target.checked)} /><span className="sr-only">Packed {item.name}</span></label></td>
          <th scope="row"><button type="button" className="pack-item-name" aria-label={`Edit ${item.name}`} onClick={() => onEdit(item)}>{item.name}</button><small>{item.category} · {item.type}{item.qty > 1 ? ` · ×${item.qty}` : ""}</small>{item.packedSize && <small>{item.packedSize}</small>}</th>
          <td className="pack-item-each">{total === null ? "Unknown" : formatPackWeight(item.weightOz!, units, true)}</td><td className="pack-item-qty">{item.qty}</td><td>{total === null ? <span className="pack-missing-weight">Unknown</span> : formatPackWeight(total, units, true)}</td>
        </tr>;
      })}</tbody>
    </table>
    <p className="planner-help">Select an item’s name to edit its weight or quantity. Worn items appear here for your checklist and are excluded from the starting pack total.</p>
  </div>;
}
