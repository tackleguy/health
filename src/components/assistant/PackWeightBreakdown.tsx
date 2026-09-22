"use client";

import { useId, useState } from "react";
import { formatPackWeight, weightBreakdown, type PackUnits } from "@/lib/assistant/packing";
import { packReport } from "@/lib/assistant/planning";
import type { PlannerGear, TripRequest } from "@/lib/assistant/types";

const COLORS = ["#245b47", "#527987", "#aa7246", "#807096", "#78843b", "#a45556", "#40857a", "#667789", "#9d795d", "#577047", "#82695c"];

export function PackWeightBreakdown({ gear, request, units, onUnitsChange }: { gear: PlannerGear[]; request: TripRequest; units: PackUnits; onUnitsChange: (units: PackUnits) => void }) {
  const [byCategory, setByCategory] = useState(false);
  const id = useId();
  const slices = weightBreakdown(gear, request, byCategory);
  const report = packReport(gear, request, null);
  const total = slices.reduce((sum, slice) => sum + slice.oz, 0);
  const segments = slices.map((slice, index) => ({ ...slice, color: COLORS[index % COLORS.length], percentage: total > 0 ? slice.oz / total * 100 : 0, offset: total > 0 ? slices.slice(0, index).reduce((sum, part) => sum + part.oz, 0) / total * 100 : 0 }));

  return <section className="pack-breakdown" aria-labelledby={`${id}-title`}>
    <div className="pack-breakdown-heading"><h3 id={`${id}-title`}>Where the weight goes</h3><label>Weight units<select value={units} onChange={event => onUnitsChange(event.target.value as PackUnits)}><option value="imperial">Pounds / ounces</option><option value="metric">Kilograms / grams</option></select></label></div>
    <div className="pack-chart-tabs" role="group" aria-label="Weight breakdown view"><button type="button" aria-pressed={!byCategory} onClick={() => setByCategory(false)}>By load type</button><button type="button" aria-pressed={byCategory} onClick={() => setByCategory(true)}>By gear category</button></div>
    <div className="pack-chart-layout">
      <figure className="pack-chart">
        <svg viewBox="0 0 220 220" aria-hidden="true" focusable="false">
          <circle cx="110" cy="110" r="82" fill="none" stroke="var(--surface-muted)" strokeWidth="26" />
          {segments.filter(segment => segment.oz > 0).map(segment => <circle key={segment.label} cx="110" cy="110" r="82" fill="none" stroke={segment.color} strokeWidth="26" pathLength="100" strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`} strokeDashoffset={-segment.offset} transform="rotate(-90 110 110)" />)}
          <text x="110" y="109" textAnchor="middle" className="pack-chart-total">{formatPackWeight(total, units)}</text>
          <text x="110" y="130" textAnchor="middle" className="pack-chart-label">{report.complete ? "starting pack" : "known weight"}</text>
        </svg>
        <figcaption>{report.complete ? "Starting pack" : "Known pack weight"}: <strong>{formatPackWeight(total, units)}</strong>. Worn gear is separate.</figcaption>
      </figure>
      <table className="pack-weight-table">
        <caption>{byCategory ? "Gear categories and additional supplies" : "Starting load breakdown"}</caption>
        <thead><tr><th scope="col">{byCategory ? "Category" : "Load"}</th><th scope="col">Weight</th><th scope="col">Share</th></tr></thead>
        <tbody>{segments.map(segment => <tr key={segment.label}><th scope="row"><span className="pack-chart-key" style={{ backgroundColor: segment.color }} aria-hidden="true" />{segment.label}{segment.missing > 0 && <small>Incomplete</small>}</th><td>{segment.missing > 0 && segment.oz === 0 ? "Not set" : formatPackWeight(segment.oz, units)}</td><td>{segment.oz > 0 ? `${segment.percentage < 1 ? "<1" : Math.round(segment.percentage)}%` : "—"}</td></tr>)}</tbody>
        <tfoot><tr><th scope="row">{report.complete ? "Starting pack" : "Known subtotal"}</th><td>{formatPackWeight(total, units)}</td><td>{total > 0 ? "100%" : "—"}</td></tr></tfoot>
      </table>
    </div>
    {total === 0 && <p className="planner-help">Add your gear weights and planned supplies to build this chart.</p>}
    {!report.complete && <p className="planner-help">Incomplete weight: {report.unknown.length > 0 ? `${report.unknown.length} selected ${report.unknown.length === 1 ? "item needs" : "items need"} a weight. ` : ""}{report.missingSupplies.length > 0 ? `Enter ${report.missingSupplies.join(", ")}. ` : ""}{gear.length === 0 ? "No equipment is selected. " : ""}Chart shares use known carried weight only.</p>}
    <p className="planner-help">Supplies use your planned amounts. Water is calculated at approximately 1 kg per liter; containers belong in base gear. Weigh the loaded pack to confirm the total.</p>
  </section>;
}
