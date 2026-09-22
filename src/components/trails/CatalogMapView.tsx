"use client";
import { useEffect,useRef,useState } from "react";
import * as maplibregl from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CatalogTrail } from "@/lib/trail-catalog/types";

const NO_TRAILS: CatalogTrail[] = [];
const NO_LINES: [number,number][][] = [];
// Interactive viewport requests only: honor the browser HTTP cache and show attribution.
// No offline tile downloads or prefetch. Deployments can supply a different licensed provider.
const tileUrl = process.env.NEXT_PUBLIC_CATALOG_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileAttribution = process.env.NEXT_PUBLIC_CATALOG_TILE_ATTRIBUTION ?? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

export function CatalogMapView({ trails = NO_TRAILS,lines = NO_LINES }: { trails?:CatalogTrail[]; lines?:[number,number][][] }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed,setFailed] = useState(false);
  useEffect(()=>{
    if (!container.current) return;
    const points = lines.flat();
    const center: [number,number] = points[0] ?? (trails.length ? [trails[0].longitude,trails[0].latitude] : [-98,45]);
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container:container.current,center,zoom:points.length ? 12 : 4,attributionControl:false,style:{ version:8,sources:{ basemap:{ type:"raster",tiles:[tileUrl],tileSize:256,maxzoom:19,attribution:tileAttribution } },layers:[{ id:"basemap",type:"raster",source:"basemap" }] } });
    } catch {
      // WebGL can be unavailable; preserve source links and details outside the map.
      queueMicrotask(()=>setFailed(true)); return;
    }
    map.addControl(new maplibregl.NavigationControl(),"top-right");
    map.addControl(new maplibregl.AttributionControl({compact:false}),"bottom-right");
    map.on("error",()=>setFailed(true));
    const bounds = new maplibregl.LngLatBounds();
    points.forEach(p=>bounds.extend(p));
    const markers = trails.map(t=>{
      bounds.extend([t.longitude,t.latitude]);
      const link = document.createElement("a");
      link.href = `/explore/trails/${t.id}`;
      link.className = "catalog-map-marker";
      link.title = t.name;
      link.setAttribute("aria-label",`View ${t.name}`);
      const dot = document.createElement("span"); dot.setAttribute("aria-hidden","true");dot.className = "catalog-map-dot";
      const label = document.createElement("span"); label.textContent = t.name; // Source names never enter HTML.
      link.append(dot,label);
      return new maplibregl.Marker({element:link,anchor:"bottom"}).setLngLat([t.longitude,t.latitude]).addTo(map);
    });
    if (!bounds.isEmpty()) map.fitBounds(bounds,{padding:48,maxZoom:14,duration:0});
    map.on("load",()=>{
      if (!lines.length) return;
      map.addSource("catalog-section",{type:"geojson",data:{type:"FeatureCollection",features:lines.map(coordinates=>({type:"Feature",properties:{},geometry:{type:"LineString",coordinates}}))}});
      map.addLayer({id:"catalog-section-casing",type:"line",source:"catalog-section",paint:{"line-color":"#ffffff","line-width":7},layout:{"line-join":"round","line-cap":"round"}});
      map.addLayer({id:"catalog-section-line",type:"line",source:"catalog-section",paint:{"line-color":"#235834","line-width":4},layout:{"line-join":"round","line-cap":"round"}});
    });
    const observer = new ResizeObserver(()=>map.resize());observer.observe(container.current);
    return ()=>{ observer.disconnect();markers.forEach(m=>m.remove());map.remove(); };
  },[trails,lines]);
  return <div><div ref={container} className="catalog-map-canvas" role="region" aria-label="Trail section map" />{failed && <p role="status" className="catalog-muted">Some map content could not load. Check your connection or use the original source link for this trail.</p>}</div>;
}
