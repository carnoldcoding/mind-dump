// The front page: what is being played, watched and read at this moment. The
// only view that answers "where am I" rather than "what do I have" — see
// CONTEXT.md and ADR-0003.
//
// In progress leads as heroes, because it is the reason the page exists. What
// is queued and what was finished follow as rails: present, browsable, and
// visibly secondary. On a phone the heroes sit two to a row so that a typical
// two or three things on the go are all above the fold.

import { useMemo } from "react";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { ReviewCard } from "../../components/review/ReviewCard";
import { useReviews, type Review } from "../../store/reviews";
import { byNewestCompleted } from "../../utils/completionDate";
import { useStageState } from "../../context/BootSequenceContext";
import { usePanelReveal, panelStageIndex } from "../../hooks/usePanelReveal";
import { useDecodeText } from "../../hooks/useDecodeText";
import { usePanelHeight } from "../../hooks/usePanelHeight";
import { enterClass } from "../../utils/animations";

// How many queued Reviews the up-next rail shows before handing off to the
// Backlog, and how many finished ones the last rail carries.
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

/**
 * A sideways rail. Scrolls rather than wrapping, so a secondary band can never
 * grow tall enough to take the page over from the heroes above it.
 */
const Rail = ({ children }: { children: React.ReactNode }) => (
    <ul className="flex gap-3 overflow-x-auto pb-1 [&>li]:w-32 [&>li]:sm:w-36 [&>li]:flex-shrink-0">
        {children}
    </ul>
);

// Absence, not falsiness — a finished thing rated 0 was rated.
const finishedCaption = (review: Review): string | undefined =>
    review.rating != null ? `${review.rating} ★` : undefined;

const Now = () => {
    const { reviews, loading, error } = useReviews();
    const { active: contentActive } = useStageState('header');
    const panelStage = usePanelReveal(contentActive);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');
    const decodedPanelTitle = useDecodeText('NOW VIEW PANEL', contentReady);
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLElement>();

    // Flattened rather than kept in per-activity sections: the heroes lay out
    // as one grid so everything in progress is in view at once, and each card
    // says which activity it is rather than sitting under a heading.
    const inProgress = useMemo(
        () => ACTIVITIES.flatMap(activity =>
            reviews
                .filter(r => r.status === 'active' && r.type === activity.type)
                .map(review => ({ review, label: activity.label })),
        ),
        [reviews],
    );

    const queued = useMemo(() => reviews.filter(r => r.status === 'todo'), [reviews]);

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
                {/* A window, not a document: the frame takes the room that is
                    actually there and the contents scroll inside it. 42rem is
                    the most it wants; the cap is what is left below it. */}
                <article
                    ref={panelRef}
                    style={maxHeight ? { maxHeight } : undefined}
                    className={`relative bg-nier-100 flex flex-col h-[42rem] ${enterClass('nier-enter')} ${contentReady ? '' : 'invisible'}`}
                >
                    <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5 flex-shrink-0">
                        <h3 className={`text-nier-text-dark text-xl uppercase ${contentReady ? '' : 'invisible'}`}>{decodedPanelTitle}</h3>
                    </div>

                    <div className="p-4 flex flex-col gap-8 overflow-y-auto flex-1">

                        <Band title="In Progress">
                            {inProgress.length === 0
                                ? <p className="text-nier-text-dark/50">Nothing in progress.</p>
                                : (
                                    // Two per row on a phone, so a typical two or
                                    // three fit above the fold (story 3). Wider
                                    // screens give each hero more room rather than
                                    // more neighbours.
                                    <ul className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        {inProgress.map(({ review, label }) => (
                                            <li key={`${review.type}-${review.slug}`}>
                                                <ReviewCard review={review} caption={label} />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </Band>

                        <Band title="Up Next">
                            {queued.length === 0
                                ? <p className="text-nier-text-dark/50">Nothing queued up.</p>
                                : (
                                    <Rail>
                                        {queued.slice(0, UP_NEXT_CAP).map(review => (
                                            <li key={`${review.type}-${review.slug}`}>
                                                <ReviewCard review={review} caption="Queued" />
                                            </li>
                                        ))}
                                    </Rail>
                                )}
                        </Band>

                        <Band title="Recently Finished">
                            {recentlyFinished.length === 0
                                ? <p className="text-nier-text-dark/50">Nothing finished yet.</p>
                                : (
                                    <Rail>
                                        {recentlyFinished.map(review => (
                                            <li key={`${review.type}-${review.slug}`}>
                                                <ReviewCard review={review} caption={finishedCaption(review)} />
                                            </li>
                                        ))}
                                    </Rail>
                                )}
                        </Band>
                    </div>

                </article>
            </div>
        </>
    );
};

export default Now;
