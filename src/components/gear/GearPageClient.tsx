"use client";

import { useState } from "react";
import type { WeightUnit } from "@/lib/gear";
import { useGear } from "@/hooks/useGear";
import { LocalGear } from "./LocalGear";
import { GearLocker } from "./GearLocker";

export function GearPageClient({ userId }: { userId: string }) {
  const [unit, setUnit] = useState<WeightUnit>("oz");
  const { gear, loading, error, storageMissing, addGear, editGear, deleteGear } =
    useGear(userId);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (storageMissing) return <LocalGear key={userId} userId={userId} accountStorageUnavailable />;

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <GearLocker
        gear={gear}
        unit={unit}
        onUnitChange={setUnit}
        onAdd={addGear}
        onEdit={editGear}
        onDelete={deleteGear}
      />
    </div>
  );
}
