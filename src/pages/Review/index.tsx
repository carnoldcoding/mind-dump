import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import { useEffect, useState } from "react";
import Loader from "../../components/common/Loader";
import config from "../../config";
import { useParams } from "react-router";
import { TextField } from "../../components/common/TextField";
import { NumTextField } from "../../components/common/NumTextField";
import { DateField } from "../../components/common/DateField";
import { Button } from "../../components/common/Button";
import { MutliSelectField } from "../../components/common/MultiSelectField";

const Review = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<any>([]);
    const [query, setQuery] = useState<string>('');
    const [filteredPosts, setFilteredPosts] = useState<any>([]);
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [filters, setFilters] = useState({
        dateReleasedRange: { start: '', end: '' },
        dateCompletedRange: { start: '', end: '' },
        ratingRange: { min: '', max: '' },
        genres: []
    });
    const genres = [
        "action",
        "rpg",
        "action-rpg",
        "souls-like",
        "shooter",
        "first-person",
        "third-person",
        "strategy",
        "simulation",
        "open-world",
        "metroidvania",
        "roguelike",
        "survival",
        "horror",
        "puzzle",
        "platformer",
        "story-rich",
        "multiplayer"
    ]
    const { category } = useParams<{category: string}>();

    const handleFieldChange = (field: string, value: any) => {
        setFilters(prev => ({
            ...prev, 
            [field]: value
        }))
    }

    const handleNestedFieldChange = (parentField: string, childField: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [parentField]: {
                ...prev[parentField as keyof typeof prev],
                [childField]: value
            }
        }))
    }

    const convertToISODate = (dateString: string): string | null => {
        if (!dateString) return null;
        
        if (dateString.includes('-') && dateString.split('-')[0].length === 4) {
            return dateString; 
        }
        
        const [month, day, year] = dateString.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };


    const filterReviews = () => {
        console.log(JSON.stringify(filteredPosts[0]))
        let result = filteredPosts.filter((review: any) => {
            // Date released filter
            if (filters.dateReleasedRange.start) {
                const releaseDate = convertToISODate(review.release_date);
                console.log(releaseDate);
                if (releaseDate && new Date(releaseDate) < new Date(filters.dateReleasedRange.start)) {
                    return false;
                }
            }
            if (filters.dateReleasedRange.end) {
                const releaseDate = convertToISODate(review.release_date);
                if (releaseDate && new Date(releaseDate) > new Date(filters.dateReleasedRange.end)) {
                    return false;
                }
            }

            // Date completed filter
            if (filters.dateCompletedRange.start) {
                const completedDate = convertToISODate(review.date_completed);
                if (completedDate && new Date(completedDate) < new Date(filters.dateCompletedRange.start)) {
                    return false;
                }
            }
            if (filters.dateCompletedRange.end) {
                const completedDate = convertToISODate(review.date_completed);
                if (completedDate && new Date(completedDate) > new Date(filters.dateCompletedRange.end)) {
                    return false;
                }
            }

            // Rating Range Filters
            if (filters.ratingRange.min && review.rating < parseFloat(filters.ratingRange.min)) {
                return false;
            }

            if (filters.ratingRange.max && review.rating > parseFloat(filters.ratingRange.max)) {
                return false;
            }

            // Genre Type Filters
            if (filters.genres.length > 0) {
                const hasAllGenres = filters.genres.every(genre => 
                    review.genres.includes(genre)
                );
                if (!hasAllGenres) return false;
            }

            return true;
        });

        setFilteredPosts(result);
    }

    const clearFilters = () => {
        setFilters({
            dateReleasedRange: { start: '', end: '' },
            dateCompletedRange: { start: '', end: '' },
            ratingRange: { min: '', max: '' },
            genres: []
        });
        setFilteredPosts(posts);
    }

    useEffect(() => {
        const postCopy = [...posts];
        const firstPass = postCopy.filter((post) => post.title.toLowerCase().startsWith(query.toLowerCase()));
        const secondPass = postCopy.filter((post) => post.title.toLowerCase().includes(query.toLowerCase()) && !firstPass.includes(post));
        const result = [...firstPass, ...secondPass];
        setFilteredPosts(result)
    }, [query, posts])

    if (!category) return null;

    useEffect(() => {
        const fetchPosts = async () => {
            const type = category.toString().endsWith('s') ? category.slice(0, -1) : category;

            try {
                setLoading(true);
                setError(null);
                const url = new URL('/api/posts', config.apiUri);
                url.searchParams.set('type', type);
                const response = await fetch(url.toString());
                
                if (response.ok) {
                    const data = await response.json();
                    setPosts(data);
                    setFilteredPosts(data);
                } else {
                    setError('Failed to fetch posts');
                }
            } catch (error) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [category])

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
                        <button 
                            className="capitalize rounded-sm cursor-pointer flex items-center justify-center gap-2 h-12 w-36
                            bg-nier-text-dark text-nier-100-lighter" 
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <ion-icon className="text-nier-100-lighter h-5 w-5" name="funnel-outline"></ion-icon>
                            <p className="text-nier-100-lighter flex whitespace-nowrap md:text-lg text-sm">Filter</p>
                        </button>
                    </header>

                    {/* Filter Control Panel */}
                    {showFilters && (
                        <div className="bg-nier-100-lighter m-4">
                            <div className="h-7 w-full bg-nier-150 flex items-center justify-between px-5">
                                <h3 className="text-nier-text-dark text-base capitalize">Filter Panel</h3>
                                <div className="cursor-pointer flex items-center justify-center" onClick={()=>{setShowFilters(!showFilters)}}>
                                    <ion-icon className="text-nier-text-dark h-5 w-5" name="close-outline"></ion-icon>
                                </div>
                            </div>
                            <div className="p-4 flex flex-col gap-4">
<<<<<<< HEAD
                                <div className="flex gap-4">
=======
                                <div className="flex gap-4 flex-col md:flex-row">
>>>>>>> dev
                                    <NumTextField 
                                        label="Min Rating" 
                                        onChange={(value) => handleNestedFieldChange('ratingRange', 'min', value)} 
                                        value={filters.ratingRange.min}
                                    />
                                    <NumTextField 
                                        label="Max Rating" 
                                        onChange={(value) => handleNestedFieldChange('ratingRange', 'max', value)} 
                                        value={filters.ratingRange.max}
                                    />
                                    <DateField 
                                        label="From Release Date" 
                                        onChange={(value) => handleNestedFieldChange('dateReleasedRange', 'start', value)} 
                                        value={filters.dateReleasedRange.start}
                                    />
                                    <DateField 
                                        label="To Release Date" 
                                        onChange={(value) => handleNestedFieldChange('dateReleasedRange', 'end', value)} 
                                        value={filters.dateReleasedRange.end}
                                    />
                                </div>
<<<<<<< HEAD
                                <div className="flex gap-4">
=======
                                <div className="flex gap-4 flex-col md:flex-row">
>>>>>>> dev
                                    <MutliSelectField 
                                        label="Genres" 
                                        options={genres}
                                        value={filters.genres}
                                        onChange={(value) => handleFieldChange('genres', value)}
                                    />
                                    <DateField 
                                        label="From Complete Date" 
                                        onChange={(value) => handleNestedFieldChange('dateCompletedRange', 'start', value)} 
                                        value={filters.dateCompletedRange.start}
                                    />
                                    <DateField 
                                        label="To Complete Date" 
                                        onChange={(value) => handleNestedFieldChange('dateCompletedRange', 'end', value)} 
                                        value={filters.dateCompletedRange.end}
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <Button handleClick={clearFilters} label="Clear"/>
                                    <Button handleClick={filterReviews} label="Apply"/>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Review Preview Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 place-items-stretch">
                        {filteredPosts.length > 0 ? filteredPosts.filter((post: any) => post.status === "done").map((post: any) => (
                            <div className="w-full" key={post._id}>
                                <Card {...post} />
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