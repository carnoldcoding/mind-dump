import { useState, useRef } from "react";
import { useReviews, invalidateReviews } from "../../../store/reviews";
import { ReviewPanel } from "./ReviewPanel";
import { ReviewModal } from "./ReviewPanel/ReviewModal";
import { useRevealTimeline } from "../../../hooks/useRevealTimeline";
import { cascade, wipe } from "../../../utils/motion";
import { Panel } from "../../../components/common/Panel";

// Runs as a tab on the SYSTEM.OS desktop: the Desktop owns the frame chrome and
// the close control, so this window carries no title bar of its own and fills
// the content area it is given.
const ReviewsWindow = () => {
    const { reviews }                       = useReviews();
    const [editingReview, setEditingReview] = useState<any>(null);
    const [modalOpen, setModalOpen]         = useState(false);
    // The frame Wipes as stable chrome; the window then Cascades so nothing
    // arrives un-animated (ADR-0012). The review list inside carries
    // data-reveal-own and Dominoes on its own timeline, so the Cascade steps over
    // it. Keyed on the collection size so the chrome re-cascades once reviews land.
    const scope = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => {
        wipe(tl, '[data-panel-surface]');
    }, scope);
    const panelRef = useRef<HTMLElement>(null);
    useRevealTimeline(true, (tl) => {
        if (panelRef.current) cascade(tl, panelRef.current, 0.15);
    }, scope, [reviews.length]);

    return (
        <>
        <Panel
            wrapperRef={scope}
            wrapperClassName="h-full"
            className="bg-nier-100 border border-nier-150 h-full"
            frameRef={panelRef}
        >
                {/* One panel, no charts: Reviews is a single content surface like
                    Backlog and Body. The collection's shape used to show as a pie
                    and a bar here; that signal, if wanted, returns later as a slim
                    readout in the Backlog grammar rather than as charts. */}
                <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">
                    <ReviewPanel />
                </div>
        </Panel>

        <ReviewModal
            isOpen={modalOpen}
            setIsOpen={setModalOpen}
            onReviewAdded={() => { invalidateReviews(); setEditingReview(null); }}
            editingReview={editingReview}
        />
        </>
    );
};

export default ReviewsWindow;
