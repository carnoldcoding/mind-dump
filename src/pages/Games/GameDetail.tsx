import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { GamePost } from "../../types";
import PageHeader from "../../components/common/PageHeader";
import TextDropdown from "../../components/common/TextDropdown";

const GameDetail = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<GamePost | null>(null);

    const navigate = useNavigate();

    const handleClose = () => navigate('/games');

    const reviewPropMap = {
        "story": "Story and World Building",
        "gameplay": "Gameplay System",
        "graphics": "Graphical Design",
        "sound": "Sound Design"
    } as const;

    useEffect(()=>{
        const pathname = location.pathname;
        const slug = pathname.split('/games/')[1];
        
        const fetchPost = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`http://192.168.1.7:5000/api/posts?slug=${slug}`);
                
                if(response.ok){
                    const data = await response.json();
                    setData(data[0]);
                } else{
                    setError('Failed to fetch posts');
                }
            } catch (error) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        
        fetchPost();
    },[])

    const renderContent = () => {
        if (loading) return <div>Loading games...</div>;
        if (error) return <div>Error: {error}</div>;
        if (!data) return <div>Game not found</div>; 

        return (
            <article className="w-5xl h-130 bg-nier-100 mt-5 relative">
                
                <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5">
                    <h3 className="text-nier-text-dark text-xl">{data.title}</h3>
                    <div onClick={handleClose} className="text-3xl relative cursor-pointer">×</div>
                </div>
                <div className="p-4 flex">
                    <div className="min-w-80 h-112 bg-cover bg-center" style={{backgroundImage:`url(${data.image_path})`}}></div>
                    <div className="absolute bottom-2 h-[1px] w-[calc(100%-35px)] bg-nier-150"></div>
                    <div className="absolute top-12 h-[1px] w-[calc(100%-35px)] bg-nier-150"></div>

                    <div className="px-5 flex flex-col gap-5 overflow-y-scroll h-112">

                        <div className="flex justify-between w-full">
                            <div className="flex items-center justify-center bg-nier-dark h-14 w-14">
                                <p className="text-nier-text-light text-2xl leading-none">{data.rating.toString()}</p>
                            </div>

                            <div className="flex gap-2 self-end">
                                {data.genres.map((genre : string)=>{
                                    return (
                                        <div className="px-2 py-1 bg-nier-150/80 flex justify-center items-center">
                                            <p>{genre}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div>
                            <p >{data.description}</p>
                        </div>

                        <div>
                            <div className="flex flex-col gap-3">
                                {Object.entries(data.review).map(([key, value]) => {
                                    return (
                                        <TextDropdown  label={key} content={value}/>
                                    );
                                })}
                            </div>
                        </div>
                       
                    </div>
                </div>
                <div className="absolute w-full h-full bg-nier-shadow top-1 left-1 -z-10"></div>
            </article>
        )
    }
    return (
        <>
            <PageHeader name="games"/>
            {renderContent()}
        </>
    )
}

export default GameDetail;