import { useEffect, useState } from "react";
import config from "../../../config";
import { PieChart } from "./pieChart";
import { BarChart } from "./barChart";
import { ReviewPanel } from "./ReviewPanel";

type Props = {
    onClose: () => void;
};

const ReviewsWindow = ({ onClose }: Props) => {
    const [posts, setPosts] = useState<any>([]);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const url = new URL("/api/posts", config.apiUri);
                const response = await fetch(url.toString());
                if (response.ok) {
                    const data = await response.json();
                    setPosts(data);
                }
            } catch {
                // network error — posts stay empty
            }
        };
        fetchPosts();
    }, []);

    return (
        <div className="relative nier-enter">
            <aside className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
            <div className="relative bg-nier-100 border border-nier-150">
                <div className="h-10 bg-nier-150 flex items-center justify-between px-5">
                    <h3 className="text-nier-text-dark text-xl uppercase tracking-wider">Reviews</h3>
                    <button
                        onClick={onClose}
                        className="text-sm px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter leading-none"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex gap-4 relative z-1 flex-col md:flex-row">
                        <PieChart data={posts} />
                        <BarChart data={posts} />
                    </div>
                    <ReviewPanel />
                </div>
            </div>
        </div>
    );
};

export default ReviewsWindow;
