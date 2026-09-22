"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CatalogPhoto } from "@/lib/trail-catalog/photos";

function Photo({ photo }: { photo: CatalogPhoto }) {
  const [failed, setFailed] = useState(false);
  return <figure className="catalog-photo">
    <a className="catalog-photo-image" href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${photo.title} on Wikimedia Commons`}>
      {failed ? <span>Photo unavailable. View the original.</span> : <Image src={photo.url} alt={photo.title} fill sizes="(max-width: 767px) 80vw, (max-width: 1199px) 40vw, 360px" onError={() => setFailed(true)} />}
    </a>
    <figcaption><p>{photo.title}</p><span>{photo.distanceMeters < 1000 ? `${Math.round(photo.distanceMeters)} m` : `${(photo.distanceMeters / 1000).toFixed(1)} km`} from the section’s mapped point</span><p className="catalog-photo-credit">{photo.artist} · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a> · <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></p></figcaption>
  </figure>;
}

export function CatalogPhotos({ trailId, compact = false }: { trailId: string; compact?: boolean }) {
  const container = useRef<HTMLElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ status: "waiting" | "loading" | "ready" | "error"; photos: CatalogPhoto[] }>({ status: "waiting", photos: [] });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      setState({ status: "loading", photos: [] });
      try {
        const response = await fetch(`/api/trail-catalog/${encodeURIComponent(trailId)}/photos`, { cache: "no-cache", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
        if (!response.ok) throw new Error("Photos unavailable");
        const data = await response.json();
        if (active) setState({ status: "ready", photos: data.photos });
      } catch { if (active) setState({ status: "error", photos: [] }); }
    }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void load(); } }, { rootMargin: "200px" });
    if (container.current) observer.observe(container.current);
    return () => { active = false; observer.disconnect(); controller.abort(); };
  }, [trailId, attempt]);

  return <section ref={container} className={`catalog-photos${compact ? " compact" : ""}`} aria-label="Photos near this trail section">
    <h2>Photos from nearby</h2><p className="catalog-muted">Geotagged photos within 1.5 km of this section’s mapped point. They may show the surrounding area rather than the trail itself.</p>
    <p role="status">{state.status === "waiting" || state.status === "loading" ? "Loading nearby photos…" : state.status === "error" ? "Photos could not load. Your trail details are still available." : state.photos.length === 0 ? "No licensed photos were found near this section. Its source link may have more information." : `${state.photos.length} attributed photos found.`}</p>
    {state.status === "error" && <button type="button" className="catalog-button secondary" onClick={() => setAttempt(value => value + 1)}>Retry photos</button>}
    {state.photos.length > 0 && <div className="catalog-photo-grid">{state.photos.slice(0, compact ? 2 : 6).map(photo => <Photo key={photo.id} photo={photo} />)}</div>}
  </section>;
}
