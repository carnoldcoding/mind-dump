import { ReviewPreview } from "./ReviewPreview"
import fakeReviews from "./data"
import { ReviewModal } from "./ReviewModal"
import { useState, useEffect } from "react"
import config from "../../../../config"

export const ReviewList = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<any>([]);

    const handleClick = () => {setIsOpen(true)}

    useEffect(()=> {
        const fetchPosts = async () => {

            try {
                setLoading(true);
                setError(null);
                const url = new URL('/api/posts', config.apiUri);
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
    },[])
    return (
         <article>
            <header className="flex justify-between items-center px-4 py-4 border-b border-b-nier-dark/50">
                <h2 className="capitalize text-xl">all reviews</h2>
                <button className="capitalize px-4 py-2 border border-b-gray-950 rounded-sm cursor-pointer flex items-center
                hover:bg-nier-text-dark hover:text-nier-100-lighter" onClick={handleClick}>add review</button>
            </header>
            <ReviewModal isOpen={isOpen} setIsOpen={setIsOpen}/>
            <div className="overflow-auto">
                <div className="min-w-[48rem]">
                    <div className="grid grid-cols-6 bg-nier-150 text-center [&>p]:text-lg h-15 px-4 py-4 border-b border-b-nier-dark/50">
                        <p className="col-span-2">Title</p>
                        <p>Type</p>
                        <p>Rating</p>
                        <p>Date</p>
                        <p>Actions</p>
                    </div>
                    <ul className="h-100 overflow-y-scroll">
                        {posts.map((post : any)=> ReviewPreview(post))}
                    </ul>
                </div>
            </div>
        </article>
    )
}