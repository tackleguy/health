import Link from "next/link";
import { searchCatalog, searchCatalogMap } from "@/lib/trail-catalog/server";
import { parseCatalogFilters } from "@/lib/trail-catalog/search";
import {
  CATALOG_ACTIVITIES,
  CATALOG_ACTIVITY_LABELS,
  type CatalogActivity,
} from "@/lib/trail-catalog/activity";
import { countryName, displayMiles, sourceName, type CatalogTrail } from "@/lib/trail-catalog/types";
import { resolveDifficulty } from "@/lib/trail-difficulty";
import { CatalogMap } from "./CatalogMap";
import { NavIcon } from "@/components/nav/NavIcon";
import "./catalog.css";

function activityHref(params: URLSearchParams, activity: CatalogActivity | "all") {
  const next = new URLSearchParams(params);
  next.delete("page");
  if (activity === "hike") next.delete("activity");
  else next.set("activity", activity);
  if (activity === "ski") next.set("includeWinter", "true");
  else next.delete("includeWinter");
  const qs = next.toString();
  return qs ? `/explore/trails?${qs}` : "/explore/trails";
}

function trailThumbStyle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  const hue = 118 + (hash % 52);
  const hue2 = (hue + 28) % 360;
  return {
    background: `linear-gradient(145deg, hsl(${hue} 28% 32%) 0%, hsl(${hue2} 22% 22%) 100%)`,
  };
}

function TrailCard({ trail: t }: { trail: CatalogTrail }) {
  const difficulty = resolveDifficulty({
    reported: t.difficulty,
    miles: t.miles,
    name: t.name,
  });
  const place = t.region ?? countryName(t.country);
  return (
    <Link href={`/explore/trails/${t.id}`} prefetch={false} className="catalog-card">
      <span className="catalog-card-thumb" style={trailThumbStyle(t.id)} aria-hidden="true">
        <span className="catalog-card-thumb-mark" />
      </span>
      <div className="catalog-card-body">
        <div className="catalog-card-top">
          <h2>
            {t.name}
            {t.kind === "route" && <span className="catalog-badge">Through-hike</span>}
          </h2>
          <span className="catalog-card-miles">{displayMiles(t.miles)}</span>
        </div>
        <p className="catalog-card-place">{place}</p>
        <div className="catalog-card-meta">
          <span className={`catalog-chip difficulty-${difficulty.difficulty}`}>
            {difficulty.difficulty}
          </span>
          <span className="catalog-chip">
            {t.kind === "route"
              ? "Route"
              : t.distanceBasis === "geometry"
                ? "Est. section"
                : "Section"}
          </span>
          {t.sectionCount != null && (
            <span className="catalog-chip muted">
              {t.sectionCount.toLocaleString("en-US")} sections
            </span>
          )}
          <span className="catalog-chip muted">{sourceName(t.source)}</span>
        </div>
      </div>
      <NavIcon name="chevron" />
    </Link>
  );
}

