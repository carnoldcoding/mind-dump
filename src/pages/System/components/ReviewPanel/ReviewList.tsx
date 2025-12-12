import { ReviewPreview } from "./ReviewPreview"
import fakeReviews from "./data"
export const ReviewList = () => {
    
    return (
         <article>
            <header className="flex justify-between items-center h-15 px-4 py-4 border-b border-b-nier-dark/50">
                <h2 className="capitalize text-xl">all reviews</h2>
                <button className="capitalize px-4 py-2 border border-b-gray-950 rounded-sm cursor-pointer flex items-center
                hover:bg-nier-text-dark hover:text-nier-100-lighter">add review</button>
            </header>
            <div className="overflow-auto">
                <div className="min-w-[48rem]">
                    <div className="grid grid-cols-6 text-center [&>p]:text-lg h-15 px-4 py-4 border-b border-b-nier-dark/50">
                        <p className="col-span-2">Title</p>
                        <p>Type</p>
                        <p>Rating</p>
                        <p>Date</p>
                        <p>Actions</p>
                    </div>
                    <ul>
                        {fakeReviews.map((review)=> ReviewPreview(review))}
                    </ul>
                </div>
            </div>
        </article>
    )
}