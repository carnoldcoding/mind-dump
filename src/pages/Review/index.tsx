import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import { useEffect, useState } from "react";
import Loader from "../../components/common/Loader";
import config from "../../config";
import { useParams } from "react-router";

const Review = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<any>([]);
    const { category } = useParams<{category: string}>();

    if(!category) return;

    useEffect(()=> {
        const fetchPosts = async () => {
            const type = category.toString().endsWith('s') ? category.slice(0,-1) : category;

            try {
                setLoading(true);
                setError(null);
                const url = new URL('/api/posts', config.apiUri);
                url.searchParams.set('type', type);
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
    },[category])

    const renderContent = () => {
        if (loading) return (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2">
                <Loader/>
            </div>)
        if (error) return <div>Error: {error}</div>;
        
        return (
          <section className="flex flex-wrap gap-5 md:gap-10 justify-center mt-10">
            {posts.filter((post : any) => post.status === "done").map((post: any) => (
                <Card {...post} />
            ))}
          </section>
        );
      };

    return (
    <>
        <PageHeader name={category} />
        {renderContent()}
    </>
    )
}

export default Review;