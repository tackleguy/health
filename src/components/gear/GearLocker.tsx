"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_COLORS,
  CATEGORY_ORDER,
  calcStats,
  convertWeight,
  type GearItem,
  type WeightUnit,
} from "@/lib/gear";
import { GearModal } from "./GearModal";
import { StatCard } from "./StatCard";

interface Props {
  gear: GearItem[];
  unit: WeightUnit;
  onUnitChange: (u: WeightUnit) => void;
  onAdd: (item: Omit<GearItem, "id">) => void;
  onEdit: (id: string, item: Omit<GearItem, "id">) => void;
  onDelete: (id: string) => void;
}

export function GearLocker({
  gear,
  unit,
  onUnitChange,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"category" | "weight" | "name">(
    "category",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<GearItem | null>(null);

  const stats = useMemo(() => calcStats(gear), [gear]);

  const filtered = useMemo(() => {
    let items = gear.filter(
      (g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.category.toLowerCase().includes(search.toLowerCase()),
    );
    if (sortField === "weight")
      items = [...items].sort(
        (a, b) => b.weight * b.qty - a.weight * a.qty,
      );
    else if (sortField === "name")
      items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [gear, search, sortField]);

  const grouped = useMemo(() => {
    const groups: Record<string, GearItem[]> = {};
    for (const g of filtered) {
      if (!groups[g.category]) groups[g.category] = [];
      groups[g.category].push(g);
    }
    return groups;
  }, [filtered]);

  const handleSave = (item: Omit<GearItem, "id">) => {
    if (editItem) {
      onEdit(editItem.id, item);
      setEditItem(null);
    } else onAdd(item);
  };

  const units: WeightUnit[] = ["oz", "g", "lb"];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
            Gear Locker
          </h2>
          <p className="mt-1 text-sm text-sage">Your complete gear inventory</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-[var(--border)] bg-surface">
            {units.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onUnitChange(u)}
                className={`px-2.5 py-1.5 font-mono text-[0.7rem] transition ${
                  unit === u
                    ? "bg-accent/20 text-accent"
                    : "text-sage hover:text-cream"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setEditItem(null);
              setModalOpen(true);
            }}
            className="btn-primary text-sm"
          >
            + Add Gear
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          value={convertWeight(stats.baseWeight, unit)}
          label="Base Weight"
          sub={unit}
          colorClass="text-accent"
        />
        <StatCard
          value={String(stats.totalItems)}
          label="Total Items"
          sub="in locker"
          colorClass="text-pine-light"
        />
        <StatCard
          value={convertWeight(stats.totalWeight, unit)}
          label="Total Pack"
          sub={`${unit} (skin-out)`}
          colorClass="text-accent"
        />
        <StatCard
          value={`$${stats.totalCost.toLocaleString()}`}
          label="Total Value"
          sub="gear investment"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-surface py-2.5 pl-4 pr-4 text-sm text-cream outline-none placeholder:text-mist/50 focus:border-accent/50"
            placeholder="Search gear..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setSortField("weight")}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            sortField === "weight"
              ? "border-accent/30 bg-accent/15 text-cream"
              : "border-[var(--border)] bg-surface text-sage hover:text-cream"
          }`}
        >
          Sort: Weight
        </button>
        <button
          type="button"
          onClick={() => setSortField("name")}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            sortField === "name"
              ? "border-accent/30 bg-accent/15 text-cream"
              : "border-[var(--border)] bg-surface text-sage hover:text-cream"
          }`}
        >
          Sort: Name
        </button>
      </div>

      <div className="surface-card overflow-x-auto p-2">
        <table
          className="w-full"
          style={{ borderCollapse: "separate", borderSpacing: "0 4px" }}
        >
          <thead>
            <tr>
              {["Item", "Category", "Type", "Qty", "Weight", "Price", ""].map(
                (h, i) => (
                  <th
                    key={h || i}
                    className={`border-b border-[var(--border)] px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-sage ${
                      i >= 3 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {CATEGORY_ORDER.map((cat) => {
              if (!grouped[cat]) return null;
              const catWeight = grouped[cat].reduce(
                (s, g) => s + g.weight * g.qty,
                0,
              );
              return [
                <tr key={`header-${cat}`}>
                  <td colSpan={7} className="px-4 pb-1 pt-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: CATEGORY_COLORS[cat] }}
                      />
                      <h4 className="font-display text-[0.95rem] font-bold text-cream">
                        {cat}
                      </h4>
                      <span className="ml-auto font-mono text-[0.7rem] text-sage">
                        {convertWeight(catWeight, unit)} {unit}
                      </span>
                    </div>
                  </td>
                </tr>,
                ...grouped[cat].map((g) => (
                  <tr key={g.id} className="group">
                    <td className="rounded-l-lg border-y border-l border-transparent bg-surface-muted/40 px-4 py-2.5 text-sm transition group-hover:border-[var(--border)] group-hover:bg-surface-muted/70">
                      <strong className="text-cream">{g.name}</strong>
                    </td>
                    <td className="border-y border-transparent bg-surface-muted/40 px-4 py-2.5 transition group-hover:border-[var(--border)] group-hover:bg-surface-muted/70">
                      <span
                        className="inline-block rounded-md px-2 py-0.5 text-[0.7rem] font-semibold text-cream opacity-90"
                        style={{ background: CATEGORY_COLORS[g.category] }}
                      >
                        {g.category}
                      </span>
                    </td>
                    <td className="border-y border-transparent bg-surface-muted/40 px-4 py-2.5 transition group-hover:border-[var(--border)] group-hover:bg-surface-muted/70">
                      {g.type === "Worn" && (
                        <span className="inline-block rounded border border-accent/30 bg-accent/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-accent">
                          Worn
                        </span>
                      )}
                      {g.type === "Consumable" && (
                        <span className="inline-block rounded border border-pine-light/40 bg-pine/30 px-1.5 py-0.5 text-[0.65rem] font-semibold text-sage">
                          Consumable
                        </span>
                      )}
                      {g.type === "Base" && (
                        <span className="text-xs text-sage">Base</span>
                      )}
                    </td>
                    <td className="border-y border-transparent bg-surface-muted/40 px-4 py-2.5 text-center font-mono text-sm transition group-hover:border-[var(--border)] group-hover:bg-surface-muted/70">
                      {g.qty}
                    </td>
                    <td className="border-y border-transparent bg-surface-muted/40 px-4 py-2.5 text-right font-mono text-sm transition group-hover:border-[var(--border)] group-hover:bg-surface-muted/70">
                      {convertWeight(g.weight * g.qty, unit)} {unit}
                    </td>
                    <td className="border-y border-transparent bg-surface-muted/40 px-4 py-2.5 text-right font-mono text-sm text-sage transition group-hover:border-[var(--border)] group-hover:bg-surface-muted/70">
                      ${(g.price * g.qty).toFixed(0)}
                    </td>
                    <td className="rounded-r-lg border-y border-r border-transparent bg-surface-muted/40 px-4 py-2.5 text-right transition group-hover:border-[var(--border)] group-hover:bg-surface-muted/70">
                      <button
                        type="button"
                        onClick={() => {
                          setEditItem(g);
                          setModalOpen(true);
                        }}
                        className="px-1 text-mist transition hover:text-cream"
                        aria-label="Edit"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(g.id)}
                        className="px-1 text-mist transition hover:text-red-400"
                        aria-label="Delete"
                      >
                        ⌫
                      </button>
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
        {gear.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-sage">
            No gear yet. Add your first item to start tracking pack weight.
          </p>
        )}
      </div>

      <GearModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSave={handleSave}
        editItem={editItem}
      />
    </div>
  );
}
