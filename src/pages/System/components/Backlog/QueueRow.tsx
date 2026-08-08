import { ReviewCover } from '../../../../components/review/ReviewCover';
import { daysWaiting } from '../../../../utils/capturedAt';
import type { Review } from '../../../../store/reviews';

type QueueRowProps = {
    review: Review;
    picked: boolean;
    onHover: (review: Review | undefined) => void;
    onPick: (review: Review) => void;
    onStart: (review: Review) => void;
};

/**
 * One unstarted Review, as a single line.
 *
 * The Backlog's richer Card stays on Started, where there are two or three of
 * them and the space is worth spending. Here there may be hundreds, so a row
 * is a line — which is also what the reference's own item lists are.
 *
 * The cover survives at thumbnail size because it is how you recognise
 * something without reading, and ReviewCover already loads lazily, so the
 * ones below the fold cost nothing.
 */
export const QueueRow = ({ review, picked, onHover, onPick, onStart }: QueueRowProps) => {
    const waiting = daysWaiting(review._id);

    return (
        <li
            data-queue-row
            onMouseEnter={() => onHover(review)}
            onMouseLeave={() => onHover(undefined)}
        >
            <div
                role="button"
                tabIndex={-1}
                aria-current={picked}
                onClick={() => onPick(review)}
                aria-label={`Select ${review.title}`}
                className={[
                    'group w-full flex items-center gap-2 pl-1 pr-2 py-1 text-left cursor-pointer',
                    'transition-colors duration-150',
                    picked ? 'bg-nier-dark text-nier-text-light' : 'hover:bg-nier-150/40',
                ].join(' ')}
            >
                {/* Reserved whether or not it is showing, so a row does not
                    shift sideways as the pick moves down the list. */}
                <span aria-hidden="true" className={`w-3 flex-shrink-0 text-[10px] ${picked ? 'opacity-100' : 'opacity-0'}`}>
                    ➤
                </span>

                <span className="h-7 w-5 flex-shrink-0 overflow-hidden bg-nier-150/40">
                    <ReviewCover imagePath={review.image_path} fill />
                </span>

                <span className="flex-1 min-w-0 text-xs uppercase tracking-wide truncate">
                    {review.title}
                </span>

                {waiting !== undefined && (
                    <span className={`text-[10px] uppercase tracking-wide whitespace-nowrap tabular-nums ${
                        picked ? 'text-nier-text-light/60' : 'text-nier-text-dark/40'
                    }`}>
                        {waiting}d
                    </span>
                )}

                {/* Starting is the one action worth reaching from the list
                    itself; everything else is in the detail panel, where
                    there is room to label it. */}
                <button
                    type="button"
                    onClick={event => { event.stopPropagation(); onStart(review); }}
                    aria-label={`Start ${review.title}`}
                    className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 flex-shrink-0 transition-opacity duration-150 cursor-pointer ${
                        picked
                            ? 'opacity-100 bg-nier-text-light/15 hover:bg-nier-text-light/30'
                            : 'opacity-0 group-hover:opacity-100 bg-nier-dark text-nier-text-light hover:bg-nier-text-dark'
                    }`}
                >
                    Start
                </button>
            </div>
        </li>
    );
};
