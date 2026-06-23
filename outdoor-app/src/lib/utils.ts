import clsx from "clsx";
import type { Difficulty } from "@/lib/types";

export function difficultyColor(difficulty: Difficulty) {
  return clsx({
    "bg-emerald-100 text-emerald-800": difficulty === "easy",
    "bg-amber-100 text-amber-800": difficulty === "moderate",
    "bg-rose-100 text-rose-800": difficulty === "hard",
  });
}

export function formatRating(rating: number) {
  return rating > 0 ? rating.toFixed(1) : "New";
}

export function formatLocation(state: string, country: string) {
  return `${state}, ${country}`;
}

export function stars(rating: number) {
  return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
}
