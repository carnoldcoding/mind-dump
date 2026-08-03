// The System folder that owns unfinished work: capture, grooming, deletion,
// and the todo → active → done transitions (ADR-0004).
//
// Capture asks for a title and a Category and nothing else. Everything heavier
// — critique, rating, screenshots — belongs to the Reviews window, which a
// Review reaches by being finished here.
//
// Laid out as a NieR menu screen rather than as two lists of titles, in the
// same grammar as the Category shelf and the Review detail:
//
//   ┌ BACKLOG ──────────────────────────────────────────────┐
//   │ [ capture ▸                                         ] │
//   │ ▌ STARTED                    │ STATE                  │
//   │ ▌ ┌───────────┐┌───────────┐ │ started        2       │
//   │ ▌ │▩ SILENT   ││▩ FRIEREN  │ │ queued         1       │
//   │ ▌ │  ✦♪  86d  ││  —   197d │ │ ─────────────────      │
//   │ ▌ │ FINISH ✕  ││ FINISH ✕  │ │ game           2       │
//   │ ▌ └───────────┘└───────────┘ │ □□□□□□□□□□□            │
//   │ ▌ NOT STARTED                │      NO ERROR          │
//   ├───────────────────────────────────────────────────────┤
//   │ ▌ Silent Hill — started, waiting 86 days              │
//   └───────────────────────────────────────────────────────┘
//
// A card says which Critique sections have been written and never how many of
// four, because four is what a Category offers rather than a target it sets —
// see CONTEXT.md. A denominator here would be the interface imposing exactly
// the uniformity that shape exists to avoid.

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
import { daysWaiting } from "../../../../utils/capturedAt";
import { writtenSections, SECTION_GLYPH } from "../../../../utils/critique";
import { CATEGORIES } from "../../../../utils/categories";
import { usePanelReveal, panelStageIndex } from "../../../../hooks/usePanelReveal";
import { usePanelHeight } from "../../../../hooks/usePanelHeight";
import { enterClass } from "../../../../utils/animations";
import { ReviewCover } from "../../../../components/review/ReviewCover";
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
// component type on every render, so React threw away and rebuilt every card on
// each keystroke in the capture field.
type CardActions = {
    onSetStatus: (review: Review, status: ReviewStatus) => void;
    onRemove: (review: Review) => void;
    onEdit: (review: Review) => void;
    onSelect: (review: Review) => void;
};

/** The year alone — a card has no room for a date and no use for the rest. */
const releaseYear = (review: Review): string | undefined =>
    review.release_date?.trim().slice(0, 4) || undefined;

/**
 * The marks for the Critique sections that exist.
 *
 * Only the written ones are drawn. A ghosted mark for an unwritten section
 * would read as an empty slot to fill, which is the same claim a fraction
 * makes and equally untrue: a game with nothing worth saying about story is
 * finished without a story section.
 */
const Written = ({ review }: { review: Review }) => {
    const written = writtenSections(review);
    return (
        <span
            aria-label="Sections written"
            title={written.length ? written.join(', ') : 'Nothing written yet'}
            className="text-nier-text-dark/70 tracking-widest text-xs"
        >
            {written.length
                ? written.map(section => SECTION_GLYPH[section] ?? '▪').join('')
                : '—'}
        </span>
    );
};

type CardProps = CardActions & { review: Review; selected: boolean };

