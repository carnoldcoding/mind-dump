// The front page: what is being played, watched and read at this moment. The
// only view that answers "where am I" rather than "what do I have" — see
// CONTEXT.md and ADR-0003.

import { useMemo } from "react";
import { Link } from "react-router";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { useReviews, type Review } from "../../store/reviews";
import { byNewestCompleted } from "../../utils/completionDate";
import { reviewPath } from "../../utils/categories";
import { useStageState } from "../../context/BootSequenceContext";
import { usePanelReveal, panelStageIndex } from "../../hooks/usePanelReveal";
import { enterClass } from "../../utils/animations";

// How many queued Reviews the up-next band shows before handing off to the
// Backlog, and how many finished ones the last band carries.
const UP_NEXT_CAP = 5;
const RECENTLY_FINISHED_CAP = 5;

// Grouped by what you're doing with it, not by what kind of thing it is —
// "playing" and "reading" are different activities (story 2). The addresses
// these map to live in utils/categories.
const ACTIVITIES = [
    { type: "game", label: "PLAYING" },
    { type: "cinema", label: "WATCHING" },
    { type: "book", label: "READING" },
] as const;

const ReviewRow = ({ review, trailing }: { review: Review; trailing?: string }) => (
    <li>
        <Link
            to={reviewPath(review)}
            className="flex items-center gap-3 px-3 py-2 bg-nier-150/60 hover:bg-nier-dark group transition-colors duration-150"
        >
            <div className="h-4 w-4 bg-nier-dark group-hover:bg-nier-text-light flex-shrink-0" />
            <p className="text-lg leading-none flex-1 truncate group-hover:text-nier-text-light">
                {review.title}
            </p>
            {trailing && (
                <span className="text-sm text-nier-text-dark/50 group-hover:text-nier-text-light/70 flex-shrink-0">
                    {trailing}
                </span>
            )}
        </Link>
    </li>
);

const Band = ({ title, action, children }: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) => (
    <section className="flex flex-col gap-3" aria-label={title}>
        <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl uppercase tracking-wide">{title}</h2>
            {action}
        </div>
        {children}
    </section>
);

const Now = () => {
    const { reviews, loading, error } = useReviews();
    const { active: contentActive } = useStageState('header');
    const panelStage = usePanelReveal(contentActive);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');

    const inProgress = useMemo(
        () => ACTIVITIES
            .map(activity => ({
                ...activity,
                items: reviews.filter(r => r.status === 'active' && r.type === activity.type),
            }))
            .filter(activity => activity.items.length > 0),
        [reviews],
    );

    const queued = useMemo(
        () => reviews.filter(r => r.status === 'todo'),
        [reviews],
    );

    const recentlyFinished = useMemo(
        () => reviews
            .filter(r => r.status === 'done')
            .sort(byNewestCompleted)
            .slice(0, RECENTLY_FINISHED_CAP),
        [reviews],
    );

    if (loading) return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2">
            <Loader />
        </div>
    );
    if (error) return <div>Error: Network error</div>;

    return (
        <>
            <PageHeader name="NOW" />
            <div className={`mt-5 relative ${contentActive ? '' : 'invisible'}`}>
                <aside className={`absolute w-full h-full bg-nier-shadow top-1 left-1 ${enterClass('nier-enter')}`} />
                <article className={`relative bg-nier-100 p-4 flex flex-col gap-8 ${enterClass('nier-enter')} ${contentReady ? '' : 'invisible'}`}>

                    <Band title="In Progress">
                        {inProgress.length === 0
                            ? <p className="text-nier-text-dark/50">Nothing in progress.</p>
                            : (
                                <div className="flex flex-col gap-5">
                                    {inProgress.map(activity => (
                                        <div key={activity.type} className="flex flex-col gap-2">
                                            <h3 className="text-sm uppercase tracking-wide text-nier-text-dark/50">
                                                {activity.label}
                                            </h3>
                                            <ul className="flex flex-col gap-2" aria-label={activity.label}>
                                                {activity.items.map(review => (
                                                    <ReviewRow key={`${review.type}-${review.slug}`} review={review} />
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                    </Band>

                    <Band
                        title="Up Next"
                        action={
                            // A doorway rather than a dead end (story 5), and
                            // one that stays open when nothing is queued: the
                            // Backlog is everything unfinished, so it holds the
                            // in-progress Reviews too (CONTEXT.md). Counting
                            // the queued ones here would understate it.
                            //
                            // The Backlog route itself is issue #20.
                            <Link to="/backlog" className="text-sm uppercase tracking-wide underline hover:text-nier-text-dark/60">
                                Open Backlog
                            </Link>
                        }
                    >
                        {queued.length === 0
                            ? <p className="text-nier-text-dark/50">Nothing queued up.</p>
                            : (
                                <ul className="flex flex-col gap-2" aria-label="Up Next">
                                    {queued.slice(0, UP_NEXT_CAP).map(review => (
                                        <ReviewRow key={`${review.type}-${review.slug}`} review={review} />
                                    ))}
                                </ul>
                            )}
                    </Band>

                    <Band title="Recently Finished">
                        {recentlyFinished.length === 0
                            ? <p className="text-nier-text-dark/50">Nothing finished yet.</p>
                            : (
                                <ul className="flex flex-col gap-2" aria-label="Recently Finished">
                                    {recentlyFinished.map(review => (
                                        <ReviewRow
                                            key={`${review.type}-${review.slug}`}
                                            review={review}
                                            // Absence, not falsiness — a
                                            // finished thing rated 0 was rated.
                                            trailing={review.rating != null ? `${review.rating} ★` : undefined}
                                        />
                                    ))}
                                </ul>
                            )}
                    </Band>

                </article>
            </div>
        </>
    );
};

export default Now;
