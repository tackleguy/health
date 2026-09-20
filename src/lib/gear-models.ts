/** Curated public GLB presets for connecting gear items to 3D models. */
export const GEAR_MODEL_PRESETS: {
  id: string;
  label: string;
  url: string;
  categoryHint?: string;
}[] = [
  {
    id: "glass-transmission",
    label: "Glass (transmission)",
    url: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/TransmissionTest/glTF-Binary/TransmissionTest.glb",
  },
  {
    id: "glass-attenuation",
    label: "Glass (colored)",
    url: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/AttenuationTest/glTF-Binary/AttenuationTest.glb",
  },
  {
    id: "waterbottle",
    label: "Water bottle",
    url: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/WaterBottle/glTF-Binary/WaterBottle.glb",
    categoryHint: "Cooking",
  },
  {
    id: "lantern",
    label: "Lantern",
    url: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Lantern/glTF-Binary/Lantern.glb",
    categoryHint: "Electronics",
  },
  {
    id: "helmet",
    label: "Helmet",
    url: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
    categoryHint: "Misc",
  },
];

export function resolveGearModelUrl(
  modelUrl: string | null | undefined,
): string | null {
  if (!modelUrl?.trim()) return null;
  const trimmed = modelUrl.trim();
  const preset = GEAR_MODEL_PRESETS.find(
    (p) => p.id === trimmed || p.url === trimmed,
  );
  return preset?.url ?? trimmed;
}
