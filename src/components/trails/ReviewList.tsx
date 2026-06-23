"use client";

import type { Review } from "@/lib/types";
import { stars } from "@/lib/utils";

interface ReviewListProps {
  reviews: Review[];
  currentUserId: string | null;
  onEdit: (review: Review) => void;
  onDelete: (reviewId: string) => void;
}

export function ReviewList({
  reviews,
  currentUserId,
  onEdit,
  onDelete,
}: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-stone-200 px-6 py-10 text-center text-stone-500">
        No reviews yet. Be the first to share your experience!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isOwner = currentUserId === review.user_id;
        const author = review.profile
          ? `${review.profile.first_name} ${review.profile.last_name}`.trim()
          : "Adventurer";

        return (
          <article
            key={review.id}
            className="rounded-2xl border border-stone-200 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-stone-900">{author}</p>
                <p className="text-xs text-stone-500">
                  {new Date(review.review_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <span className="text-amber-400">{stars(review.rating)}</span>
            </div>
            {review.body && (
              <p className="mt-3 text-sm leading-relaxed text-stone-700">
                {review.body}
              </p>
            )}
            {isOwner && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => onEdit(review)}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(review.id)}
                  className="text-sm font-medium text-rose-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
