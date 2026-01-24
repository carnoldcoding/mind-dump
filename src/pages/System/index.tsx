import PageHeader from "../../components/common/PageHeader";
import LoginForm from "./LoginForm";
import { PieChart } from "./components/pieChart";
import { BarChart } from "./components/barChart";
import { ReviewPanel } from "./components/ReviewPanel";
import { useEffect, useState } from "react";
import config from "../../config";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";

const System = () => {
    const { isLoggedIn, logout, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<any>([]);
    
    useEffect(()=> {
        if (isLoggedIn) {
            const fetchPosts = async () => {
                try {
                    setLoading(true);
                    setError(null);
                    const url = new URL('/api/posts', config.apiUri);
                    const response = await fetch(url.toString());
                    
                    if(response.ok){
                        const data = await response.json();
                        setPosts(data);
                    } else{
                        setError('Failed to fetch posts');
                    }
                } catch (error) {
                    setError('Network error');
                } finally {
                    setLoading(false);
                }
            };
            fetchPosts();
        }
    }, [isLoggedIn])
    
    if (authLoading) {
        return (
            <>
                <PageHeader name="SYSTEM" />
                <Loader />
            </>
        );
    }
    
    return (
        <>
            <PageHeader name="SYSTEM" />
        {isLoggedIn ? 
                <article className="bg-nier-100 mt-5 relative">
                    <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5">
                        <h3 className="text-nier-text-dark text-xl">Control Panel</h3>
                        <button 
                            onClick={logout}
                            className="capitalize text-sm px-4 py-1 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter"
                        >
                            Logout
                        </button>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                        <div className="flex gap-4 relative z-1 flex-col md:flex-row">
                            <PieChart data={posts}/>
                            <BarChart data={posts}/>
                        </div>
                        <ReviewPanel />
                    </div>
                    <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1"></aside>
                </article>
                :
                <LoginForm />
            }
        </>
    )
}

export default System;