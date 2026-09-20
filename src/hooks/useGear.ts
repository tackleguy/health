"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
    modelUrl: String(row.model_url ?? ""),
  };
}

export function useGear(userId: string) {
  const [gear, setGear] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGear = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured");
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from("gear_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");
    if (err) setError(err.message);
    else setGear((data ?? []).map(mapGear));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchGear();
  }, [fetchGear]);

  const addGear = async (item: Omit<GearItem, "id">) => {
    const supabase = createClient();
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("gear_items")
      .insert({
        user_id: userId,
        name: item.name,
        category: item.category,
        type: item.type,
        qty: item.qty,
        weight: item.weight,
        price: item.price,
        link: item.link,
        model_url: item.modelUrl || "",
      })
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
      .update({
        name: item.name,
        category: item.category,
        type: item.type,
        qty: item.qty,
        weight: item.weight,
        price: item.price,
        link: item.link,
        model_url: item.modelUrl || "",
      })
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
