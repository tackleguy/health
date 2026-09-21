"use client";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { memoryKey, parseMemory } from "@/lib/assistant/memory";
import type { PlannerMemory } from "@/lib/assistant/types";
const eventName = "outdoor-planner-memory";
export function usePlannerMemory(userId: string | null) {
  const key = memoryKey(userId);
  const [error, setError] = useState("");
  const subscribe = useCallback((notify: () => void) => {
    const listener = () => notify();
    window.addEventListener("storage", listener); window.addEventListener(eventName, listener);
    return () => { window.removeEventListener("storage", listener); window.removeEventListener(eventName, listener); };
  }, []);
  const snapshot = useCallback(() => { try { return localStorage.getItem(key) ?? ""; } catch { return ""; } }, [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const memory = useMemo(() => parseMemory(raw), [raw]);
  const update = useCallback((fn: (current: PlannerMemory) => PlannerMemory) => {
    try { const next = fn(parseMemory(localStorage.getItem(key))); localStorage.setItem(key, JSON.stringify(next)); window.dispatchEvent(new Event(eventName)); setError(""); return true; }
    catch { setError("This browser could not save your plan. Check available storage and private-browsing settings."); return false; }
  }, [key]);
  return { memory, update, error };
}
