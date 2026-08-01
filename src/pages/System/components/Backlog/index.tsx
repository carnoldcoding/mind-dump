// The System folder that owns unfinished work: capture, grooming, deletion,
// and the todo → active → done transitions (ADR-0004).
//
// Capture asks for a title and a Category and nothing else. Everything heavier
// — critique, rating, screenshots — belongs to the Reviews window, which a
// Review reaches by being finished here.

import { useMemo, useState } from "react";
import { backend } from "../../../../api/backend";
import { useReviews, invalidateReviews, type Review } from "../../../../store/reviews";
import { todayIso } from "../../../../utils/completionDate";
import { generateSlug } from "../../../../utils/categories";
import { usePanelReveal, panelStageIndex } from "../../../../hooks/usePanelReveal";
import { enterClass } from "../../../../utils/animations";
import { TextField } from "../../../../components/common/TextField";
import { SelectField } from "../../../../components/common/SelectField";
import { Button } from "../../../../components/common/Button";

type Props = {
    onClose: () => void;
};

const CATEGORY_OPTIONS = ['game', 'cinema', 'book'];

const TYPE_ICON: Record<string, string> = {
    game: 'game-controller-sharp',
    cinema: 'videocam-sharp',
    book: 'book-sharp',
};

const BacklogWindow = ({ onClose }: Props) => {
    const { reviews } = useReviews();
    const panelStage = usePanelReveal(true);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');

    const [title, setTitle] = useState('');
    const [type, setType] = useState('game');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [justFinished, setJustFinished] = useState<string | null>(null);

    const unfinished = useMemo(
        () => reviews.filter(r => r.status === 'todo' || r.status === 'active'),
        [reviews],
    );
    const started = useMemo(() => unfinished.filter(r => r.status === 'active'), [unfinished]);
    const unstarted = useMemo(() => unfinished.filter(r => r.status === 'todo'), [unfinished]);

    // Story 3: knowing whether it's already in there is the question worth
    // answering before capturing, so it's answered against the whole
    // collection rather than only the unfinished part.
    const slug = generateSlug(title);
    const duplicate = slug
        ? reviews.find(r => r.slug === slug || r.title.toLowerCase() === title.trim().toLowerCase())
        : undefined;

    const capture = async () => {
        if (!title.trim() || duplicate) return;
        setSaving(true);
        setError(null);
        try {
            // One Review, Status queued. Not a new kind of document, and
            // nothing gets promoted or copied later (ADR-0004).
            await backend.saveReview({ title: title.trim(), slug, type, status: 'todo' }, false);
            setTitle('');
            invalidateReviews();
        } catch {
            setError('Network error');
        } finally {
            setSaving(false);
        }
    };

    const setStatus = async (review: Review, status: string) => {
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

    const Row = ({ review }: { review: Review }) => (
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
                        onClick={() => setStatus(review, 'active')}
                        className="text-xs uppercase tracking-wide px-2 py-1 bg-nier-150/60 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer"
                    >Start</button>
                )}
                {review.status === 'active' && (
                    <button
                        onClick={() => setStatus(review, 'done')}
                        className="text-xs uppercase tracking-wide px-2 py-1 bg-nier-150/60 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer"
                    >Finish</button>
                )}
                <button
                    onClick={() => remove(review)}
                    aria-label={`Remove ${review.title}`}
                    className="text-xs uppercase tracking-wide px-2 py-1 bg-nier-150/60 hover:bg-nier-dark hover:text-nier-text-light cursor-pointer"
                >Remove</button>
            </div>
        </li>
    );

    const Shelf = ({ label, items }: { label: string; items: Review[] }) => (
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
                            {items.map(review => <Row key={review.slug} review={review} />)}
                        </ul>
                    )}
            </div>
        </div>
    );

    return (
        <div className="relative">
            <aside className={`absolute w-full h-full bg-nier-shadow top-1 left-1 ${enterClass('nier-enter')}`} />
            <div className={`relative bg-nier-100 border border-nier-150 ${enterClass('nier-enter')}`}>
                <div className={`h-10 bg-nier-150 flex items-center justify-between px-5 ${contentReady ? '' : 'invisible'}`}>
                    <h3 className="text-nier-text-dark text-xl uppercase tracking-wider">Backlog</h3>
                    <button
                        onClick={onClose}
                        aria-label="Close backlog"
                        className="text-sm px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter leading-none"
                    >✕</button>
                </div>

                <div className={`p-4 flex flex-col gap-4 ${contentReady ? '' : 'invisible'}`}>

                    {/* Capture. Stacks on narrow screens so it stays usable
                        one-handed on the device you're holding when the
                        thought occurs (story 20). */}
                    <div className="relative">
                        <aside className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
                        <div className="w-full bg-nier-100-lighter relative">
                            <div className="h-7 w-full bg-nier-150 flex items-center px-2">
                                <h3 className="text-nier-text-dark text-sm">Capture</h3>
                            </div>
                            <div className="p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
                                <div className="flex-1">
                                    <TextField label="Title" value={title} onChange={setTitle} />
                                </div>
                                <div className="sm:w-40">
                                    <SelectField
                                        label="Category"
                                        value={type}
                                        options={CATEGORY_OPTIONS}
                                        onChange={setType}
                                    />
                                </div>
                                <div className="sm:w-32 h-12">
                                    <Button
                                        label={saving ? 'Saving…' : 'Capture'}
                                        type="primary"
                                        handleClick={capture}
                                    />
                                </div>
                            </div>
                            {duplicate && (
                                <p className="px-3 pb-3 text-sm text-nier-text-dark/70">
                                    Already captured: {duplicate.title} ({duplicate.status})
                                </p>
                            )}
                        </div>
                    </div>

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

                    <Shelf label="Started" items={started} />
                    <Shelf label="Not Started" items={unstarted} />
                </div>
            </div>
        </div>
    );
};

export default BacklogWindow;
