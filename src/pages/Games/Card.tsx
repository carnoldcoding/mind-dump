import { useNavigate } from "react-router";
import type { GamePost } from "../../types";

const Card = (post:GamePost)=> {
    const navigate = useNavigate();

    const handleClick = () => navigate(`/games/${post.slug}`);
    
    return (
        <article onClick={handleClick} key={post._id} className="flex flex-col items-center w-40 md:w-50 relative cursor-pointer group">
            <div className="md:h-70 md:w-50 h-60 w-40 relative z-20 bg-nier-100 flex flex-col items-center" >
                <div className="h-10 w-full bg-nier-150 flex items-center px-2 group-hover:bg-nier-dark transition-all duration-150">
                    <p className="text-left text-nier-text text-lg overflow-hidden text-nowrap group-hover:text-nier-text-light transition-all duration-150">{post.title}</p>
                </div>
                <div className="md:h-55 md:w-45 h-45 w-35 bg-cover bg-center mt-2" style={{backgroundImage: `url(${post.image_path})`}}></div>
            </div>
            <div className="absolute md:h-70 md:w-50 h-60 w-40 bg-nier-shadow z-10 top-1 left-1"></div>
        </article>
    )
}

export default Card;