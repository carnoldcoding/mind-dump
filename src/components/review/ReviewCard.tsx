// The one way a Review is drawn, wherever it appears — Now, the Backlog, a
// Category shelf, a set of Search results. Cover, title, and a single line
// whose content the surface supplies.
//
// The card is deliberately ignorant of where it is. It takes a Review and the
// line to show under the title; it does not take filter state, and it has no
// booleans deciding which fields to reveal. A surface that wants to say
// something different says it by passing a different line.
//
// Size comes from the container: the card fills its cell, so a hero is a
// bigger cell rather than a different component.

import { Link } from "react-router";
import type { Review } from "../../store/reviews";
import { reviewPath } from "../../utils/categories";

type Props = {
    review: Review;
    /** The one contextual line, under the title. Omitted leaves the row out. */
    line?: React.ReactNode;
};

export const ReviewCard = ({ review, line }: Props) => (
    <Link
        to={reviewPath(review)}
        className="group block relative focus:outline-none"
    >
        <div className="absolute w-full h-full bg-nier-shadow top-1 left-1" aria-hidden="true" />

        <article className="relative bg-nier-100-lighter border border-nier-150 group-hover:border-nier-dark group-focus-visible:border-nier-dark transition-colors duration-200">
            <div className="nier-cover">
                {review.image_path
                    ? (
                        <>
                            <img
                                src={review.image_path}
                                alt=""
                                loading="lazy"
                                className="nier-cover-img"
                            />
                            <div className="nier-cover-tint" />
                        </>
                    )
                    : <div className="nier-cover-empty" aria-hidden="true" />}
            </div>

            <div className="border-t border-nier-150 px-2 py-1.5 bg-nier-150/40 group-hover:bg-nier-dark group-focus-visible:bg-nier-dark transition-colors duration-200">
                <h3 className="text-sm uppercase tracking-wide truncate text-nier-text-dark group-hover:text-nier-text-light group-focus-visible:text-nier-text-light transition-colors duration-200">
                    {review.title}
                </h3>
                {line && (
                    <p className="text-xs uppercase tracking-wide truncate text-nier-text-dark/50 group-hover:text-nier-text-light/70 group-focus-visible:text-nier-text-light/70 transition-colors duration-200">
                        {line}
                    </p>
                )}
            </div>
        </article>
    </Link>
);
