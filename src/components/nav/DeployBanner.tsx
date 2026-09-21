import { isSupabaseConfigured } from "@/lib/env";
export function DeployBanner() {
  if (isSupabaseConfigured()) return null;
  return <div className="border-b border-white/10 bg-surface px-4 py-2 text-center text-xs text-sage">Local preview · Account sign-in and cloud syncing are not connected. Trip planning works on this device.</div>;
}
