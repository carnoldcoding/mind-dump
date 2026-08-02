// What the footer says about the collection. Derived from Reviews already in
// the store — nothing is entered and nothing is stored, so a readout cannot be
// out of date.
//
// A pure function rather than logic inside the footer: the footer is chrome
// that changes for animation reasons, and this changes for domain reasons.

import { isFinished, type Review } from "../store/reviews";

export type Readouts = {
    inProgress: number;
    queued: number;
    finishedThisYear: number;
    /** Mean across rated Reviews, or null when nothing is rated yet. */
    averageRating: number | null;
};

export function readoutsFor(reviews: Review[], now: Date = new Date()): Readouts {
    const finished = reviews.filter(isFinished);

    // A Review rated 0 was rated. Absence is `rating` not being a number at
    // all — the same distinction the Review detail page had to make.
    const rated = finished.filter(review => typeof review.rating === "number");
    const year = `${now.getFullYear()}`;

    return {
        inProgress: reviews.filter(review => review.status === "active").length,
        queued: reviews.filter(review => review.status === "todo").length,
        finishedThisYear: finished.filter(review => review.date_completed?.startsWith(year)).length,
        averageRating: rated.length
            ? rated.reduce((total, review) => total + (review.rating ?? 0), 0) / rated.length
            : null,
    };
}
