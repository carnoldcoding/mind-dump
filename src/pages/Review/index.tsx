import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import { useEffect, useState } from "react";
import Loader from "../../components/common/Loader";
import config from "../../config";
import { useParams } from "react-router";
import { TextField } from "../../components/common/TextField";

const Review = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<any>([]);
    const [query, setQuery] = useState<string>('');
    const [filteredPosts, setFilteredPosts] = useState<any>([]);
    const { category } = useParams<{category: string}>();

    

    useEffect(()=>{
        const postCopy = [...posts];
        const firstPass = postCopy.filter((post) => post.title.toLowerCase().startsWith(query.toLowerCase()));
        const secondPass = postCopy.filter((post) => post.title.toLowerCase().includes(query.toLowerCase()) && !firstPass.includes(post));
        const result = [...firstPass, ...secondPass];
        setFilteredPosts(result)
    }, [query])

    if(!category) return;

    useEffect(()=> {
        const fetchPosts = async () => {
            const type = category.toString().endsWith('s') ? category.slice(0,-1) : category;

            try {
                setLoading(true);
                setError(null);
                const url = new URL('/api/posts', config.apiUri);
                url.searchParams.set('type', type);
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

        fetchPosts();
    },[category])

    const renderContent = () => {
        if (loading) return (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2">
                <Loader/>
            </div>)
        if (error) return <div>Error: {error}</div>;
        
        return (
          <section className="mt-5">
            <article className="bg-nier-100 mt-5 relative">
                    <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5">
                        <h3 className="text-nier-text-dark text-xl capitalize">{category} View Panel</h3>
                    </div>
                    <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1"></aside>

                     <header className="flex gap-4 justify-between items-center px-4 pt-4">
                        <TextField label="Search" value={query} onChange={setQuery} altBg={true}/>
                        {/* <button className="capitalize rounded-sm cursor-pointer flex items-center justify-center gap-2 h-12 w-36
                        bg-nier-text-dark text-nier-100-lighter" onClick={()=>{}}><ion-icon className="text-nier-100-lighter h-6 w-6" name="funnel-outline"></ion-icon><p className="text-nier-100-lighter flex whitespace-nowrap md:text-lg text-sm">Filter</p></button> */}
                    </header>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 place-items-stretch">
                        {filteredPosts.length > 0 ? filteredPosts.filter((post: any) => post.status === "done").map((post: any) => (
                            <div className="w-full">
                                <Card key={post._id} {...post} />
                            </div>
                        )) :
                        <h3>No Matching Reviews</h3>
                        }
                    </div>
                </article>
          </section>
        );
      };

    return (
    <>
        <PageHeader name={category} />
        {renderContent()}
    </>
    )
}

export default Review;