import { useEffect, useState } from 'react';
import { ReviewCover } from '../../../../components/review/ReviewCover';
import { daysWaiting } from '../../../../utils/capturedAt';
import { SECTION_GLYPH, writtenSections } from '../../../../utils/critique';
import type { Review } from '../../../../store/reviews';

type UnstartedDetailProps = {
    review: Review;
    onClose: () => void;
    onStart: (review: Review) => void;
    onEdit: (review: Review) => void;
    onRemove: (review: Review) => void;
};

/**
 * The picked Review, filling the column the Readouts otherwise hold.
 *
 * It takes that space rather than a fourth column because at this width a
 * fourth would squeeze the list to about 500px, and because the two are never
 * both wanted: the Readouts describe the list you are scanning, and this
 * describes the one thing you have stopped on.
 *
 * Hover does not fill this — only a click does. Hover keeps driving the
 * caption bar, so running the pointer down twenty rows costs one line of text
 * rather than twenty renders of a panel.
 */
export const UnstartedDetail = ({ review, onClose, onStart, onEdit, onRemove }: UnstartedDetailProps) => {
    const waiting = daysWaiting(review._id);
    const written = writtenSections(review as never);

    // Removing takes two presses, as it did on the card this replaces. It is
    // the one irreversible thing in the window, and the panel is small enough
    // that Remove sits a few pixels from Edit.
    const [confirming, setConfirming] = useState(false);

    // Arming is about one Review. Moving the pick to another must not leave
    // the next one armed, or a second press removes something never chosen.
    useEffect(() => setConfirming(false), [review._id]);

    return (
        <div
            id="unstarted-detail"
            // Focusable so Enter from the search field can land here, which is
            // how the actions are reached without a pointer.
            tabIndex={-1}
            onKeyDown={event => { if (event.key === 'Escape') onClose(); }}
            className="flex flex-col gap-2 p-2 h-full overflow-y-auto outline-none"
        >
            <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase tracking-widest text-nier-text-dark/50">Selected</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close detail"
                    className="text-xs leading-none cursor-pointer hover:text-nier-dark transition-colors duration-150"
                >✕</button>
            </div>

            <div className="w-full aspect-[3/4] bg-nier-150/40 overflow-hidden">
                <ReviewCover imagePath={review.image_path} fill />
            </div>

            <h4 className="text-sm uppercase tracking-wide text-nier-text-dark leading-tight">
                {review.title}
            </h4>

            <p className="text-[10px] uppercase tracking-wide text-nier-text-dark/50">
                {review.type}
                {review.release_date && ` · ${review.release_date.slice(0, 4)}`}
            </p>

            {review.creator && (
                <p className="text-[10px] uppercase tracking-wide text-nier-text-dark/60 truncate">
                    {review.creator}
                </p>
            )}

            {review.genres && review.genres.length > 0 && (
                <p className="text-[10px] uppercase tracking-wide text-nier-text-dark/40">
                    {review.genres.join(' · ')}
                </p>
            )}

            {/* Which sections exist, never how many. A Category offers at most
                four and requires none — CONTEXT.md on Critique. */}
            {written.length > 0 && (
                <p className="text-xs text-nier-text-dark/60" aria-label="Sections written">
                    {written.map(section => SECTION_GLYPH[section] ?? '\u25aa').join('')}
                </p>
            )}

            {waiting !== undefined && (
                <p className="text-[10px] uppercase tracking-wide text-nier-text-dark/40">
                    waiting {waiting}d
                </p>
            )}

            {typeof review.description === 'string' && review.description && (
                <p className="text-xs text-nier-text-dark/70 line-clamp-6">{review.description}</p>
            )}

            {/* Leaving with the pointer disarms, and so does Keep. The
                pointer gesture alone is not enough: this folder is used
                one-handed on a phone, where an armed control would stay armed
                with the confirm as the biggest target on screen. */}
            <div className="mt-auto flex flex-col gap-px pt-2" onMouseLeave={() => setConfirming(false)}>
                <button
                    type="button"
                    onClick={() => onStart(review)}
                    aria-label={`Start ${review.title}`}
                    className="text-[10px] uppercase tracking-widest py-1.5 bg-nier-dark text-nier-text-light hover:bg-nier-text-dark cursor-pointer transition-colors duration-150"
                >Start</button>
                <div className="flex gap-px">
                    <button
                        type="button"
                        onClick={() => (confirming ? setConfirming(false) : onEdit(review))}
                        aria-label={confirming ? `Keep ${review.title}` : `Edit ${review.title}`}
                        className="flex-1 text-[10px] uppercase tracking-widest py-1.5 bg-nier-150/50 hover:bg-nier-150 cursor-pointer transition-colors duration-150"
                    >{confirming ? 'Keep' : 'Edit'}</button>
                    <button
                        type="button"
                        onClick={() => (confirming ? onRemove(review) : setConfirming(true))}
                        aria-label={confirming ? `Confirm removing ${review.title}` : `Remove ${review.title}`}
                        className={`flex-1 text-[10px] uppercase tracking-widest py-1.5 cursor-pointer transition-colors duration-150 ${
                            confirming
                                ? 'bg-red-800 text-nier-100-lighter'
                                : 'bg-nier-150/50 hover:bg-red-800 hover:text-nier-100-lighter'
                        }`}
                    >{confirming ? 'Sure?' : 'Remove'}</button>
                </div>
            </div>
        </div>
    );
};
