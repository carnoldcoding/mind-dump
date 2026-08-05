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

import { useMemo, useRef, useState } from "react";
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
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline";
import { domino, fade, wipe } from "../../../../utils/motion";
import { usePanelHeight } from "../../../../hooks/usePanelHeight";
import { Panel } from "../../../../components/common/Panel";
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
            title={written.length ? written.join(', ') : 'No sections written'}
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
                    id is where the capture date comes from.

                    Armed, it offers both answers rather than only the
                    dangerous one. Moving the pointer away also cancels, but
                    that is a mouse gesture and this folder is used one-handed
                    on a phone — without a control of its own, an armed card on
                    touch would stay armed with the confirm as the biggest
                    target in the row. */}
                {confirming ? (
                    <>
                        <button
                            onClick={() => setConfirming(false)}
                            aria-label={`Keep ${review.title}`}
                            className="flex-1 text-[10px] uppercase tracking-widest py-1.5 bg-nier-150/50 hover:bg-nier-150 cursor-pointer transition-colors duration-150"
                        >Keep</button>
                        <button
                            onClick={() => { setConfirming(false); onRemove(review); }}
                            aria-label={`Confirm removing ${review.title}`}
                            className="flex-1 text-[10px] uppercase tracking-widest py-1.5 bg-nier-dark text-nier-text-light cursor-pointer"
                        >Delete?</button>
                    </>
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
                    data-backlog-shelf
                    className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2"
                >
                    {items.map(review => (
                        <Card
                            key={`${review.type}-${review.slug}`}
                            review={review}
                            selected={selected !== undefined && keyOf(selected) === keyOf(review)}
                            {...actions}
                        />
                    ))}
                </ul>
            )}
    </section>
);

/** One `label ......... value` line of the state readout. */
const Readout = ({ label, value }: { label: string; value: React.ReactNode }) => (
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
const State = ({ started, notStarted, error }: {
    started: Review[];
    notStarted: Review[];
    /** A write that failed, or a collection that never arrived. */
    error: boolean;
}) => {
    const all = [...started, ...notStarted];
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
                {/* "Started" and "Not Started" are the Backlog's two labels
                    (CONTEXT.md). This column used to say "Queued" for the
                    second one, so the same screen called `todo` two names. */}
                <Readout label="Started" value={started.length} />
                <Readout label="Not Started" value={notStarted.length} />
            </div>
            {/* Every Category, including the ones with nothing on them: a
                shelf that is clear is worth seeing as clear. */}
            <div className="flex flex-col gap-1 px-2 py-3 border-t border-nier-150">
                {CATEGORIES.map(category => (
                    <Readout
                        key={category.type}
                        label={category.type}
                        value={all.filter(review => review.type === category.type).length}
                    />
                ))}
            </div>
            {oldest !== undefined && (
                <div className="flex flex-col gap-1 px-2 pb-3 border-t border-nier-150 pt-3">
                    <Readout label="Oldest" value={`${oldest}d`} />
                </div>
            )}
            {/* The reference's row of empty slots. Furniture, and honest about
                it: there is nothing to put in them. */}
            <div aria-hidden="true" className="flex flex-wrap gap-1 px-2 pt-2 border-t border-nier-150">
                {Array.from({ length: 11 }, (_, i) => (
                    <span key={i} className="h-2 w-2 border border-nier-text-dark/40 mt-2" />
                ))}
            </div>
            {/* The self-diagnostic, and a real one: it reads NO ERROR because
                it is capable of reading something else. The message itself
                stays above the cards, where it is next to what failed; this
                is the standing indicator that something did. */}
            <p className={`text-[10px] uppercase tracking-[0.3em] text-center py-4 ${
                error ? 'text-nier-text-dark' : 'text-nier-text-dark/50'
            }`}>
                {error ? 'Error' : 'No Error'}
            </p>
        </div>
    );
};

/** A Review's identity on this screen. Slug alone is not one: two Categories
 *  can hold the same slug. */
const keyOf = (review: Review) => `${review.type}-${review.slug}`;

