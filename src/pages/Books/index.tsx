import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import { useEffect, useState } from "react";
import type { BookPost } from "../../types";
import Loader from "../../components/common/Loader";
import config from "../../config";

const Books = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<BookPost[]>([]);

    useEffect(()=> {
        const fetchBookPosts = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`${config.apiUri}/api/posts?type=book`);
                
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

        fetchBookPosts();
    },[])

    const renderContent = () => {
        if (loading) return (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2">
                <Loader size={64}/>
            </div>)
        if (error) return <div>Error: {error}</div>;
        
        return (
          <section className="flex flex-wrap gap-5 md:gap-10 justify-center mt-10">
            {posts.map((post: BookPost) => (
                <Card {...post} />
            ))}
          </section>
        );
      };

    return (
    <>
        <PageHeader name="books" />
        {renderContent()}
    </>
    )
}

export default Books;