import { formatPackWeight, packingGuide, type PackUnits } from "@/lib/assistant/packing";
import { gearWeightOz, REFERENCES } from "@/lib/assistant/planning";
import type { PlannerGear, TripRequest } from "@/lib/assistant/types";

export function PackingGuide({ gear, request, packed, onToggle, units, capacityLiters }: { gear: PlannerGear[]; request: TripRequest; packed: string[]; onToggle: (id: string, checked: boolean) => void; units: PackUnits; capacityLiters: number | null }) {
  const steps = packingGuide(gear, request);
  return <div className="packing-guide">
    <p className="planner-help">A suggested order for your selected equipment. Placement follows item names and categories; adjust it for your pack’s compartments and what you need on trail.</p>
    <ol className="packing-guide-steps">{steps.map(step => <li key={step.zone}>
      <div className="packing-guide-step-heading"><h3>{step.title}</h3><span>{step.zone}</span></div>
      <p>{step.guidance}</p>
      <ul className="packing-guide-tips">{step.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>
      {step.items.length > 0 ? <ul className="packing-guide-items">{step.items.map(item => {
        const weight = gearWeightOz(item);
        return <li key={item.id}><label className="planner-check"><input type="checkbox" checked={packed.includes(item.id)} onChange={event => onToggle(item.id, event.target.checked)} /><span>{item.name}{item.qty > 1 ? ` ×${item.qty}` : ""}<small>{weight === null ? "Weight unknown" : formatPackWeight(weight, units, true)}{item.packedSize ? ` · ${item.packedSize}` : ""}</small></span></label></li>;
      })}</ul> : <p className="planner-help">No selected items in this section. Review whether your trip needs any.</p>}
    </li>)}</ol>
    <p className="planner-help">{capacityLiters ? `Your pack capacity is ${capacityLiters} L. ` : "Add your pack capacity in My trip preferences. "}Item dimensions do not prove that everything fits; do a test pack before departure.</p>
    <p className="planner-help">Guidance adapted from <a href={REFERENCES.packing} target="_blank" rel="noopener noreferrer">REI’s backpack-loading guide</a>. Review the <a href={REFERENCES.essentials} target="_blank" rel="noopener noreferrer">National Park Service’s Ten Essentials</a> against your route and conditions.</p>
  </div>;
}
