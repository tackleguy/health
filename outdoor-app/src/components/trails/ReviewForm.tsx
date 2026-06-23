"use client";

import { useState } from "react";
import type { Review } from "@/lib/types";

interface ReviewFormProps {
  trailId: string;
  existingReview?: Review;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReviewForm({
  trailId,
  existingReview,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const method = existingReview ? "PATCH" : "POST";
    const payload = existingReview
      ? { id: existingReview.id, rating, body }
      : { trail_id: trailId, rating, body };

    const res = await fetch("/api/reviews", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-stone-900">
        {existingReview ? "Edit your review" : "Write a review"}
      </h3>

      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          Rating
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl transition ${star <= rating ? "text-amber-400" : "text-stone-300"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="review-body"
          className="mb-2 block text-sm font-medium text-stone-700"
        >
          Your experience
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Share details about conditions, difficulty, and highlights..."
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : existingReview ? "Update review" : "Post review"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
