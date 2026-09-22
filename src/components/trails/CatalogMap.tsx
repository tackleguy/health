"use client";
import { useState } from "react";
import type { CatalogTrail } from "@/lib/trail-catalog/types";
import { CatalogMapView } from "./CatalogMapView";

export function CatalogMap({ trails }: { trails:CatalogTrail[] }) {
  const [open,setOpen] = useState(false);
  return <div className="catalog-map-toggle">
    <button type="button" className="catalog-link" aria-expanded={open} aria-controls="catalog-result-map" onClick={()=>setOpen(!open)}>{open ? "Hide map" : "Map these results"}</button>
    {open && <div id="catalog-result-map"><p className="catalog-muted">Showing this page’s trail sections. Pins are points on trails, not verified trailheads.</p><CatalogMapView trails={trails} /></div>}
  </div>;
}
