"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { GearCategory, GearItem, GearType } from "@/lib/gear";

function mapGear(row: Record<string, unknown>): GearItem {
  return {
    id: String(row.id),
    name: String(row.name),
    category: row.category as GearCategory,
    type: (row.type as GearType) || "Base",
    qty: Number(row.qty) || 1,
    weight: Number(row.weight) || 0,
    price: Number(row.price) || 0,
    link: String(row.link ?? ""),
  };
}

export function useGear(userId: string) {
  const [gear, setGear] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(() => isSupabaseConfigured() ? null : "Account gear is unavailable in this preview.");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let active = true;
    void supabase.from("gear_items").select("*").eq("user_id", userId).order("created_at")
      .then(({ data, error: failure }) => {
        if (!active) return;
        setError(failure?.message ?? null);
        if (!failure) setGear((data ?? []).map(mapGear));
        setLoading(false);
      });
    return () => { active = false; };
  }, [userId]);

  const addGear = async (item: Omit<GearItem, "id">) => {
    const supabase = createClient();
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("gear_items")
      .insert({ user_id: userId, ...item })
      .select()
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    if (data) setGear((prev) => [...prev, mapGear(data)]);
  };

  const editGear = async (id: string, item: Omit<GearItem, "id">) => {
    const supabase = createClient();
    if (!supabase) return;
    const { error: err } = await supabase
      .from("gear_items")
      .update(item)
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setGear((prev) => prev.map((g) => (g.id === id ? { ...item, id } : g)));
  };

  const deleteGear = async (id: string) => {
    const supabase = createClient();
    if (!supabase) return;
    const { error: err } = await supabase
      .from("gear_items")
      .delete()
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setGear((prev) => prev.filter((g) => g.id !== id));
  };

  return { gear, loading, error, addGear, editGear, deleteGear };
}
