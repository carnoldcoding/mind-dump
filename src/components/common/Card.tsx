import { useNavigate } from "react-router";

const Card = (post: any)=> {
    const navigate = useNavigate();

    const handleClick = () => navigate(`/${post.type === 'cinema' ? post.type : post.type + 's'}/${post.slug}`);
    
    return (
        <article onClick={handleClick} key={post._id} className="flex flex-col items-center w-full relative cursor-pointer group">
            <div className="md:h-70 h-60 w-full relative z-20 bg-nier-100-lighter flex flex-col items-center" >
                <div className="h-8 w-full bg-nier-150 flex items-center px-2 group-hover:bg-nier-dark transition-all duration-150">
                    <p className="text-left text-nier-text text-base overflow-hidden text-nowrap group-hover:text-nier-text-light transition-all duration-150">{post.title}</p>
                </div>
                <div className="p-2 w-full h-full">
                    <div className="w-full h-full bg-cover bg-center" style={{backgroundImage: `url(${post.image_path})`}}></div>
                </div>
            </div>
            <div className="absolute h-full w-full bg-nier-shadow z-10 top-1 left-1"></div>
        </article>
    )
}

export default Card;