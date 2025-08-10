import PageHeader from "../../components/common/PageHeader"
import { useState, useEffect } from "react";
import type { GamePost } from "../../types";
import { Link } from "react-router-dom";


const Search = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(()=> {
        const fetchGamePosts = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`${import.meta.env.VITE_API_URI}/api/posts`);
                
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

    const handleTyping = (event : any) => {
        filterPosts(event.target.value.toString());
    }

    const filterPosts = (query: string) => {
        if (query !== "") {
          const lowerQuery = query.toLowerCase();
      
          const startsWithMatches = posts.filter((post: any) =>
            post.title.toLowerCase().startsWith(lowerQuery)
          );
      
          const containsMatches = posts.filter((post: any) =>
            post.title.toLowerCase().includes(lowerQuery) &&
            !startsWithMatches.includes(post)
          );
      
          setFilteredPosts([...startsWithMatches, ...containsMatches]);
        } else {
          setFilteredPosts([]);
        }
      };
    
    return (
        <>
            <PageHeader name="SEARCH" />
            <article className="md:w-5xl md:h-134 bg-nier-100 mt-5 relative">
                <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5">
                </div>

                <div className="p-4 flex flex-col gap-5">
                    <div className="border-2 border-nier-150 flex">
                        <input type="text" onKeyUp={handleTyping} className="focus:outline focus:border-nier-dark w-full p-2 px-4"/>
                    </div>

                    <div className="">
                        

                        {/* Game Results */}
                        {
                            filteredPosts.filter((post:any) => post.type==='game').length > 0 && 
                            <div className="flex items-center justify-start gap-2">
                                <img src="/src/assets/game-light.svg" className="bg-nier-dark p-1" alt=""/>
                                <h2 className="text-2xl">GAMES</h2>
                            </div>
                        }

                        <div className="ml-10 mt-3 flex flex-col gap-2">
                            {
                                filteredPosts.filter((post : any) => post.type === 'game').map((post : GamePost)=>{
                                    return (
                                        <Link to={`/games/${post.slug}`} className="flex gap-2 cursor-pointer items-center bg-nier-150/60 p-2 group hover:bg-nier-dark">
                                            <div className="h-4 w-4 bg-nier-dark group-hover:bg-nier-text-light"></div>
                                            <p className="text-lg leading-none group-hover:text-nier-text-light">{post.title}</p>
                                        </Link>
                                    )
                                })
                            }
                        </div>

                        {/* Cinema Results */}
                        {/* Book Results */}
                        {/* Journal Results */}
                    </div>
                </div>
                
                <div className="absolute w-full h-full bg-nier-shadow top-1 left-1 -z-10"></div>
            </article>
        </>
    )
}

export default Search