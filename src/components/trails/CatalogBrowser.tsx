import Link from "next/link";
import { searchCatalog } from "@/lib/trail-catalog/server";
import { parseCatalogFilters } from "@/lib/trail-catalog/search";
import { countryName, displayMiles, sourceName } from "@/lib/trail-catalog/types";
import { CatalogMap } from "./CatalogMap";
import "./catalog.css";

export async function CatalogBrowser({ params }: { params:URLSearchParams }) {
  const result = await searchCatalog(parseCatalogFilters(params)).catch(()=>null);
  if (!result) return <div className="catalog-shell"><h1>Trail catalog unavailable</h1><p>Please reload to try again.</p><Link className="catalog-link" href="/explore/trails">Reload catalog</Link></div>;
  const { trails,total,page,pages,limit,manifest } = result;
  function pageHref(n:number) { const next = new URLSearchParams(params); next.set("page",String(n)); return `/explore/trails?${next}`; }
  return <div className="catalog-shell">
    <div className="catalog-heading"><div><h1>Find your next trail.</h1><p>{manifest.total.toLocaleString("en-US")} mapped trail sections across Canada and the United States.</p></div><Link className="catalog-link" href="/plan">Plan a trip →</Link></div>
    <nav className="catalog-tabs" aria-label="Trail collections"><Link href="/explore/trails" aria-current="page">Trail catalog</Link><Link href="/explore/trails?collection=community">Community trails & GPX</Link></nav>
    <form className="catalog-filters" action="/explore/trails">
      <div className="catalog-filter-main">
        <label className="catalog-query">Search<input type="search" name="q" maxLength={180} defaultValue={params.get("q") ?? ""} placeholder="Trail, state or province" /></label>
        <label>Country<select name="country" defaultValue={params.get("country") ?? ""}><option value="">Canada + U.S.</option><option value="CA">Canada</option><option value="US">United States</option></select></label>
        <label>State or province<select name="region" defaultValue={params.get("region") ?? ""}><option value="">All regions</option>{manifest.regions.map(r=><option key={`${r.country}-${r.name}`} value={r.name}>{r.name} · {r.country}</option>)}</select></label>
        <button className="catalog-button">Find trails</button>
      </div>
      <details className="catalog-distance-filter" open={!!(params.get("minMiles") || params.get("maxMiles"))}><summary>Section distance</summary><div className="catalog-distance-fields"><label>Minimum miles<input name="minMiles" type="number" min="0" max="10000" step="any" defaultValue={params.get("minMiles") ?? ""} /></label><label>Maximum miles<input name="maxMiles" type="number" min="0" max="10000" step="any" defaultValue={params.get("maxMiles") ?? ""} /></label></div><p className="catalog-muted">Distance describes a mapped section. A full hike can combine several sections.</p></details>
    </form>
    <div className="catalog-results-heading"><p role="status">{total ? `${((page-1)*limit+1).toLocaleString("en-US")}–${Math.min(page*limit,total).toLocaleString("en-US")} of ${total.toLocaleString("en-US")} sections` : "No matching trail sections"}</p><Link className="catalog-link" href="/explore/trails">Clear filters</Link></div>
    {trails.length > 0 ? <><CatalogMap trails={trails} /><ul className="catalog-list">{trails.map(t=><li key={t.id}><Link href={`/explore/trails/${t.id}`} prefetch={false} className="catalog-row"><div className="catalog-row-name"><h2>{t.name}</h2><p>{sourceName(t.source)} · Trail section{t.difficulty ? ` · ${t.difficulty}` : ""}</p></div><span className="catalog-location">{t.region ?? "Region not available"}<small>{countryName(t.country)}</small></span><span className="catalog-distance">{displayMiles(t.miles)}<small>{t.distanceBasis === "geometry" ? "Map estimate" : "Source distance"}</small></span><span className="catalog-arrow" aria-hidden="true">→</span></Link></li>)}</ul>
      <nav className="catalog-pagination" aria-label="Catalog pages">{page>1 ? <Link className="catalog-button secondary" href={pageHref(page-1)}>Previous</Link> : <span />}<span>Page {page.toLocaleString("en-US")} of {pages.toLocaleString("en-US")}</span>{page<pages ? <Link className="catalog-button secondary" href={pageHref(page+1)}>Next</Link> : <span />}</nav></> : <div className="catalog-empty"><h2>Try a broader search.</h2><p>Search a trail name, state or province, or clear the country and distance filters. This catalog is a selection of public source records, not every trail in either country.</p></div>}
    <details className="catalog-sources"><summary>Sources & coverage</summary><p>{(manifest.countries.CA ?? 0).toLocaleString("en-US")} Canadian and {(manifest.countries.US ?? 0).toLocaleString("en-US")} U.S. records. Snapshot created {manifest.generatedAt.slice(0,10)}.</p><p>These are distinct trail-section records. Several records can belong to one trail; they are not {manifest.total.toLocaleString("en-US")} independent full hikes.</p><ul>{manifest.sources.map(s=><li key={s.name}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> — {s.license}. {s.count.toLocaleString("en-US")} sections.</li>)}</ul><p>Canadian coverage comes from Parks Canada locations and the Ontario Trail Network. U.S. coverage is a selection of USGS records marked for hiking. State and province labels use approximate <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth</a> boundaries. Trail information can predate this snapshot.</p><p>Contains information licensed under the <a href="https://open.canada.ca/en/open-government-licence-canada" target="_blank" rel="noopener noreferrer">Open Government Licence – Canada</a> and the <a href="https://www.ontario.ca/page/open-government-licence-ontario" target="_blank" rel="noopener noreferrer">Open Government Licence – Ontario</a>.</p><a href="/api/trail-catalog/download">Download the catalog index (compressed JSON)</a></details>
  </div>;
}
