import Link from "next/link";
import { CatalogPhotos } from "./CatalogPhotos";
import { CatalogMapView } from "./CatalogMapView";
import type { CatalogManifest, CatalogTrail } from "@/lib/trail-catalog/types";
import { countryName, displayMiles, sourceName } from "@/lib/trail-catalog/types";
import { resolveDifficulty } from "@/lib/trail-difficulty";
import "./catalog.css";

export function CatalogTrailDetail({
  trail: t,
  lines,
  manifest,
}: {
  trail: CatalogTrail;
  lines: [number, number][][];
  manifest: CatalogManifest;
}) {
  const isRoute = t.kind === "route";
  const browse = new URLSearchParams({
    ...(t.country === "US" || t.country === "CA" ? { country: t.country } : { country: "intl" }),
    ...(isRoute ? { kind: "route" } : {}),
    ...(t.region && (t.country === "US" || t.country === "CA") ? { region: t.region } : {}),
  });
  const difficulty = resolveDifficulty({
    reported: t.difficulty,
    miles: t.miles,
    name: t.name,
  });

  return (
    <article className="catalog-shell catalog-detail">
      <Link className="catalog-link" href={`/explore/trails?${browse}`}>
        ← Browse {isRoute ? "through-hikes" : (t.region ?? countryName(t.country))}
      </Link>
      <header>
        <h1>
          {t.name}
          {isRoute && <span className="catalog-badge">Through-hike</span>}
        </h1>
        <p>
          {[t.region, countryName(t.country)].filter(Boolean).join(", ")} · {sourceName(t.source)}
        </p>
      </header>
      <p className="catalog-section-note">
        {isRoute
          ? t.note ??
            "This is a through-hike / long-route guide. Confirm distance, permits, and current conditions with the official trail association or land manager."
          : "This record is a mapped trail section. It may be part of a longer route; check access, trailheads and the complete route before planning your hike."}
      </p>
      <dl className="catalog-facts">
        <div>
          <dt>{isRoute ? "Route distance" : "Section distance"}</dt>
          <dd>
            {displayMiles(t.miles)}
            <small>
              {isRoute
                ? t.source === "route-aggregate"
                  ? "Official corridor length"
                  : "Curated guide length"
                : t.distanceBasis === "geometry"
                  ? "Estimated from map geometry"
                  : "Reported by the source"}
            </small>
          </dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd className="capitalize">
            {difficulty.difficulty}
            <small>{difficulty.label}</small>
          </dd>
        </div>
        {isRoute && t.sectionCount != null ? (
          <div>
            <dt>Mapped sections</dt>
            <dd>
              {t.sectionCount.toLocaleString("en-US")}
              <small>
                {t.mappedMiles != null
                  ? `~${t.mappedMiles.toLocaleString("en-US")} mi in catalog selection`
                  : "In this catalog snapshot"}
              </small>
            </dd>
          </div>
        ) : (
          <div>
            <dt>Elevation gain</dt>
            <dd>Not reported</dd>
          </div>
        )}
        <div>
          <dt>{isRoute ? "Season" : "Dogs"}</dt>
          <dd>
            {isRoute
              ? (t.season ?? "Not reported")
              : t.dogs === true
                ? "Source reports allowed"
                : t.dogs === false
                  ? "Source reports not allowed"
                  : "Not reported"}
          </dd>
        </div>
      </dl>
      {t.tags && t.tags.length > 0 && (
        <ul className="catalog-tag-list">
          {t.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}
      <div className="catalog-detail-map-heading">
        <h2>{isRoute ? "Approximate location" : "Section map"}</h2>
        {!isRoute && (
          <a
            className="catalog-button secondary"
            href={`/api/trail-catalog/${encodeURIComponent(t.id)}/gpx`}
            download
          >
            Download section GPX
          </a>
        )}
      </div>
      {isRoute ? (
        <CatalogMapView trails={[t]} />
      ) : (
        <CatalogMapView lines={lines} />
      )}
      <p className="catalog-muted">
        {isRoute
          ? "Pin marks an approximate trailhead or corridor midpoint — not a verified start. This is not a GPS track."
          : "Generalized source geometry for discovery. This map does not verify navigation, current access or a trailhead."}
      </p>
      {!isRoute && <CatalogPhotos trailId={t.id} />}
      <div className="catalog-detail-grid">
        <section>
          <h2>Plan around the whole route.</h2>
          <p>
            Confirm the full hike and its distance with the land manager, then build your gear list
            and packing plan in HikeSync.
          </p>
          <Link
            className="catalog-button"
            href={`/plan?region=${encodeURIComponent(t.region ?? countryName(t.country))}&prompt=${encodeURIComponent(t.name)}`}
          >
            Prepare a trip for {t.name}
          </Link>
          <p className="catalog-muted">
            Camping permission, water availability and current closures are not confirmed by this
            record.
          </p>
        </section>
        <section>
          <h2>Source details</h2>
          <dl className="catalog-source-details">
            <div>
              <dt>Originator</dt>
              <dd>{t.manager ?? sourceName(t.source)}</dd>
            </div>
            <div>
              <dt>Surface</dt>
              <dd>{t.surface ?? "Not reported"}</dd>
            </div>
            <div>
              <dt>Season</dt>
              <dd>{t.season ?? "Not reported"}</dd>
            </div>
            <div>
              <dt>Source edit date</dt>
              <dd>{t.sourceDate?.slice(0, 10) ?? "Not reported"}</dd>
            </div>
            <div>
              <dt>Catalog snapshot</dt>
              <dd>{manifest.generatedAt.slice(0, 10)}</dd>
            </div>
          </dl>
          <p>
            <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer">
              {isRoute ? "Official trail information" : "View original source record"}
            </a>
            {t.officialUrl && t.officialUrl !== t.sourceUrl && (
              <>
                {" "}
                ·{" "}
                <a href={t.officialUrl} target="_blank" rel="noopener noreferrer">
                  Land manager’s website
                </a>
              </>
            )}
          </p>
          <p className="catalog-muted">
            {isRoute
              ? `Guide ID: ${t.sourceId}.`
              : `State or province is estimated from a point on the trail; sections may cross boundaries. Source ID: ${t.sourceId}.`}
          </p>
          {t.country === "CA" && !isRoute && (
            <p className="catalog-muted">
              Contains information licensed under the{" "}
              <a
                href={
                  t.source === "ontario"
                    ? "https://www.ontario.ca/page/open-government-licence-ontario"
                    : "https://open.canada.ca/en/open-government-licence-canada"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Government Licence – {t.source === "ontario" ? "Ontario" : "Canada"}
              </a>
              .
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