export async function CatalogBrowser({ params }: { params: URLSearchParams }) {
  const filters = parseCatalogFilters(params);
  const activity = filters.activity ?? "hike";
  const preview = filters.limit === undefined && (!filters.page || filters.page === 1);
  const [result, mapData] = await Promise.all([
    searchCatalog({ ...filters, limit: preview ? 24 : filters.limit }).catch(() => null),
    searchCatalogMap(filters).catch(() => null),
  ]);
  if (!result) {
    return (
      <div className="catalog-shell">
        <h1>Trail catalog unavailable</h1>
        <p>Please reload to try again.</p>
        <Link className="catalog-link" href="/explore/trails">
          Reload catalog
        </Link>
      </div>
    );
  }
  const { trails, total, page, pages, limit, manifest } = result;
  const filterSummary = [
    activity !== "hike" && activity !== "all" && CATALOG_ACTIVITY_LABELS[activity],
    filters.bbox && "Map area",
    filters.country === "intl"
      ? "International"
      : filters.country && countryName(filters.country),
    filters.kind === "route" && "Through-hikes",
    filters.kind === "segment" && "Sections only",
    filters.uniqueNames && "Unique names",
    filters.region,
    filters.minMiles !== undefined && `${filters.minMiles}+ mi`,
    filters.maxMiles !== undefined && `Up to ${filters.maxMiles} mi`,
  ]
    .filter(Boolean)
    .join(" · ");
  const hasFilters = Boolean(filters.q || filterSummary || (activity !== "hike" && activity !== "all"));
  const allParams = new URLSearchParams(params);
  allParams.set("limit", "48");
  allParams.delete("page");
  function pageHref(n: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(n));
    return `/explore/trails?${next}`;
  }
  const sectionCount = Object.entries(manifest.countries)
    .filter(([code]) => code === "US" || code === "CA")
    .reduce((sum, [, count]) => sum + count, 0);
  const intlCount = Object.entries(manifest.countries)
    .filter(([code]) => code !== "US" && code !== "CA")
    .reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="catalog-shell catalog-explore">
      <div className="catalog-explore-chrome">
        <header className="catalog-heading">
          <div className="catalog-heading-text">
            <h1>Explore</h1>
            <p>
              {manifest.total.toLocaleString("en-US")} catalog trails — browse the map, open a card,
              then plan your outing.
            </p>
          </div>
          <Link className="catalog-button" href="/plan">
            Plan a trip
          </Link>
        </header>

        <nav className="catalog-activity-tabs" aria-label="Trail type">
          {CATALOG_ACTIVITIES.map((value) => {
            const active = activity === value;
            return (
              <Link
                key={value}
                className={active ? "catalog-activity-tab active" : "catalog-activity-tab"}
                href={activityHref(params, value)}
                aria-current={active ? "page" : undefined}
              >
                {CATALOG_ACTIVITY_LABELS[value]}
              </Link>
            );
          })}
          <Link className="catalog-activity-tab catalog-activity-ski-map" href="/map?mode=ski">
            Ski maps
          </Link>
        </nav>

        <div className="catalog-chip-row" aria-label="Quick filters">
          <Link
            className={params.get("kind") === "route" ? "catalog-chip-link active" : "catalog-chip-link"}
            href="/explore/trails?kind=route&activity=backpack"
          >
            Through-hikes
          </Link>
          <Link
            className={
              params.get("country") === "intl" ? "catalog-chip-link active" : "catalog-chip-link"
            }
            href="/explore/trails?country=intl&kind=route&activity=backpack"
          >
            International
          </Link>
          <Link
            className={
              params.get("uniqueNames") === "true" ? "catalog-chip-link active" : "catalog-chip-link"
            }
            href="/explore/trails?uniqueNames=true"
          >
            Unique names
          </Link>
          <Link className="catalog-chip-link" href="/explore/ski">
            Ski resorts
          </Link>
          <Link className="catalog-chip-link" href="/explore/trails?collection=community">
            Community
          </Link>
        </div>

        <form className="catalog-filters" action="/explore/trails">
          {!preview && <input type="hidden" name="limit" value={limit} />}
          {filters.bbox && <input type="hidden" name="bbox" value={filters.bbox.join(",")} />}
          <div className="catalog-search-bar">
            <label className="catalog-query">
              <span className="sr-only">Search trails</span>
              <NavIcon name="explore" />
              <input
                type="search"
                name="q"
                maxLength={180}
                defaultValue={params.get("q") ?? ""}
                placeholder="Search by trail, park, or place"
              />
            </label>
            <button className="catalog-button" type="submit">
              Search
            </button>
          </div>
          <details className="catalog-filter-disclosure">
            <summary>
              <span className="catalog-filter-label">
                <NavIcon name="filters" />
                Filters
                <NavIcon name="chevron" />
              </span>
              {filterSummary && <span className="catalog-active-filters">{filterSummary}</span>}
            </summary>
            <div className="catalog-filter-panel">
              <div className="catalog-filter-fields">
                <label>
                  Trail type
                  <select name="activity" defaultValue={activity === "all" ? "hike" : activity}>
                    {CATALOG_ACTIVITIES.map((value) => (
                      <option key={value} value={value}>
                        {CATALOG_ACTIVITY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Country
                  <select name="country" defaultValue={params.get("country") ?? ""}>
                    <option value="">All countries</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="intl">International</option>
                    {manifest.countries.FR != null && <option value="FR">France</option>}
                    {manifest.countries.NZ != null && <option value="NZ">New Zealand</option>}
                    {manifest.countries.NP != null && <option value="NP">Nepal</option>}
                    {manifest.countries.ES != null && <option value="ES">Spain</option>}
                    {manifest.countries.IS != null && <option value="IS">Iceland</option>}
                    {manifest.countries.CL != null && <option value="CL">Chile</option>}
                  </select>
                </label>
                <label>
                  Route shape
                  <select name="kind" defaultValue={params.get("kind") ?? ""}>
                    <option value="">Routes & sections</option>
                    <option value="route">Through-hikes only</option>
                    <option value="segment">Mapped sections only</option>
                  </select>
                </label>
                <label>
                  State or province
                  <select name="region" defaultValue={params.get("region") ?? ""}>
                    <option value="">All regions</option>
                    {manifest.regions.map((r) => (
                      <option key={`${r.country}-${r.name}`} value={r.name}>
                        {r.name} · {r.country}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Minimum miles
                  <input
                    name="minMiles"
                    type="number"
                    min="0"
                    max="10000"
                    step="any"
                    defaultValue={params.get("minMiles") ?? ""}
                    placeholder="Any"
                  />
                </label>
                <label>
                  Maximum miles
                  <input
                    name="maxMiles"
                    type="number"
                    min="0"
                    max="10000"
                    step="any"
                    defaultValue={params.get("maxMiles") ?? ""}
                    placeholder="Any"
                  />
                </label>
                <label className="catalog-checkbox">
                  <input
                    type="checkbox"
                    name="uniqueNames"
                    value="true"
                    defaultChecked={params.get("uniqueNames") === "true"}
                  />
                  One card per trail name
                </label>
              </div>
              <div className="catalog-filter-footer">
                <p className="catalog-muted">
                  Distances describe sections or published route lengths — confirm access before you go.
                </p>
                <button className="catalog-button" type="submit">
                  Apply filters
                </button>
              </div>
            </div>
          </details>
        </form>
      </div>

      <CatalogMap
        trails={trails}
        mapData={mapData}
        query={params.toString()}
        summary={
          total
            ? `${total.toLocaleString("en-US")} ${
                activity === "hike" || activity === "all"
                  ? ""
                  : `${CATALOG_ACTIVITY_LABELS[activity as CatalogActivity].toLowerCase()} `
              }${total === 1 ? "trail" : "trails"}${
                params.get("region") ? ` in ${params.get("region")}` : ""
              }`
            : "No matching trails"
        }
        tools={
          <>
            {hasFilters && (
              <Link className="catalog-link" href="/explore/trails">
                Clear
              </Link>
            )}
            {activity === "ski" && (
              <Link className="catalog-link" href="/map?mode=ski">
                Ski maps
              </Link>
            )}
          </>
        }
      >
        <section className="catalog-results" aria-label="Trail search results">
          {trails.length > 0 ? (
            <>
              <ul className="catalog-list catalog-card-list">
                {trails.map((t) => (
                  <li key={t.id}>
                    <TrailCard trail={t} />
                  </li>
                ))}
              </ul>
              {preview ? (
                <div className="catalog-preview-footer">
                  <span>
                    Showing {trails.length.toLocaleString("en-US")} of {total.toLocaleString("en-US")}
                  </span>
                  {total > trails.length && (
                    <Link className="catalog-button secondary" href={`/explore/trails?${allParams}`}>
                      More trails
                    </Link>
                  )}
                </div>
              ) : (
                <nav className="catalog-pagination" aria-label="Catalog pages">
                  {page > 1 ? (
                    <Link className="catalog-button secondary" href={pageHref(page - 1)}>
                      Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span>
                    {((page - 1) * limit + 1).toLocaleString("en-US")}–
                    {Math.min(page * limit, total).toLocaleString("en-US")}
                  </span>
                  {page < pages ? (
                    <Link className="catalog-button secondary" href={pageHref(page + 1)}>
                      Next
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          ) : (
            <div className="catalog-empty">
              <h2>No trails here.</h2>
              <p>
                {activity === "bike" || activity === "run" || activity === "ski"
                  ? "Few catalog sections use that activity name yet. Try Hiking, open Ski maps, or clear filters."
                  : "Try a wider area, another name, or clear filters."}
              </p>
              <div className="catalog-quick-links">
                <Link href="/explore/trails" className="catalog-button secondary">
                  Show hiking trails
                </Link>
                {activity === "ski" && (
                  <Link href="/map?mode=ski" className="catalog-button secondary">
                    Open ski maps
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      </CatalogMap>

      <section className="catalog-source-summary">
        <h2>Sources & coverage</h2>
        <p>
          Several sections can belong to one hike. Through-hike cards summarize long corridors;
          distances and access still need a separate check with the land manager.
        </p>
        <details className="catalog-sources">
          <summary>USGS · Parks Canada · Ontario · curated guides</summary>
          <p>
            {(manifest.countries.CA ?? 0).toLocaleString("en-US")} Canadian and{" "}
            {(manifest.countries.US ?? 0).toLocaleString("en-US")} U.S. records
            {intlCount > 0
              ? `, plus ${intlCount.toLocaleString("en-US")} international through-hike guides`
              : ""}
            . Snapshot created {manifest.generatedAt.slice(0, 10)}.
          </p>
          <p>
            Mapped catalog rows are distinct trail-section records (~
            {sectionCount.toLocaleString("en-US")} after overlay accounting), not that many independent
            full hikes.
          </p>
          <ul>
            {manifest.sources.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>{" "}
                — {s.license}. {s.count.toLocaleString("en-US")} sections.
              </li>
            ))}
          </ul>
          <p>
            Canadian coverage comes from Parks Canada and the Ontario Trail Network. U.S. coverage is a
            USGS hiking selection with National Scenic Trail sections pinned. International
            through-hikes are curated guides (not GPS tracks).
          </p>
          <a href="/api/trail-catalog/download" download>
            Download the catalog index (compressed JSON)
          </a>
        </details>
      </section>
    </div>
  );
}
