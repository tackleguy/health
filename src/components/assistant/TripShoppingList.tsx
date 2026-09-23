"use client";
import { useState } from "react";
import { shoppingForTrip, tripNeeds } from "@/lib/assistant/shopping";
import type { PlannerGear, ShoppingItem, TripRequest } from "@/lib/assistant/types";
export function TripShoppingList({ request, inventory, selected, edits, onChange, onInclude, onAddGear, onSave, canSave }: { request: TripRequest; inventory: PlannerGear[]; selected: PlannerGear[]; edits: ShoppingItem[]; onChange: (items: ShoppingItem[]) => void; onInclude: (id: string) => void; onAddGear: () => void; onSave: () => void; canSave: boolean }) {
  const [name, setName] = useState("");
  const items = shoppingForTrip(request, inventory, edits);
  const owned = tripNeeds(request).flatMap(need => {
    if (selected.some(need.matches)) return [];
    const match = inventory.find(need.matches);
    return match ? [{ need, gear: match }] : [];
  });
  const pending = items.filter(item => item.status === "needed").length;
  function status(item: ShoppingItem, value: ShoppingItem["status"]) { onChange([...edits.filter(e => e.id !== item.id), { ...item, status: value }]); }
  return <section className="planner-shopping" aria-labelledby="shopping-title">
    <div className="planner-section-heading"><h3 id="shopping-title">Shopping list for this trip</h3><span role="status">{pending} to get</span></div>
    <p className="planner-help">Suggested from your trip length, temperature and all {inventory.length} items in your gear locker. Borrow or buy only what you need; review these suggestions for your actual route. Marking an item obtained does not add weight to your pack.</p>
    {owned.length > 0 && <div><h4>You own these — add them to the pack</h4><ul className="planner-shopping-items">{owned.map(({ need, gear }) => <li key={need.id}><span>{gear.name}<small>{need.name}</small></span><button className="planner-button secondary" onClick={() => onInclude(gear.id)}>Include in pack</button></li>)}</ul></div>}
    {items.length === 0 && <p>Your locker covers the suggested equipment categories. Check quantities, condition, fit and route-specific requirements.</p>}
    <ul className="planner-shopping-items">{items.map(item => <li key={item.id}>
      <div><strong>{item.name}</strong><p className="planner-help">{item.reason}</p>{item.status === "needed" && <a href={`https://www.google.com/search?q=${encodeURIComponent(item.name + " hiking gear")}`} target="_blank" rel="noopener noreferrer">Research options</a>}</div>
      <label><span className="sr-only">Status for {item.name}</span><select value={item.status} onChange={e => status(item, e.target.value as ShoppingItem["status"])}><option value="needed">Need to get</option><option value="obtained">Obtained / borrowed</option><option value="skip">Not needed this trip</option></select></label>
      {item.id.startsWith("custom:") && <button className="planner-link" aria-label={`Remove ${item.name}`} onClick={() => onChange(edits.filter(e => e.id !== item.id))}>Remove</button>}
    </li>)}</ul>
    <form className="planner-shopping-add" onSubmit={e => { e.preventDefault(); if (!name.trim() || edits.length >= 100) return; onChange([...edits, { id: `custom:${crypto.randomUUID()}`, name: name.trim(), reason: "Added for this trip.", status: "needed" }]); setName(""); }}><label>Add something else<input value={name} onChange={e => setName(e.target.value)} maxLength={180} placeholder="e.g. spare camera battery" /></label><button className="planner-button secondary" disabled={!name.trim() || edits.length >= 100}>Add to shopping list</button></form>
    <div className="planner-actions"><button className="planner-button secondary" onClick={onSave} disabled={!canSave}>Save trip & shopping list</button><button className="planner-link" onClick={onAddGear}>Add obtained equipment to my gear</button></div><p className="planner-help">Save this trip to keep the list on this device. The downloadable checklist includes it too.</p>
  </section>;
}
