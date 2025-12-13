import { ReviewPreview } from "./ReviewPreview"
import { ReviewModal } from "./ReviewModal"
import { useState, useEffect } from "react"
import config from "../../../../config"

export const ReviewList = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<any>([]);
    const [editMode, setEditMode] = useState<any>(null);
    const [sortState, setSortState] = useState({
        title: true,
        type: true,
        rating: true,
        date: true,
    })

    const handleAdd = () => {
        setEditMode(null);
        setIsOpen(true)
    }

    const handleEdit = (review: any) => {
        setEditMode(review);
        setIsOpen(true);
    }

    const sortPosts = (metric: 'title' | 'type' | 'rating') => {
        const sortedPosts = [...posts]; // Create copy
        
        if(metric === 'rating'){
            sortedPosts.sort((a, b) => 
                sortState.rating ? a.rating - b.rating : b.rating - a.rating
            );
        } else if(metric === 'title'){
            sortedPosts.sort((a, b) => {
                const comparison = a.title.toUpperCase().localeCompare(b.title.toUpperCase());
                return sortState.title ? comparison : -comparison;
            });
        } else if(metric === 'type'){
            sortedPosts.sort((a, b) => {
                const comparison = a.type.toUpperCase().localeCompare(b.type.toUpperCase());
                return sortState.type ? comparison : -comparison;
            });
        }
        
        setPosts(sortedPosts);
        setSortState(prev => ({
            ...prev,
            [metric]: !prev[metric]
        }));
}

    const deletePost = async (slug: string) => {
        try {
            setLoading(true);
            setError(null);
            
            const url = new URL('/api/posts/remove_post', config.apiUri);
            
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    slug
                }),
            });
            
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Review deleted', data);
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                setError('Failed to create review');
            }
        } catch (error : any) {
            console.error('Network error:', error);
            setError('Network error: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

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

    useEffect(()=> {
        fetchPosts();
    },[])

    return (
         <article>
            <header className="flex justify-between items-center px-4 py-4 border-b border-b-nier-dark/50">
                <h2 className="capitalize text-xl">all reviews</h2>
                <button className="capitalize px-4 py-2 border border-b-gray-950 rounded-sm cursor-pointer flex items-center
                hover:bg-nier-text-dark hover:text-nier-100-lighter" onClick={handleAdd}>add review</button>
            </header>
            <ReviewModal 
                isOpen={isOpen} 
                setIsOpen={setIsOpen} 
                onReviewAdded={fetchPosts}
                editingReview={editMode}
            />
            <div className="overflow-auto">
                <div className="min-w-[48rem]">
                    <div className="grid grid-cols-6 bg-nier-150 text-center [&>div>p]:text-lg h-15 px-4 py-4 border-b border-b-nier-dark/50">
                    <div className="col-span-2 flex gap-2 items-center justify-center">
                        <p className="select-none inline-block cursor-pointer" onClick={()=> {sortPosts('title')}}>Title</p>
                        {sortState.title ? <ion-icon name="caret-down-sharp"></ion-icon> : <ion-icon name="caret-up-sharp"></ion-icon>}
                    </div>
                    <div className="flex gap-2 items-center justify-center">
                        <p className="select-none inline-block cursor-pointer" onClick={()=> {sortPosts('type')}}>Type</p>
                        {sortState.type ? <ion-icon name="caret-down-sharp"></ion-icon> : <ion-icon name="caret-up-sharp"></ion-icon>}
                    </div>
                    <div className="flex gap-2 items-center justify-center">
                        <p className="select-none inline-block cursor-pointer" onClick={()=> {sortPosts('rating')}}>Rating</p>
                        {sortState.rating ? <ion-icon name="caret-down-sharp"></ion-icon> : <ion-icon name="caret-up-sharp"></ion-icon>}
                    </div>
                    <div>
                        <p>Date</p>
                    </div>
                    <div>
                        <p>Actions</p>
                    </div>
                    </div>
                    <ul className="h-100 overflow-y-scroll">
                        {posts.map((post : any)=> <ReviewPreview 
                        review={post} 
                        deletePost={deletePost} 
                        onDelete={fetchPosts}
                        onEdit={handleEdit}
                        />)}
                    </ul>
                </div>
            </div>
        </article>
    )
}