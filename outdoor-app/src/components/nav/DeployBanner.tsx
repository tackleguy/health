import { isSupabaseConfigured, missingEnvMessage } from "@/lib/env";

export function DeployBanner() {
  if (isSupabaseConfigured()) return null;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
      <strong>Deployment config missing.</strong> {missingEnvMessage}
    </div>
  );
}