/**
 * What the caption bar says — about the selection, or about the folder when
 * there is no selection, which on a touch device is always.
 */
const captionFor = (review: Review | undefined, error: string | null, waitingOn: Review[]): string => {
    if (error) return error;
    if (!review) {
        if (waitingOn.length === 0) return "Nothing on the backlog.";
        const oldest = daysWaiting(waitingOn[0]._id);
        return oldest !== undefined
            ? `${waitingOn.length} unfinished — longest waiting ${oldest} days`
            : `${waitingOn.length} unfinished`;
    }
    const waiting = daysWaiting(review._id);
    const state = review.status === 'active' ? 'started' : 'not started';
    return waiting !== undefined
        ? `${review.title} — ${state}, waiting ${waiting} days`
        : `${review.title} — ${state}`;
};

const BacklogWindow = ({ onClose }: Props) => {
    const { reviews } = useReviews();
    // No signal to wait on: this window mounts well after boot, from a folder
    // icon on the Desktop. No decoded title and no card grid either, so its
    // whole entrance is the frame arriving with its chrome a beat behind.
    const scope = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => {
        wipe(tl, '[data-panel-surface]');
        fade(tl, '[data-window-chrome]', '<0.2');
    }, scope);

    // The shelves themselves. Their own timeline and their own readiness,
    // because the cards arrive with the collection rather than with the frame
    // — a timeline built at mount would address nothing, and go on addressing
    // nothing once they turned up.
    const shelvesScope = useRef<HTMLDivElement>(null);
    useRevealTimeline(reviews.length > 0, (tl) => {
        domino(tl, '[data-backlog-shelf] > li');
    }, shelvesScope, [reviews.length > 0]);
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLElement>();

    const [error, setError] = useState<string | null>(null);
    const [justFinished, setJustFinished] = useState<string | null>(null);
    const [editing, setEditing] = useState<Review | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    // Two Categories can hold the same slug — a game and a film of it — and
    // the cards key on both, so selection has to as well.
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

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
    // No fallback to the first card. Selection here means "what the pointer is
    // on", and defaulting drew one card highlighted and described it in the
    // caption before anything had been touched — which on a phone, where
    // there is no pointer to move, is the only thing it would ever say.
    const selected = listed.find(review => keyOf(review) === selectedKey);

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
        onSelect: (review: Review) => setSelectedKey(keyOf(review)),
    };

    return (
        <>
        <Panel
            wrapperRef={scope}
            className="bg-nier-100 border border-nier-150"
            style={maxHeight ? { maxHeight } : undefined}
            frameRef={panelRef}
        >
                <div data-window-chrome className="h-10 bg-nier-150 flex items-center justify-between px-5 flex-shrink-0">
                    <h3 className="text-nier-text-dark text-xl uppercase tracking-wider">Backlog</h3>
                    <button
                        onClick={onClose}
                        aria-label="Close backlog"
                        className="text-sm px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter leading-none"
                    >✕</button>
                </div>

                <div data-window-chrome ref={shelvesScope} className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">

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
                            <State started={started} notStarted={unstarted} error={error !== null} />
                        </div>
                    </div>
                </div>

                {/* The caption bar. Says what is under the pointer, and carries
                    the fault as well, because the state column is desktop-only
                    and a phone would otherwise be told nothing. */}
                <div data-window-chrome className="flex-shrink-0 border-t border-nier-150 flex items-center gap-3 px-4 py-2">
                    <span aria-hidden="true" className="w-1 h-5 bg-nier-dark flex-shrink-0" />
                    <p className="text-xs uppercase tracking-wide truncate text-nier-text-dark/70">
                        {captionFor(selected, error, listed)}
                    </p>
                </div>
        </Panel>

        {/* The heavier fields, asked for at the stage that needs them
            (story 2) — the same editor the Reviews window uses. */}
        <ReviewModal
            isOpen={editorOpen}
            setIsOpen={setEditorOpen}
            onReviewAdded={() => { invalidateReviews(); setEditing(null); }}
            editingReview={editing}
        />
        </>
    );
};

export default BacklogWindow;