const Card = ({ review, selected, onSetStatus, onRemove, onEdit, onSelect }: CardProps) => {
    // Per card rather than one flag in the parent: a single "confirming" bit
    // would arm every card in the grid at once.
    const [confirming, setConfirming] = useState(false);
    const waiting = daysWaiting(review._id);
    const year = releaseYear(review);

    return (
        <li
            onMouseEnter={() => { onSelect(review); }}
            onMouseLeave={() => setConfirming(false)}
            onFocus={() => onSelect(review)}
            className={`relative flex flex-col transition-colors duration-150 ${
                selected ? 'bg-nier-100-lighter' : 'bg-nier-150/25'
            }`}
        >
            <div className="flex gap-3 p-2.5">
                <div className="h-20 w-14 flex-shrink-0 overflow-hidden bg-nier-150/40">
                    <ReviewCover imagePath={review.image_path} fill />
                </div>

                <div className="flex flex-col min-w-0 flex-1 gap-1">
                    <h4 className="text-sm uppercase tracking-wide text-nier-text-dark truncate">
                        {review.title}
                    </h4>

                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-nier-text-dark/50">
                        <ion-icon
                            name={TYPE_ICON[review.type] ?? 'document-sharp'}
                            style={{ flexShrink: 0, fontSize: '11px' }}
                        ></ion-icon>
                        {review.type}
                        {year && <span aria-hidden="true">·</span>}
                        {year}
                    </p>

                    {review.genres && review.genres.length > 0 && (
                        <p className="text-[10px] uppercase tracking-wide text-nier-text-dark/40 truncate">
                            {review.genres.slice(0, 2).join(' · ')}
                        </p>
                    )}

                    <div className="mt-auto flex items-baseline justify-between gap-2 pt-1">
                        <Written review={review} />
                        {/* Absent rather than zero where the id carries no
                            date: an unreadable id means we don't know, which
                            is not the same as captured today. */}
                        {waiting !== undefined && (
                            <span className="text-[10px] uppercase tracking-wide text-nier-text-dark/40 whitespace-nowrap">
                                waiting {waiting}d
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-stretch gap-px border-t border-nier-150/50">
                {review.status === 'todo' && (
                    <button
                        onClick={() => onSetStatus(review, 'active')}
                        className="flex-1 text-[10px] uppercase tracking-widest py-1.5 bg-nier-150/50 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer transition-colors duration-150"
                    >Start</button>
                )}
                {review.status === 'active' && (
                    <button
                        onClick={() => onSetStatus(review, 'done')}
                        className="flex-1 text-[10px] uppercase tracking-widest py-1.5 bg-nier-150/50 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer transition-colors duration-150"
                    >Finish</button>
                )}
                {/* Story 16: capture staying minimal must not mean detail is
                    impossible. Unfinished Reviews are editable here and nowhere
                    else, since the Reviews window now shows finished work only. */}
                <button
                    onClick={() => onEdit(review)}
                    aria-label={`Edit ${review.title}`}
                    className="flex-1 text-[10px] uppercase tracking-widest py-1.5 bg-nier-150/50 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer transition-colors duration-150"
                >Edit</button>

                {/* Two presses, because this is the one control here that
                    cannot be taken back. An undo could not be built either:
                    restoring would write a new record with a new id, and the
                    id is where the capture date comes from. */}
                {confirming ? (
                    <button
                        onClick={() => { setConfirming(false); onRemove(review); }}
                        aria-label={`Confirm removing ${review.title}`}
                        className="flex-[2] text-[10px] uppercase tracking-widest py-1.5 bg-nier-dark text-nier-text-light cursor-pointer"
                    >Delete?</button>
                ) : (
                    <button
                        onClick={() => setConfirming(true)}
                        aria-label={`Remove ${review.title}`}
                        className="w-9 text-xs leading-none py-1.5 bg-nier-150/50 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer transition-colors duration-150"
                    >✕</button>
                )}
            </div>
        </li>
    );
};

type SectionProps = CardActions & {
    label: string;
    items: Review[];
    selected: Review | undefined;
};

const Section = ({ label, items, selected, ...actions }: SectionProps) => (
    <section>
        <h3 className="bg-nier-dark text-nier-text-light text-[10px] uppercase tracking-widest px-2 py-1">
            {label}
        </h3>
        {items.length === 0
            ? <p className="text-sm text-nier-text-dark/40 px-2 py-3">Nothing here.</p>
            : (
                <ul
                    aria-label={label}
                    className="grid grid-cols-1 xl:grid-cols-2 gap-2 mt-2"
                >
                    {items.map(review => (
                        <Card
                            key={`${review.type}-${review.slug}`}
                            review={review}
                            selected={selected?.slug === review.slug}
                            {...actions}
                        />
                    ))}
                </ul>
            )}
    </section>
);

/** One `label ......... value` line of the state readout. */
const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="uppercase tracking-wide text-nier-text-dark/70">{label}</span>
        <span className="uppercase text-nier-text-dark">{value}</span>
    </div>
);

/**
 * The reference's ステータス box, saying what this folder is carrying.
 *
 * Deliberately no figure about Critique sections. A count across the Backlog
 * would only be interesting against a total, and there is no total to be
 * against — so the sections stay on the cards, where they say which rather
 * than how many.
 */
const State = ({ started, queued }: { started: Review[]; queued: Review[] }) => {
    const all = [...started, ...queued];
    const oldest = all
        .map(review => daysWaiting(review._id))
        .filter((days): days is number => days !== undefined)
        .sort((a, b) => b - a)[0];

    return (
        <div aria-label="Backlog state" className="flex flex-col">
            <h3 className="bg-nier-dark text-nier-text-light text-[10px] uppercase tracking-widest px-2 py-1">
                State
            </h3>
            <div className="flex flex-col gap-1 px-2 py-3">
                <Stat label="Started" value={started.length} />
                <Stat label="Queued" value={queued.length} />
            </div>
            {/* Every Category, including the ones with nothing on them: a
                shelf that is clear is worth seeing as clear. */}
            <div className="flex flex-col gap-1 px-2 py-3 border-t border-nier-150">
                {CATEGORIES.map(category => (
                    <Stat
                        key={category.type}
                        label={category.type}
                        value={all.filter(review => review.type === category.type).length}
                    />
                ))}
            </div>
            {oldest !== undefined && (
                <div className="flex flex-col gap-1 px-2 pb-3 border-t border-nier-150 pt-3">
                    <Stat label="Oldest" value={`${oldest}d`} />
                </div>
            )}
            {/* The reference's row of empty slots. Furniture, and honest about
                it: there is nothing to put in them. */}
            <div aria-hidden="true" className="flex flex-wrap gap-1 px-2 pt-2 border-t border-nier-150">
                {Array.from({ length: 11 }, (_, i) => (
                    <span key={i} className="h-2 w-2 border border-nier-text-dark/40 mt-2" />
                ))}
            </div>
        </div>
    );
};

/** What the caption bar says about the selection. */
const captionFor = (review: Review | undefined, error: string | null): string => {
    if (error) return error;
    if (!review) return "Nothing on the backlog.";
    const waiting = daysWaiting(review._id);
    const state = review.status === 'active' ? 'started' : 'queued';
    return waiting !== undefined
        ? `${review.title} — ${state}, waiting ${waiting} days`
        : `${review.title} — ${state}`;
};

const BacklogWindow = ({ onClose }: Props) => {
    const { reviews } = useReviews();
    const panelStage = usePanelReveal(true);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLDivElement>();

    const [error, setError] = useState<string | null>(null);
    const [justFinished, setJustFinished] = useState<string | null>(null);
    const [editing, setEditing] = useState<Review | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

    const unfinished = useMemo(
        () => reviews.filter(isUnfinished),
        [reviews],
    );

    // Longest-waiting first, so the folder opens on what has been avoided
    // longest rather than on whatever the API happened to return first.
    // Anything whose id carries no date sorts last: unknown is not old.
    const byLongestWaiting = (a: Review, b: Review) =>
        (daysWaiting(b._id) ?? -1) - (daysWaiting(a._id) ?? -1);

    const started = useMemo(
        () => unfinished.filter(r => r.status === 'active').sort(byLongestWaiting),
        [unfinished],
    );
    const unstarted = useMemo(
        () => unfinished.filter(r => r.status === 'todo').sort(byLongestWaiting),
        [unfinished],
    );

    const listed = useMemo(() => [...started, ...unstarted], [started, unstarted]);
    const selected = listed.find(review => review.slug === selectedSlug) ?? listed[0];

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

    const actions = {
        onSetStatus: setStatus,
        onRemove: remove,
        onEdit: openEdit,
        onSelect: (review: Review) => setSelectedSlug(review.slug),
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

                    <div className="flex gap-4 min-h-0">
                        {/* The gutter rail: two-tone, and the only thing left
                            of the content, exactly as the reference has it. */}
                        <div aria-hidden="true" className="hidden sm:flex w-1 flex-shrink-0 flex-col">
                            <span className="w-full flex-[2] bg-nier-shadow" />
                            <span className="w-full flex-[5] bg-nier-150/50" />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col gap-4">
                            <Section label="Started" items={started} selected={selected} {...actions} />
                            <Section label="Not Started" items={unstarted} selected={selected} {...actions} />
                        </div>

                        <div className="hidden md:block w-40 flex-shrink-0 bg-nier-100-lighter/40">
                            <State started={started} queued={unstarted} />
                        </div>
                    </div>
                </div>

                {/* The caption bar. Says what is under the pointer, and carries
                    the fault as well, because the state column is desktop-only
                    and a phone would otherwise be told nothing. */}
                <div className={`flex-shrink-0 border-t border-nier-150 flex items-center gap-3 px-4 py-2 ${contentReady ? '' : 'invisible'}`}>
                    <span aria-hidden="true" className="w-1 h-5 bg-nier-dark flex-shrink-0" />
                    <p className="text-xs uppercase tracking-wide truncate text-nier-text-dark/70">
                        {captionFor(selected, error)}
                    </p>
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
