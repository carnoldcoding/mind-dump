import { useState, useRef } from "react";
import { useReviews, invalidateReviews } from "../../../store/reviews";
import { PieChart } from "./pieChart";
import { BarChart } from "./barChart";
import { ReviewPanel } from "./ReviewPanel";
import { ReviewModal } from "./ReviewPanel/ReviewModal";
import { useRevealTimeline } from "../../../hooks/useRevealTimeline";
import { cascade, wipe } from "../../../utils/motion";
import { usePanelHeight } from "../../../hooks/usePanelHeight";
import { Panel } from "../../../components/common/Panel";

type Props = {
    onClose: () => void;
};

const ReviewsWindow = ({ onClose }: Props) => {
    const { reviews }                 = useReviews();
    const [editingReview, setEditingReview] = useState<any>(null);
    const [modalOpen, setModalOpen]   = useState(false);
    // The frame Wipes as stable chrome; the window then Cascades so nothing
    // arrives un-animated (ADR-0012). The review grid inside carries
    // data-reveal-own and Dominoes on its own timeline, so the Cascade steps over
    // it. Keyed on the collection size so the charts and chrome re-cascade once
    // the reviews land.
    const scope = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => {
        wipe(tl, '[data-panel-surface]');
    }, scope);
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLElement>();
    useRevealTimeline(true, (tl) => {
        if (panelRef.current) cascade(tl, panelRef.current, 0.15);
    }, scope, [reviews.length]);

    return (
        <>
        <Panel
            wrapperRef={scope}
            className="bg-nier-100 border border-nier-150"
            style={maxHeight ? { maxHeight } : undefined}
            frameRef={panelRef}
        >
                <div className="h-10 bg-nier-150 flex items-center justify-between px-5 flex-shrink-0">
                    <h3 data-window-title className="text-nier-text-dark text-title uppercase tracking-wider">Reviews</h3>
                    <button
                        onClick={onClose}
                        className="text-body px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter leading-none"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">

                    {/* Charts read the whole collection, deliberately:
                        narrowing the list below should not narrow the sense of
                        what the collection is (story 18). */}
                    <div className="flex gap-4 relative z-1 flex-col md:flex-row">
                        <PieChart data={reviews} />
                        <BarChart data={reviews} />
                    </div>
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
