"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { displayMiles,sourceName,type CatalogTrail } from "@/lib/trail-catalog/types";

export function CatalogSuggestions({ region }: { region:string }) {
  const q = region.trim();
  const [result,setResult] = useState<{ q:string; trails:CatalogTrail[]; total:number; error:boolean } | null>(null);
  useEffect(()=>{
    if (!q) return;
    const controller = new AbortController();
    const timeout = setTimeout(()=>{
      fetch(`/api/trail-catalog?limit=5&q=${encodeURIComponent(q)}`,{ signal:controller.signal })
        .then(async response=>{ if (!response.ok) throw new Error("Catalog unavailable"); return response.json(); })
        .then(data=>setResult({ q,trails:data.trails,total:data.total,error:false }))
        .catch(()=>{ if (!controller.signal.aborted) setResult({ q,trails:[],total:0,error:true }); });
    },300);
    return ()=>{ clearTimeout(timeout);controller.abort(); };
  },[q]);
  if (!q) return null;
  const current = result?.q === q ? result : null;
  return <section className="planner-catalog" aria-label="Trail catalog suggestions"><h3>Explore more of {q}</h3><p className="planner-help">Public trail sections from USGS, Parks Canada and Ontario. Use these to research a complete route; a section’s distance is not a full-trip recommendation.</p>
    <p role="status" className="planner-help">{!current ? "Searching the trail catalog…" : current.error ? "The catalog could not be loaded. Open the catalog to try again." : `${current.total.toLocaleString()} mapped sections found.`}</p>
    {current && <ul className="planner-sources">{current.trails.map(t=><li key={t.id}><Link href={`/explore/trails/${t.id}`} prefetch={false}>{t.name}</Link><p>{t.region ?? (t.country === "CA" ? "Canada" : "United States")} · {displayMiles(t.miles)} section · {sourceName(t.source)}{t.distanceBasis === "geometry" ? " · Map estimate" : ""}</p></li>)}</ul>}
    <Link className="planner-link" href={`/explore/trails?q=${encodeURIComponent(q)}`}>Browse trail sections in this region →</Link>
  </section>;
}
