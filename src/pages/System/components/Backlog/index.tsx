// The System folder that owns unfinished work: capture, grooming, deletion,
// and the todo → active → done transitions (ADR-0004).
//
// Capture asks for a title and a Category and nothing else. Everything heavier
// — critique, rating, screenshots — belongs to the Reviews window, which a
// Review reaches by being finished here.

import { useMemo, useState } from "react";
import { backend } from "../../../../api/backend";
import {
    useReviews,
    invalidateReviews,
    isUnfinished,
    type Review,
    type ReviewStatus,
} from "../../../../store/reviews";
import { todayIso } from "../../../../utils/completionDate";
import { usePanelReveal, panelStageIndex } from "../../../../hooks/usePanelReveal";
import { usePanelHeight } from "../../../../hooks/usePanelHeight";
import { enterClass } from "../../../../utils/animations";
import { ReviewModal } from "../ReviewPanel/ReviewModal";
import { Capture } from "./Capture";

type Props = {
    onClose: () => void;
};

const TYPE_ICON: Record<string, string> = {
    game: 'game-controller-sharp',
    cinema: 'videocam-sharp',
    book: 'book-sharp',
};

// Declared outside the component: nested inside it, these were a fresh
// component type on every render, so React threw away and rebuilt every row on
// each keystroke in the capture field.
type RowActions = {
    onSetStatus: (review: Review, status: ReviewStatus) => void;
    onRemove: (review: Review) => void;
    onEdit: (review: Review) => void;
};

type RowProps = RowActions & { review: Review };

const Row = ({ review, onSetStatus, onRemove, onEdit }: RowProps) => (
    <li className="flex items-center gap-2 px-3 py-2 hover:bg-nier-150/40 transition-colors">
        <ion-icon
            name={TYPE_ICON[review.type] ?? 'document-sharp'}
            style={{ flexShrink: 0, opacity: 0.4, fontSize: '14px' }}
        ></ion-icon>
        <span className="text-sm uppercase tracking-wide text-nier-text-dark truncate flex-1">
            {review.title}
        </span>
        <div className="flex gap-1 flex-shrink-0">
            {review.status === 'todo' && (
                <button
                    onClick={() => onSetStatus(review, 'active')}
                    className="text-xs uppercase tracking-wide px-2 py-1 bg-nier-150/60 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer"
                >Start</button>
            )}
            {review.status === 'active' && (
                <button
                    onClick={() => onSetStatus(review, 'done')}
                    className="text-xs uppercase tracking-wide px-2 py-1 bg-nier-150/60 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer"
                >Finish</button>
            )}
            {/* Story 16: capture staying minimal must not mean detail is
                impossible. Unfinished Reviews are editable here and nowhere
                else, since the Reviews window now shows finished work only. */}
            <button
                onClick={() => onEdit(review)}
                aria-label={`Edit ${review.title}`}
                className="text-xs uppercase tracking-wide px-2 py-1 bg-nier-150/60 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer"
            >Edit</button>
            <button
                onClick={() => onRemove(review)}
                aria-label={`Remove ${review.title}`}
                className="text-xs uppercase tracking-wide px-2 py-1 bg-nier-150/60 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer"
            >Remove</button>
        </div>
    </li>
);

type ShelfProps = RowActions & { label: string; items: Review[] };

const Shelf = ({ label, items, onSetStatus, onRemove, onEdit }: ShelfProps) => (
    <div className="relative">
        <aside className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
        <div className="w-full bg-nier-100-lighter relative">
            <div className="h-7 w-full bg-nier-150 flex items-center px-2">
                <h3 className="text-nier-text-dark text-sm">{label} ({items.length})</h3>
            </div>
            {items.length === 0
                ? <p className="text-sm text-nier-text-dark/50 px-3 py-2">Nothing here.</p>
                : (
                    <ul className="flex flex-col divide-y divide-nier-150/40" aria-label={label}>
                        {items.map(review => (
                            <Row
                                key={`${review.type}-${review.slug}`}
                                review={review}
                                onSetStatus={onSetStatus}
                                onRemove={onRemove}
                                onEdit={onEdit}
                            />
                        ))}
                    </ul>
                )}
        </div>
    </div>
);

const BacklogWindow = ({ onClose }: Props) => {
    const { reviews } = useReviews();
    const panelStage = usePanelReveal(true);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLDivElement>();

    const [error, setError] = useState<string | null>(null);
    const [justFinished, setJustFinished] = useState<string | null>(null);
    const [editing, setEditing] = useState<Review | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);

    const unfinished = useMemo(
        () => reviews.filter(isUnfinished),
        [reviews],
    );
    const started = useMemo(() => unfinished.filter(r => r.status === 'active'), [unfinished]);
    const unstarted = useMemo(() => unfinished.filter(r => r.status === 'todo'), [unfinished]);

    const openEdit = (review: Review) => {
        setEditing(review);
        setEditorOpen(true);
    };

    const setStatus = async (review: Review, status: ReviewStatus) => {
        setError(null);
        try {
            await backend.saveReview({
                ...review,
                status,
                date_completed: status === 'done' ? todayIso() : review.date_completed,
            }, true);
            if (status === 'done') setJustFinished(review.title);
            invalidateReviews();
        } catch {
            setError('Network error');
        }
    };

    const remove = async (review: Review) => {
        setError(null);
        try {
            await backend.deleteReview(review.slug);
            invalidateReviews();
        } catch {
            setError('Network error');
        }
    };

    return (
        <div className="relative">
            <aside className={`absolute w-full h-full bg-nier-shadow top-1 left-1 ${enterClass('nier-enter')}`} />
            <div
                    ref={panelRef}
                    style={maxHeight ? { maxHeight } : undefined}
                    className={`nier-panel-frame relative bg-nier-100 border border-nier-150 flex flex-col ${enterClass('nier-enter')}`}
                >
                <div className={`h-10 bg-nier-150 flex items-center justify-between px-5 flex-shrink-0 ${contentReady ? '' : 'invisible'}`}>
                    <h3 className="text-nier-text-dark text-xl uppercase tracking-wider">Backlog</h3>
                    <button
                        onClick={onClose}
                        aria-label="Close backlog"
                        className="text-sm px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter leading-none"
                    >✕</button>
                </div>

                <div className={`p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0 ${contentReady ? '' : 'invisible'}`}>

                    <Capture reviews={reviews} />

                    {/* The handoff. Finishing something here is where it stops
                        being the Backlog's and becomes the Reviews window's —
                        a real seam, so it says so rather than pretending
                        otherwise (story 19). */}
                    {justFinished && (
                        <p className="text-sm text-nier-text-dark/70 px-1">
                            Finished {justFinished}. Write it up in the Reviews folder.
                        </p>
                    )}

                    {error && <p className="text-sm text-red-700 px-1">{error}</p>}

                    <Shelf label="Started" items={started} onSetStatus={setStatus} onRemove={remove} onEdit={openEdit} />
                    <Shelf label="Not Started" items={unstarted} onSetStatus={setStatus} onRemove={remove} onEdit={openEdit} />
                </div>
            </div>

            {/* The heavier fields, asked for at the stage that needs them
                (story 2) — the same editor the Reviews window uses. */}
            <ReviewModal
                isOpen={editorOpen}
                setIsOpen={setEditorOpen}
                onReviewAdded={() => { invalidateReviews(); setEditing(null); }}
                editingReview={editing}
            />
        </div>
    );
};

export default BacklogWindow;
