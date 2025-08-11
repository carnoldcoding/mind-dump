import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import { useEffect, useState } from "react";
import type { CinemaPost } from "../../types";
import Loader from "../../components/common/Loader";

const Cinema = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<CinemaPost[]>([]);

    useEffect(()=> {
        const fetchCinemaPosts = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`${import.meta.env.VITE_API_URI}/api/posts?type=cinema`);
                
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

        fetchCinemaPosts();
    },[])

    const renderContent = () => {
        if (loading) return (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2">
                <Loader size={64}/>
            </div>)
        if (error) return <div>Error: {error}</div>;
        
        return (
          <section className="flex flex-wrap gap-5 md:gap-10 justify-center mt-10">
            {posts.map((post: CinemaPost) => (
                <Card {...post} />
            ))}
          </section>
        );
      };

    return (
    <>
        <PageHeader name="cinema" />
        {renderContent()}
    </>
    )
}

export default Cinema;