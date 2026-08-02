// Everything unfinished, across every Category at once — the shelf you browse
// when you've just finished something and want to know what's next.
//
// Membership is derived from Status, never stored: a Review joins the moment
// it's captured and leaves only when it goes `done`. Starting something does
// not take it off, which is why in-progress Reviews appear here *and* on Now
// (ADR-0004). Read-only, like every public page.

import { useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { ReviewCard } from "../../components/review/ReviewCard";
import { useReviews, isUnfinished, type Review } from "../../store/reviews";
import { CATEGORIES } from "../../utils/categories";
import { useStageState } from "../../context/BootSequenceContext";
import { usePanelReveal, panelStageIndex } from "../../hooks/usePanelReveal";
import { enterClass } from "../../utils/animations";

// Derived from the one Category table, so a fourth Category appears here
// without this file being touched. Labels are this surface's own.
const CATEGORY_FILTERS: { key: string | null; label: string }[] = [
    { key: null, label: "All" },
    ...CATEGORIES.map(c => ({
        key: c.type as string,
        label: c.path.charAt(0).toUpperCase() + c.path.slice(1),
    })),
];

/**
 * A shelf section. Started work leads in its own grid and is framed to say so,
 * because the overlap with Now has to read as deliberate rather than as
 * duplication (story 7).
 */
const Shelf = ({ label, items, marked = false }: {
    label: string;
    items: Review[];
    marked?: boolean;
}) => (
    <section className="flex flex-col gap-3">
        <h2 className="text-2xl uppercase tracking-wide">
            {label} <span className="text-nier-text-dark/40 text-lg">· {items.length}</span>
        </h2>
        <ul
            aria-label={label}
            className={`grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${
                marked ? '[&>li]:ring-1 [&>li]:ring-nier-dark/40 [&>li]:ring-offset-2 [&>li]:ring-offset-nier-100' : ''
            }`}
        >
            {items.map(review => (
                <li key={`${review.type}-${review.slug}`}>
                    <ReviewCard review={review} caption={review.type} />
                </li>
            ))}
        </ul>
    </section>
);

const Backlog = () => {
    const { reviews, loading, error } = useReviews();
    const [category, setCategory] = useState<string | null>(null);
    const { active: contentActive } = useStageState('header');
    const panelStage = usePanelReveal(contentActive);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');

    const unfinished = useMemo(
        () => reviews
            .filter(isUnfinished)
            .filter(review => category === null || review.type === category),
        [reviews, category],
    );

    // Started and unstarted are separated rather than badged, so the overlap
    // with Now reads as deliberate at a glance (story 7).
    const started = useMemo(() => unfinished.filter(r => r.status === 'active'), [unfinished]);
    const unstarted = useMemo(() => unfinished.filter(r => r.status === 'todo'), [unfinished]);

    if (loading) return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2">
            <Loader />
        </div>
    );
    if (error) return <div>Error: Network error</div>;

    return (
        <>
            <PageHeader name="BACKLOG" />
            <div className={`mt-5 relative ${contentActive ? '' : 'invisible'}`}>
                <aside className={`absolute w-full h-full bg-nier-shadow top-1 left-1 ${enterClass('nier-enter')}`} />
                <article className={`relative bg-nier-100 p-4 flex flex-col gap-6 ${enterClass('nier-enter')} ${contentReady ? '' : 'invisible'}`}>

                    <div className="flex gap-1 flex-wrap" role="group" aria-label="Filter by Category">
                        {CATEGORY_FILTERS.map(({ key, label }) => (
                            <button
                                key={key ?? 'all'}
                                onClick={() => setCategory(key)}
                                aria-pressed={category === key}
                                className={`px-3 py-1 text-sm cursor-pointer transition-colors duration-150 ${
                                    category === key
                                        ? 'bg-nier-dark text-nier-text-light'
                                        : 'bg-nier-150/60 hover:bg-nier-150'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {unfinished.length === 0 ? (
                        <p className="text-nier-text-dark/50">Nothing unfinished here.</p>
                    ) : (
                        <>
                            {started.length > 0 && (
                                <Shelf label="Started" items={started} marked />
                            )}
                            {unstarted.length > 0 && (
                                <Shelf label="Not Started" items={unstarted} />
                            )}
                        </>
                    )}

                </article>
            </div>
        </>
    );
};

export default Backlog;
