"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Review } from "@/lib/types";
import { ReviewForm } from "./ReviewForm";
import { ReviewList } from "./ReviewList";

interface ReviewsSectionProps {
  trailId: string;
  initialReviews: Review[];
}

export function ReviewsSection({
  trailId,
  initialReviews,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const userReview = reviews.find((r) => r.user_id === userId);

  function refreshReviews() {
    window.location.reload();
  }

  return (
    <section className="mt-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-stone-900">
          Reviews ({reviews.length})
        </h2>
        {userId && !userReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Write a review
          </button>
        )}
        {!userId && (
          <a
            href="/login"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            Log in to write a review
          </a>
        )}
      </div>

      {(showForm || editingReview) && userId && (
        <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <ReviewForm
            trailId={trailId}
            existingReview={editingReview ?? undefined}
            onSuccess={() => {
              setShowForm(false);
              setEditingReview(null);
              refreshReviews();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingReview(null);
            }}
          />
        </div>
      )}

      <ReviewList
        reviews={reviews}
        currentUserId={userId}
        onEdit={(review) => {
          setEditingReview(review);
          setShowForm(false);
        }}
        onDelete={async (reviewId) => {
          await fetch(`/api/reviews?id=${reviewId}`, { method: "DELETE" });
          refreshReviews();
        }}
      />
    </section>
  );
}
