import { useState, useRef } from "react";
import { useReviews, invalidateReviews } from "../../../store/reviews";
import { PieChart } from "./pieChart";
import { BarChart } from "./barChart";
import { ReviewPanel } from "./ReviewPanel";
import { ReviewModal } from "./ReviewPanel/ReviewModal";
import { useRevealTimeline } from "../../../hooks/useRevealTimeline";
import { fade, wipe } from "../../../utils/motion";
import { usePanelHeight } from "../../../hooks/usePanelHeight";
import { Panel } from "../../../components/common/Panel";

type Props = {
    onClose: () => void;
};

const ReviewsWindow = ({ onClose }: Props) => {
    const { reviews }                 = useReviews();
    const [editingReview, setEditingReview] = useState<any>(null);
    const [modalOpen, setModalOpen]   = useState(false);
    // No signal to wait on: this window only ever mounts well after boot is
    // done — the user has to open System, then click a folder icon — and
    // Desktop's conditional render gives it a fresh mount each time. It has no
    // decoded title and no card grid, so its whole entrance is the frame
    // arriving with its chrome a beat behind.
    const scope = useRef<HTMLDivElement>(null);
    useRevealTimeline(true, (tl) => {
        wipe(tl, '[data-panel-surface]');
        fade(tl, '[data-window-chrome]', '<0.2');
    }, scope);
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLElement>();

    return (
        <>
        <Panel
            wrapperRef={scope}
            className="bg-nier-100 border border-nier-150"
            style={maxHeight ? { maxHeight } : undefined}
            frameRef={panelRef}
        >
                <div data-window-chrome className="h-10 bg-nier-150 flex items-center justify-between px-5 flex-shrink-0">
                    <h3 className="text-nier-text-dark text-xl uppercase tracking-wider">Reviews</h3>
                    <button
                        onClick={onClose}
                        className="text-sm px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter leading-none"
                    >
                        ✕
                    </button>
                </div>
                <div data-window-chrome className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">

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
