import { useNavigate } from "react-router";

interface CardParams{
    type: string,
    slug: string,
    image_path: string,
    rating: string,
    _id: string,
    title: string,
    release_date: string,
    date_completed: string,
    releaseDate?: boolean,
    completeDate?: boolean,
    ratingRange?: boolean
}

const Card = ({type, slug, image_path, _id, release_date, date_completed, title, rating, releaseDate, completeDate, ratingRange} : CardParams)=> {
    const navigate = useNavigate();

    const handleClick = () => navigate(`/${type === 'cinema' ? type : type + 's'}/${slug}`);
    
    return (
        <article onClick={handleClick} key={_id} className="flex flex-col items-center w-full relative cursor-pointer group">
            <div className="md:h-70 h-60 w-full relative z-20 bg-nier-100-lighter flex flex-col items-center" >
                <div className="h-8 w-full bg-nier-150 flex items-center px-2 group-hover:bg-nier-dark transition-all duration-150">
                    <p className="text-left text-nier-text text-base overflow-hidden text-nowrap group-hover:text-nier-text-light transition-all duration-150">{title}</p>
                </div>
                <div className="p-2 w-full h-full">
                    <div className="w-full h-full bg-cover bg-center" style={{backgroundImage: `url(${image_path})`}}></div>
                </div>
                <div className="flex items-center justify-around w-full">
                    {ratingRange && <div className="flex items-center"><p className="text-sm">{rating}</p> &#9733;</div> }
                    {releaseDate && <div className="flex items-center"><ion-icon name="calendar-outline" className="mb-0.5"></ion-icon><p className="text-sm ml-1">{release_date}</p></div> }
                    {completeDate && <div className="flex items-center"><ion-icon name="checkmark-outline"></ion-icon><p className="text-sm">{date_completed}</p></div> }
                </div>
            </div>
            <div className="absolute h-full w-full bg-nier-shadow z-10 top-1 left-1"></div>
        </article>
    )
}

export default Card;