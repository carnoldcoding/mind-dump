import PageHeader from "../../components/common/PageHeader";
import Card from "./Card";
import { useEffect, useState } from "react";
import type { GamePost } from "../../types";

const Games = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<GamePost[]>([]);

    useEffect(()=> {
        const fetchGamePosts = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch('http://192.168.1.7:5000/api/posts?type=game');
                
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

        fetchGamePosts();
    },[])

    const renderContent = () => {
        if (loading) return <div>Loading games...</div>;
        if (error) return <div>Error: {error}</div>;
        
        return (
          <section className="flex flex-wrap gap-5 md:gap-10 justify-center mt-10">
            {posts.map((post: GamePost) => (
                <Card {...post} />
            ))}
          </section>
        );
      };

    return (
    <>
        <PageHeader name="games" />
        {renderContent()}
    </>
    )
}

export default Games;