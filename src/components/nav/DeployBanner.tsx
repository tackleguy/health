import { isSupabaseConfigured } from "@/lib/env";
export function DeployBanner() {
  if (isSupabaseConfigured()) return null;
  return <footer className="local-preview-note">Local preview · Plans saved on this device. Account sign-in and cloud sync are not connected.</footer>;
}
