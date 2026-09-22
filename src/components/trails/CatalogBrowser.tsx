import Link from "next/link";
import { searchCatalog, searchCatalogMap } from "@/lib/trail-catalog/server";
import { parseCatalogFilters } from "@/lib/trail-catalog/search";
import { countryName, displayMiles, sourceName } from "@/lib/trail-catalog/types";
import { CatalogMap } from "./CatalogMap";
import { NavIcon } from "@/components/nav/NavIcon";
import "./catalog.css";

export async function CatalogBrowser({ params }: { params: URLSearchParams }) {
  const filters = parseCatalogFilters(params);
  const preview = filters.limit === undefined && (!filters.page || filters.page === 1);
  const [result, mapData] = await Promise.all([
    searchCatalog({ ...filters, limit: preview ? 4 : filters.limit }).catch(() => null),
    searchCatalogMap(filters).catch(() => null),
  ]);
  if (!result) return <div className="catalog-shell"><h1>Trail catalog unavailable</h1><p>Please reload to try again.</p><Link className="catalog-link" href="/explore/trails">Reload catalog</Link></div>;
  const { trails, total, page, pages, limit, manifest } = result;
  const filterSummary = [
    filters.bbox && "Map area",
    filters.country && countryName(filters.country),
    filters.region,
    filters.minMiles !== undefined && `${filters.minMiles}+ mi`,
    filters.maxMiles !== undefined && `Up to ${filters.maxMiles} mi`,
  ].filter(Boolean).join(" · ");
  const hasFilters = Boolean(filters.q || filterSummary);
  const allParams = new URLSearchParams(params); allParams.set("limit", "24"); allParams.delete("page");
  function pageHref(n: number) { const next = new URLSearchParams(params); next.set("page", String(n)); return `/explore/trails?${next}`; }
  return <div className="catalog-shell">
    <header className="catalog-heading"><h1>Find your next trail.</h1><p>{manifest.total.toLocaleString("en-US")} trail sections across the United States and Canada.</p><Link className="catalog-mobile-plan" href="/plan">Have a trip in mind? Plan it</Link></header>
    <form className="catalog-filters" action="/explore/trails">
      {!preview && <input type="hidden" name="limit" value={limit} />}
      {filters.bbox && <input type="hidden" name="bbox" value={filters.bbox.join(",")} />}
      <div className="catalog-search-bar">
        <label className="catalog-query"><span className="sr-only">Search trails</span><NavIcon name="explore" /><input type="search" name="q" maxLength={180} defaultValue={params.get("q") ?? ""} placeholder="Search trails or places" /></label>
        <button className="catalog-button" type="submit">Search</button>
      </div>
      <details className="catalog-filter-disclosure">
        <summary><span className="catalog-filter-label"><NavIcon name="filters" />Filters<NavIcon name="chevron" /></span>{filterSummary && <span className="catalog-active-filters">{filterSummary}</span>}</summary>
        <div className="catalog-filter-panel">
          <div className="catalog-filter-fields">
            <label>Country<select name="country" defaultValue={params.get("country") ?? ""}><option value="">USA & Canada</option><option value="CA">Canada</option><option value="US">United States</option></select></label>
            <label>State or province<select name="region" defaultValue={params.get("region") ?? ""}><option value="">All regions</option>{manifest.regions.map(r => <option key={`${r.country}-${r.name}`} value={r.name}>{r.name} · {r.country}</option>)}</select></label>
            <label>Minimum miles<input name="minMiles" type="number" min="0" max="10000" step="any" defaultValue={params.get("minMiles") ?? ""} placeholder="Any" /></label>
            <label>Maximum miles<input name="maxMiles" type="number" min="0" max="10000" step="any" defaultValue={params.get("maxMiles") ?? ""} placeholder="Any" /></label>
          </div>
          <div className="catalog-filter-footer"><p className="catalog-muted">Distances describe trail sections. A complete hike may combine several sections.</p><button className="catalog-button" type="submit">Apply filters</button></div>
        </div>
      </details>
    </form>
    <CatalogMap trails={trails} mapData={mapData} query={params.toString()} summary={total ? `${total.toLocaleString("en-US")} trail ${total === 1 ? "section" : "sections"}${params.get("region") ? ` in ${params.get("region")}` : ""}` : "No matching trail sections"} tools={<>{hasFilters && <Link className="catalog-link" href="/explore/trails">Clear filters</Link>}<Link className="catalog-link" href="/explore/trails?collection=community">Community & GPX</Link></>}>
      <section className="catalog-results" aria-label="Trail search results">
        {trails.length > 0 ? <><ul className="catalog-list">{trails.map(t => <li key={t.id}><Link href={`/explore/trails/${t.id}`} prefetch={false} className="catalog-row"><div className="catalog-row-name"><h2>{t.name}</h2><p>{t.region ?? countryName(t.country)} · {sourceName(t.source)}{t.difficulty ? ` · ${t.difficulty}` : ""}</p></div><span className="catalog-distance">{displayMiles(t.miles)}<small>{t.distanceBasis === "geometry" ? "estimated section" : "section"}</small></span><NavIcon name="chevron" /></Link></li>)}</ul>
          {preview ? <div className="catalog-preview-footer"><span>Showing a preview of {total.toLocaleString("en-US")} {total === 1 ? "match" : "matches"}</span>{total > trails.length && <Link className="catalog-button secondary" href={`/explore/trails?${allParams}`}>More trails</Link>}</div> : <nav className="catalog-pagination" aria-label="Catalog pages">{page > 1 ? <Link className="catalog-button secondary" href={pageHref(page - 1)}>Previous</Link> : <span />}<span>{((page - 1) * limit + 1).toLocaleString("en-US")}–{Math.min(page * limit, total).toLocaleString("en-US")} · Page {page.toLocaleString("en-US")}/{pages.toLocaleString("en-US")}</span>{page < pages ? <Link className="catalog-button secondary" href={pageHref(page + 1)}>Next</Link> : <span />}</nav>}</> : <div className="catalog-empty"><h2>Try a broader search.</h2><p>Search a trail name, state or province, or clear the country and distance filters. This catalog is a selection of public source records, not every trail in either country.</p><Link href="/explore/trails" className="catalog-button secondary">Show all trail sections</Link></div>}
      </section>
      <aside className="catalog-planning" aria-labelledby="catalog-planning-title"><h2 id="catalog-planning-title">A trip, in your words.</h2><p>Start with a place, distance and time. Build a route and pack around your own gear.</p><div className="catalog-example"><strong>30 miles, 3 days in Colorado</strong><span>Example request</span></div><Link className="catalog-button" href="/plan?prompt=30%20miles%2C%203%20days%20in%20Colorado">Plan this trip</Link><hr /><h3>Made for your next outing</h3><p>Your gear and past trips help shape the plan. Review the sources before you go.</p><Link className="catalog-link" href="/plan">Start with your own idea</Link></aside>
    </CatalogMap>
    <section className="catalog-source-summary"><h2>Trail sections, with their sources.</h2><p>Several sections can belong to one hike. Distances describe sections; complete routes, access and conditions need a separate check.</p>
      <details className="catalog-sources"><summary>USGS · Parks Canada · Ontario Trail Network — View sources & coverage</summary><p>{(manifest.countries.CA ?? 0).toLocaleString("en-US")} Canadian and {(manifest.countries.US ?? 0).toLocaleString("en-US")} U.S. records. Snapshot created {manifest.generatedAt.slice(0, 10)}.</p><p>These are distinct trail-section records, not {manifest.total.toLocaleString("en-US")} independent full hikes.</p><ul>{manifest.sources.map(s => <li key={s.name}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> — {s.license}. {s.count.toLocaleString("en-US")} sections.</li>)}</ul><p>Canadian coverage comes from Parks Canada locations and the Ontario Trail Network. U.S. coverage is a selection of USGS records marked for hiking. State and province labels use approximate <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth</a> boundaries. Trail information can predate this snapshot.</p><p>Contains information licensed under the <a href="https://open.canada.ca/en/open-government-licence-canada" target="_blank" rel="noopener noreferrer">Open Government Licence – Canada</a> and the <a href="https://www.ontario.ca/page/open-government-licence-ontario" target="_blank" rel="noopener noreferrer">Open Government Licence – Ontario</a>.</p><a href="/api/trail-catalog/download" download>Download the catalog index (compressed JSON)</a></details>
    </section>
  </div>;
}
