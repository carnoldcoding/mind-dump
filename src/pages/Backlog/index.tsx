// Everything unfinished, across every Category at once — the shelf you browse
// when you've just finished something and want to know what's next.
//
// Membership is derived from Status, never stored: a Review joins the moment
// it's captured and leaves only when it goes `done`. Starting something does
// not take it off, which is why in-progress Reviews appear here *and* on Now
// (ADR-0004). Read-only, like every public page.

import { useMemo, useState } from "react";
import { Link } from "react-router";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { useReviews, type Review } from "../../store/reviews";
import { reviewPath } from "../../utils/categories";
import { useStageState } from "../../context/BootSequenceContext";
import { usePanelReveal, panelStageIndex } from "../../hooks/usePanelReveal";
import { enterClass } from "../../utils/animations";

const CATEGORY_FILTERS = [
    { key: null, label: "All" },
    { key: "game", label: "Games" },
    { key: "cinema", label: "Cinema" },
    { key: "book", label: "Books" },
] as const;

/** The Backlog is exactly the Reviews that aren't finished. */
const isUnfinished = (review: Review): boolean =>
    review.status === 'todo' || review.status === 'active';

const BacklogRow = ({ review }: { review: Review }) => (
    <li>
        <Link
            to={reviewPath(review)}
            className="flex items-center gap-3 px-3 py-2 bg-nier-150/60 hover:bg-nier-dark group transition-colors duration-150"
        >
            <div className="h-4 w-4 bg-nier-dark group-hover:bg-nier-text-light flex-shrink-0" />
            <p className="text-lg leading-none flex-1 truncate group-hover:text-nier-text-light">
                {review.title}
            </p>
            <span className="text-xs uppercase tracking-wide text-nier-text-dark/40 group-hover:text-nier-text-light/60 flex-shrink-0">
                {review.type}
            </span>
        </Link>
    </li>
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
                                <section className="flex flex-col gap-3" aria-label="Started">
                                    <h2 className="text-2xl uppercase tracking-wide">Started</h2>
                                    <ul className="flex flex-col gap-2" aria-label="Started">
                                        {started.map(review => (
                                            <BacklogRow key={review.slug} review={review} />
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {unstarted.length > 0 && (
                                <section className="flex flex-col gap-3" aria-label="Not Started">
                                    <h2 className="text-2xl uppercase tracking-wide">Not Started</h2>
                                    <ul className="flex flex-col gap-2" aria-label="Not Started">
                                        {unstarted.map(review => (
                                            <BacklogRow key={review.slug} review={review} />
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </>
                    )}

                </article>
            </div>
        </>
    );
};

export default Backlog;
