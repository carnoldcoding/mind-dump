import { useState } from "react";
import { useReviews, invalidateReviews } from "../../../store/reviews";
import { PieChart } from "./pieChart";
import { BarChart } from "./barChart";
import { ReviewPanel } from "./ReviewPanel";
import { ReviewModal } from "./ReviewPanel/ReviewModal";
import { usePanelReveal, panelStageIndex } from "../../../hooks/usePanelReveal";
import { usePanelHeight } from "../../../hooks/usePanelHeight";
import { enterClass } from "../../../utils/animations";

type Props = {
    onClose: () => void;
};

const ReviewsWindow = ({ onClose }: Props) => {
    const { reviews }                 = useReviews();
    const [editingReview, setEditingReview] = useState<any>(null);
    const [modalOpen, setModalOpen]   = useState(false);
    // Always ready=true — this window only ever mounts well after boot is
    // done (user has to open System, then click a folder icon), and the
    // conditional render in Desktop.tsx already gives it a fresh mount
    // each time it's opened, so no resetKey is needed either.
    const panelStage = usePanelReveal(true);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLDivElement>();

    return (
        <div className="relative">
            {/* Sibling of the panel div, not a child — see Review/index.tsx
                for why: a transform on the panel would trap a child shadow
                in the wrong stacking context. */}
            <aside className={`absolute w-full h-full bg-nier-shadow top-1 left-1 ${enterClass('nier-enter')}`} />
            <div
                    ref={panelRef}
                    style={maxHeight ? { maxHeight } : undefined}
                    className={`nier-panel-frame relative bg-nier-100 border border-nier-150 flex flex-col ${enterClass('nier-enter')}`}
                >
                <div className={`h-10 bg-nier-150 flex items-center justify-between px-5 flex-shrink-0 ${contentReady ? '' : 'invisible'}`}>
                    <h3 className="text-nier-text-dark text-xl uppercase tracking-wider">Reviews</h3>
                    <button
                        onClick={onClose}
                        className="text-sm px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter leading-none"
                    >
                        ✕
                    </button>
                </div>
                <div className={`p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0 ${contentReady ? '' : 'invisible'}`}>

                    {/* Charts read the whole collection, deliberately:
                        narrowing the list below should not narrow the sense of
                        what the collection is (story 18). */}
                    <div className="flex gap-4 relative z-1 flex-col md:flex-row">
                        <PieChart data={reviews} />
                        <BarChart data={reviews} />
                    </div>
                    <ReviewPanel />
                </div>
            </div>

            <ReviewModal
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                onReviewAdded={() => { invalidateReviews(); setEditingReview(null); }}
                editingReview={editingReview}
            />
        </div>
    );
};

export default ReviewsWindow;
