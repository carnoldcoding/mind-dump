import { ReviewPreview } from "./ReviewPreview"
import { ReviewModal } from "./ReviewModal"
import { useState, useEffect } from "react"
import config from "../../../../config"
import { TextField } from "../../../../components/common/TextField"

export const ReviewList = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<any>([]);
    const [filteredPosts, setFilteredPosts] = useState<any>([]);
    const [editMode, setEditMode] = useState<any>(null);
    const [query, setQuery] = useState<string>('');
    const [sortState, setSortState] = useState({
        title: true,
        type: true,
        rating: true,
        date: true,
        status: true
    })


    useEffect(()=>{
        const postCopy = [...posts];
        const firstPass = postCopy.filter((post) => post.title.toLowerCase().startsWith(query.toLowerCase()));
        const secondPass = postCopy.filter((post) => post.title.toLowerCase().includes(query.toLowerCase()) && !firstPass.includes(post));

        setFilteredPosts([...firstPass, ...secondPass])
    }, [query])

    const handleAdd = () => {
        setEditMode(null);
        setIsOpen(true);
    }

    const handleEdit = (review: any) => {
        setEditMode(review);
        setIsOpen(true);
    }

    const sortPosts = (metric: 'title' | 'type' | 'rating' | 'status') => {
        const sortedPosts = [...posts]; 

        const statusPriority = {
            TODO: 1,
            ACTIVE: 2,
            DONE: 3
        } as any;
        
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
        } else if(metric === 'status'){
            sortedPosts.sort((a, b) => {
                const aPriority = statusPriority[a.status.toUpperCase()] ?? 999;
                const bPriority = statusPriority[b.status.toUpperCase()] ?? 999;

                return sortState.status
                ? aPriority - bPriority
                : bPriority - aPriority;
            });
        }
        
        setFilteredPosts(sortedPosts);
        setSortState(prev => {
            const reset = Object.keys(prev).reduce((acc, key) => {
            acc[key as keyof typeof prev] = true;
                return acc;
            }, {} as typeof prev);

            return {
            ...reset,
            [metric]: !prev[metric],
        };
});

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
                setFilteredPosts(data);
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

    const columnTitle = (label: 'title' | 'type' | 'rating' | 'status') => {
        return (
            <div onClick={()=> {sortPosts(label)}} className="cursor-pointer flex gap-2 items-center">
                <p className="select-none inline-block cursor-pointer text-lg capitalize" >{label}</p>
                {sortState[label] ? <ion-icon name="caret-down-sharp"></ion-icon> : <ion-icon name="caret-up-sharp"></ion-icon>}
            </div>
        )
    }

    return (
         <article>
            <header className="flex gap-4 justify-between items-center px-4 py-4 border-b border-b-nier-dark/50">
                <TextField label="Search" value={query} onChange={setQuery}/>
                <button className="capitalize rounded-sm cursor-pointer flex items-center justify-center h-12 w-36
               bg-nier-text-dark text-nier-100-lighter" onClick={handleAdd}><p className="text-nier-100-lighter flex whitespace-nowrap md:text-lg text-sm">Add Review</p></button>
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
                    <div className="col-span-2 flex gap-2 items-center justify-center" >
                        {columnTitle('title')}
                    </div>

                    <div className="col-span-1 flex gap-2 items-center justify-center" >
                        {columnTitle('type')}
                    </div>

                    <div className="col-span-1 flex gap-2 items-center justify-center" >
                        {columnTitle('rating')}
                    </div>

                    <div className="col-span-1 flex gap-2 items-center justify-center" >
                        {columnTitle('status')}
                    </div>

                    <div>
                        <p>Actions</p>
                    </div>
                    </div>
                    <ul className="h-100 overflow-y-scroll">
                        {filteredPosts.map((post : any)=> <ReviewPreview 
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