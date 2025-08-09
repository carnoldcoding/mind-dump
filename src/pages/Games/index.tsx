import PageHeader from "../../components/common/PageHeader";
import { useEffect, useState } from "react";
const Games = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<any>([]);

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
          <section className="flex flex-wrap gap-10 justify-center mt-10">
            {posts.map((post: any) => (
                <article key={post._id} className="flex flex-col items-center w-50 relative cursor-pointer group">
                    <div className="h-70 w-50 relative z-20 bg-nier-100 flex flex-col items-center" >
                        <div className="h-10 w-full bg-nier-150 flex items-center px-2 group-hover:bg-nier-dark transition-all duration-150">
                            <p className="text-left text-nier-text text-lg overflow-hidden text-nowrap group-hover:text-nier-text-light transition-all duration-150">{post.title}</p>
                        </div>
                        <div className="h-55 w-45 bg-cover bg-center mt-2" style={{backgroundImage: `url(${post.image_path})`}}></div>
                    </div>
                    <div className="absolute h-70 w-50 bg-nier-shadow z-10 top-1 left-1"></div>
                </article>
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