/** Only missing setup permits local fallback. Auth/network failures remain errors. */
export function isGearStorageMissing(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(error && ["PGRST205", "42P01"].includes(error.code ?? "") && /\bgear_items\b/.test(error.message ?? ""));
}
