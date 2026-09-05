import { readFileSync } from "fs";
import { join } from "path";
import type { IngestionConfig } from "./types";

function loadConfigFile(): IngestionConfig | null {
  try {
    const path = join(process.cwd(), "config", "ingestion", "default.json");
    return JSON.parse(readFileSync(path, "utf8")) as IngestionConfig;
  } catch {
    return null;
  }
}

const DEFAULT_CONFIG: IngestionConfig = loadConfigFile() ?? {
  sources: [
    {
      adapter: "overpass",
      sourceName: "OpenStreetMap (Overpass API)",
      sourceUrl: "https://www.openstreetmap.org",
      license: "ODbL 1.0",
      licenseUrl: "https://opendatacommons.org/licenses/odbl/",
      attribution: "© OpenStreetMap contributors",
      enabled: true,
      options: {
        bbox: { south: 37.7, west: -119.65, north: 37.9, east: -119.35 },
      },
    },
    {
      adapter: "nps",
      sourceName: "National Park Service",
      sourceUrl: "https://www.nps.gov/subjects/digital/nps-gis-data.htm",
      license: "Public Domain",
      licenseUrl: "https://www.nps.gov/aboutus/foia/publicdomain.htm",
      attribution: "National Park Service",
      enabled: false,
    },
    {
      adapter: "usfs",
      sourceName: "US Forest Service",
      sourceUrl: "https://data.fs.usda.gov/geodata/",
      license: "Public Domain",
      attribution: "USDA Forest Service",
      enabled: false,
    },
    {
      adapter: "blm",
      sourceName: "Bureau of Land Management",
      sourceUrl: "https://gblm-nls.appspot.com/",
      license: "Public Domain",
      attribution: "Bureau of Land Management",
      enabled: false,
    },
    {
      adapter: "state-parks",
      sourceName: "State Parks GIS",
      license: "Varies by state",
      attribution: "State park agency — verify per dataset",
      enabled: false,
    },
    {
      adapter: "wikimedia",
      sourceName: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org",
      license: "CC BY-SA / Public Domain (per file)",
      licenseUrl: "https://commons.wikimedia.org/wiki/Commons:Licensing",
      attribution: "Wikimedia Commons contributors",
      enabled: false,
      options: { maxDistanceMeters: 500 },
    },
  ],
  deduplication: {
    nameSimilarityThreshold: 0.75,
    overlapThresholdMeters: 150,
    distanceDeltaMiles: 0.5,
  },
  photoMatching: {
    maxDistanceMeters: 500,
  },
};

export function loadIngestionConfig(overrides?: Partial<IngestionConfig>): IngestionConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    sources: overrides?.sources ?? DEFAULT_CONFIG.sources,
    deduplication: {
      ...DEFAULT_CONFIG.deduplication,
      ...overrides?.deduplication,
    },
    photoMatching: {
      ...DEFAULT_CONFIG.photoMatching,
      ...overrides?.photoMatching,
    },
  };
}

export function getSourceConfig(
  config: IngestionConfig,
  adapterName: string,
) {
  return config.sources.find((s) => s.adapter === adapterName);
}
