import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// MapLibre 6 ships module workers separately. Serve its matching worker and
// shared module from our own origin instead of inferring a URL from a Next chunk.
const require = createRequire(import.meta.url);
const packagePath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(await readFile(packagePath, "utf8"));
const destination = path.resolve("public/maplibre", version);
await mkdir(destination, { recursive: true });
for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(path.join(path.dirname(packagePath), "dist", name), path.join(destination, name));
}
await copyFile(path.join(path.dirname(packagePath), "LICENSE.txt"), path.join(destination, "LICENSE.txt"));
console.log(`Prepared local MapLibre ${version} worker assets.`);
