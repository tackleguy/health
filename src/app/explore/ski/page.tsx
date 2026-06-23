import { Suspense } from "react";
import { SkiMapClient } from "@/components/ski/SkiMapClient";

export default function ExploreSkiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center text-stone-500">
          Loading ski map…
        </div>
      }
    >
      <SkiMapClient />
    </Suspense>
  );
}
