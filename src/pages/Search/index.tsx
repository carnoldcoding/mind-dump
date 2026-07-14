import PageHeader from "../../components/common/PageHeader"
import { useState, useEffect } from "react";
import type { BookPost, CinemaPost, GamePost } from "../../types";
import { Link } from "react-router-dom";
import { backend } from "../../api/backend";
import { rankByTitle } from "../../utils/rankByTitle";
import gameLight from "../../assets/game-light.svg";
import monitorLight from "../../assets/monitor-light.svg";
import bookLight from "../../assets/book-light.svg";
import Loader from "../../components/common/Loader";
import { useStageState } from "../../context/BootSequenceContext";
import { usePanelReveal, panelStageIndex } from "../../hooks/usePanelReveal";
import { enterClass } from "../../utils/animations";


const Search = () => {
    // Waits for the boot sequence's 'header' stage before its first ever
    // reveal (so the box-reveal actually plays visibly instead of running to
    // completion while <main> is still hidden) — true immediately on every
    // navigation after that, since boot only ever happens once per session.
    const { active: contentActive } = useStageState('header');
    // No resetKey needed — unlike Review, Search has no route param, so it
    // fully unmounts/remounts on navigation away and back.
    const panelStage = usePanelReveal(contentActive);
    const contentReady = panelStageIndex(panelStage) >= panelStageIndex('title');
    const [loading, setLoading] = useState<boolean>(false);
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(()=> {
        const fetchGamePosts = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await backend.getReviews();
                setPosts(data);
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
          const eligible: any[] = posts.filter((post: any) => post.status !== 'todo');
          //@ts-ignore
          setFilteredPosts(rankByTitle(eligible, query));
        } else {
          setFilteredPosts([]);
        }
      };

    if(loading) return <Loader />
    if(error) return <>Error</>
    
    return (
        <>
            <PageHeader name="SEARCH" />
            <div className="mt-5 relative">
            {/* Sibling of article, not a child — see Review/index.tsx for
                why: a transform on article would trap a child shadow in
                the wrong stacking context. */}
            <div className={`absolute w-full h-full bg-nier-shadow top-1 left-1 ${contentActive ? enterClass('nier-enter') : 'invisible'}`}></div>
            <article className={`md:w-full ${filteredPosts.length > 0 ? 'h-auto' : 'h-30'} bg-nier-100 relative ${contentActive ? enterClass('nier-enter') : 'invisible'}`}>
                <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5">
                </div>

                <div className={`p-4 flex flex-col gap-5 ${contentReady ? '' : 'invisible'}`}>
                    <div className="border-2 border-nier-150 flex">
                        <input type="text" onKeyUp={handleTyping} autoFocus className="focus:outline focus:border-nier-dark w-full p-2 px-4"/>
                    </div>

                    <div className="flex flex-col gap-10 overflow-y-scroll max-h-100">
                        
                        {/* Game Results */}
                        {filteredPosts.filter((post:any) => post.type==='game').length > 0 && 
                            <div>
                                <div className="flex items-center justify-start gap-2">
                                    <img src={gameLight} className="bg-nier-dark p-1" alt=""/>
                                    <h2 className="text-2xl">GAMES</h2>
                                </div>

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
                            </div>}
                        

                        {/* Cinema Results */}
                        {filteredPosts.filter((post:any) => post.type==='cinema').length > 0 && 
                        <div>
                            <div className="flex items-center justify-start gap-2">
                                <img src={monitorLight} className="bg-nier-dark p-1" alt=""/>
                                <h2 className="text-2xl">CINEMA</h2>
                            </div>

                            <div className="ml-10 mt-3 flex flex-col gap-2">
                                {
                                    filteredPosts.filter((post : any) => post.type === 'cinema').map((post : CinemaPost)=>{
                                        return (
                                            <Link to={`/cinema/${post.slug}`} className="flex gap-2 cursor-pointer items-center bg-nier-150/60 p-2 group hover:bg-nier-dark">
                                                <div className="h-4 w-4 bg-nier-dark group-hover:bg-nier-text-light"></div>
                                                <p className="text-lg leading-none group-hover:text-nier-text-light">{post.title}</p>
                                            </Link>
                                        )
                                    })
                                }
                            </div>
                        </div>}
                        
                        {/* Book Results */}
                        {filteredPosts.filter((post:any) => post.type==='book').length > 0 && 
                        <div>
                            <div className="flex items-center justify-start gap-2">
                                <img src={bookLight} className="bg-nier-dark p-1" alt=""/>
                                <h2 className="text-2xl">BOOK</h2>
                            </div>

                            <div className="ml-10 mt-3 flex flex-col gap-2">
                                {
                                    filteredPosts.filter((post : any) => post.type === 'book').map((post : BookPost)=>{
                                        return (
                                            <Link to={`/books/${post.slug}`} className="flex gap-2 cursor-pointer items-center bg-nier-150/60 p-2 group hover:bg-nier-dark">
                                                <div className="h-4 w-4 bg-nier-dark group-hover:bg-nier-text-light"></div>
                                                <p className="text-lg leading-none group-hover:text-nier-text-light">{post.title}</p>
                                            </Link>
                                        )
                                    })
                                }
                            </div>
                        </div>}
                    </div>
                </div>
                
            </article>
            </div>
        </>
    )
}

export default Search