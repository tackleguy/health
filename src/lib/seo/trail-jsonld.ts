import type { Trail } from "@/lib/types";

export function buildTrailJsonLd(trail: Trail) {
  const url = `https://outdooros.example/explore/trails/${trail.id}`;

  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: trail.trail_name,
    description: trail.description,
    url,
    geo: {
      "@type": "GeoCoordinates",
      latitude: trail.latitude,
      longitude: trail.longitude,
    },
    ...(trail.park && {
      containedInPlace: {
        "@type": "TouristAttraction",
        name: trail.park.park_name,
        address: {
          "@type": "PostalAddress",
          addressRegion: trail.park.state,
          addressCountry: trail.park.country,
        },
      },
    }),
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "difficulty",
        value: trail.difficulty,
      },
      {
        "@type": "PropertyValue",
        name: "length_miles",
        value: trail.length_miles,
      },
      {
        "@type": "PropertyValue",
        name: "elevation_gain_ft",
        value: trail.elevation_ft,
      },
    ],
  };
}
