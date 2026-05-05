import PageHeader from "../../components/common/PageHeader";
import Desktop from "./Desktop";
import { PieChart } from "./components/pieChart";
import { BarChart } from "./components/barChart";
import { ReviewPanel } from "./components/ReviewPanel";
import { useEffect, useState } from "react";
import config from "../../config";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";

const System = () => {
    const { isLoggedIn, logout, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<any>([]);
    const [activeApp, setActiveApp] = useState<string | null>(null);

    useEffect(() => {
        if (isLoggedIn && activeApp === "reviews") {
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
        }
    }, [isLoggedIn, activeApp]);

    useEffect(() => {
        if (!isLoggedIn) setActiveApp(null);
    }, [isLoggedIn]);

    if (authLoading) {
        return (
            <>
                <PageHeader name="SYSTEM" />
                <Loader />
            </>
        );
    }

    if (activeApp === "reviews") {
        return (
            <>
                <PageHeader name="SYSTEM" />
                <div className="mt-5 relative nier-enter">
                    <aside className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
                    <article className="bg-nier-100 relative">
                        <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setActiveApp(null)}
                                    className="text-sm px-3 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter"
                                >
                                    ← Desktop
                                </button>
                                <h3 className="text-nier-text-dark text-xl">Reviews</h3>
                            </div>
                            <button
                                onClick={logout}
                                className="capitalize text-sm px-4 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter"
                            >
                                Logout
                            </button>
                        </div>
                        <div className="p-4 flex flex-col gap-4">
                            <div className="flex gap-4 relative z-1 flex-col md:flex-row">
                                <PieChart data={posts} />
                                <BarChart data={posts} />
                            </div>
                            <ReviewPanel />
                        </div>
                    </article>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader name="SYSTEM" />
            <Desktop onOpen={setActiveApp} />
        </>
    );
};

export default System;
