import { useEffect, useState } from "react";
import { backend } from "../../../api/backend";
import { PieChart } from "./pieChart";
import { BarChart } from "./barChart";
import { ReviewPanel } from "./ReviewPanel";
import { ReviewModal } from "./ReviewPanel/ReviewModal";
import { usePanelReveal, panelStageIndex } from "../../../hooks/usePanelReveal";
import { enterClass } from "../../../utils/animations";

const TYPE_ICON: Record<string, string> = {
    game:   'game-controller-sharp',
    cinema: 'videocam-sharp',
    book:   'book-sharp',
};

type Props = {
    onClose: () => void;
};

const ReviewsWindow = ({ onClose }: Props) => {
    const [posts, setPosts]           = useState<any[]>([]);
    const [editingReview, setEditingReview] = useState<any>(null);
    const [modalOpen, setModalOpen]   = useState(false);
    // Always ready=true — this window only ever mounts well after boot is
    // done (user has to open System, then click a folder icon), and the
    // conditional render in Desktop.tsx already gives it a fresh mount
    // each time it's opened, so no resetKey is needed either.
    const panelStage = usePanelReveal(true);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');

    const fetchPosts = async () => {
        try {
            setPosts(await backend.getReviews());
        } catch {
            // network error — posts stay empty
        }
    };

    useEffect(() => { fetchPosts(); }, []);

    const activePosts = posts
        .filter(p => p.status?.toLowerCase() === 'active')
        .sort((a, b) => parseInt(b._id.substring(0, 8), 16) - parseInt(a._id.substring(0, 8), 16));

    const openEdit = (post: any) => {
        setEditingReview(post);
        setModalOpen(true);
    };

    return (
        <div className="relative">
            {/* Sibling of the panel div, not a child — see Review/index.tsx
                for why: a transform on the panel would trap a child shadow
                in the wrong stacking context. */}
            <aside className={`absolute w-full h-full bg-nier-shadow top-1 left-1 ${enterClass('nier-enter')}`} />
            <div className={`relative bg-nier-100 border border-nier-150 ${enterClass('nier-enter')}`}>
                <div className={`h-10 bg-nier-150 flex items-center justify-between px-5 ${contentReady ? '' : 'invisible'}`}>
                    <h3 className="text-nier-text-dark text-xl uppercase tracking-wider">Reviews</h3>
                    <button
                        onClick={onClose}
                        className="text-sm px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter leading-none"
                    >
                        ✕
                    </button>
                </div>
                <div className={`p-4 flex flex-col gap-4 ${contentReady ? '' : 'invisible'}`}>

                    {/* In-progress strip */}
                    {activePosts.length > 0 && (
                        <div className="relative">
                            <aside className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
                            <div className="w-full bg-nier-100-lighter relative">
                                <div className="h-7 w-full bg-nier-150 flex items-center px-2">
                                    <h3 className="text-nier-text-dark text-sm">In Progress ({activePosts.length})</h3>
                                </div>
                                <ul className="flex flex-col divide-y divide-nier-150/40">
                                    {activePosts.map(post => (
                                        <li key={post._id}>
                                            <button
                                                onClick={() => openEdit(post)}
                                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-nier-150/40 transition-colors cursor-pointer group"
                                            >
                                                <ion-icon
                                                    name={TYPE_ICON[post.type] ?? 'document-sharp'}
                                                    style={{ flexShrink: 0, opacity: 0.4, fontSize: '14px' }}
                                                ></ion-icon>
                                                <span className="text-sm uppercase tracking-wide text-nier-text-dark truncate flex-1 text-left">
                                                    {post.title}
                                                </span>
                                                {post.genres?.slice(0, 2).map((g: string) => (
                                                    <span key={g} className="text-[10px] uppercase tracking-wide text-nier-text-dark/40 hidden sm:block shrink-0">
                                                        {g}
                                                    </span>
                                                ))}
                                                <ion-icon
                                                    name="pencil-sharp"
                                                    style={{ flexShrink: 0, opacity: 0, fontSize: '12px' }}
                                                    className="group-hover:opacity-40 transition-opacity"
                                                ></ion-icon>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 relative z-1 flex-col md:flex-row">
                        <PieChart data={posts} />
                        <BarChart data={posts} />
                    </div>
                    <ReviewPanel />
                </div>
            </div>

            <ReviewModal
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                onReviewAdded={() => { fetchPosts(); setEditingReview(null); }}
                editingReview={editingReview}
            />
        </div>
    );
};

export default ReviewsWindow;
