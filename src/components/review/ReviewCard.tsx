// The one way a Review is drawn, wherever it appears — Now, the Backlog, a
// Category shelf, a set of Search results. Cover, title, and a single caption
// whose content the surface supplies.
//
// The card is deliberately ignorant of where it is. It takes a Review and the
// caption to show under the title; it does not take filter state, and it has
// no booleans deciding which fields to reveal. A surface that wants to say
// something different says it by passing a different caption.
//
// Size comes from the container: the card fills its cell, so a hero is a
// bigger cell rather than a different component.

import { Link } from "react-router";
import type { Review } from "../../store/reviews";
import { reviewPath } from "../../utils/categories";
import { ReviewCover } from "./ReviewCover";

type Props = {
    review: Review;
    /** The one contextual line under the title. Omitted leaves the row out. */
    caption?: React.ReactNode;
};

/** Year alone: a card has no room for a date and no use for the rest of it. */
const releaseYear = (review: Review): string | undefined =>
    review.release_date?.trim().slice(0, 4) || undefined;

export const ReviewCard = ({ review, caption }: Props) => {
    // Revealed on focus rather than shown always: the facts are worth having
    // to hand, and worth nothing on forty cards at once.
    const detail = [releaseYear(review), review.creator, review.genres?.[0]]
        .map(value => value?.toString().trim())
        .filter(Boolean) as string[];

    return (
        <Link
            to={reviewPath(review)}
            className="nier-card group block relative focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nier-dark"
        >
            <div className="absolute w-full h-full bg-nier-shadow top-1 left-1" aria-hidden="true" />

            <article className="relative bg-nier-100-lighter border border-nier-150 group-hover:border-nier-dark group-focus-visible:border-nier-dark transition-colors duration-200">
                <div className="relative">
                    <ReviewCover imagePath={review.image_path} />

                    {detail.length > 0 && (
                        // Sits over the foot of the cover rather than growing
                        // the card, so revealing it cannot reflow a grid.
                        <div className="nier-cover-detail">
                            {detail.map(value => (
                                <p key={value} className="text-[10px] uppercase tracking-wide truncate text-nier-text-light">
                                    {value}
                                </p>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-nier-150 px-2 py-1.5 bg-nier-150/40 group-hover:bg-nier-dark group-focus-visible:bg-nier-dark transition-colors duration-200">
                    <h3 className="text-sm uppercase tracking-wide truncate text-nier-text-dark group-hover:text-nier-text-light group-focus-visible:text-nier-text-light transition-colors duration-200">
                        {review.title}
                    </h3>
                    {caption && (
                        <p className="text-xs uppercase tracking-wide truncate text-nier-text-dark/50 group-hover:text-nier-text-light/70 group-focus-visible:text-nier-text-light/70 transition-colors duration-200">
                            {caption}
                        </p>
                    )}
                </div>
            </article>
        </Link>
    );
};
