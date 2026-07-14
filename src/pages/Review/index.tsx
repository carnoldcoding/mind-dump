import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import { useEffect, useState } from "react";
import Loader from "../../components/common/Loader";
import { backend } from "../../api/backend";
import { rankByTitle } from "../../utils/rankByTitle";
import { useParams } from "react-router";
import { TextField } from "../../components/common/TextField";
import { Button } from "../../components/common/Button";
import { MutliSelectField } from "../../components/common/MultiSelectField";
import { gameGenres, movieGenres, bookGenres } from "../../utils/helpers";
import { useLocation } from "react-router";
import { useStageState } from "../../context/BootSequenceContext";
import { usePanelReveal, panelStageIndex } from "../../hooks/usePanelReveal";
import { useDecodeText } from "../../hooks/useDecodeText";

const Review = () => {
    const location = useLocation();
    // See Search/index.tsx — waits for the boot sequence's 'header' stage
    // before its first ever reveal, true immediately on every navigation
    // after that.
    const { active: contentActive } = useStageState('header');

    const searchParams = new URLSearchParams(location.search);
    const genreParam = searchParams.get('genre');

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [posts, setPosts] = useState<any>([]);
    const [query, setQuery] = useState<string>('');
    const [genreOptions, setGenreOptions] = useState<string[]>([]);
    const [filteredPosts, setFilteredPosts] = useState<any>([]);
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [filters, setFilters] = useState({
        dateReleasedRange: { active: false, start: '', end: '' },
        dateCompletedRange: { active: false, start: '', end: '' },
        ratingRange: { active: false, min: '', max: '' },
        genres: genreParam ? [genreParam] : []
    });
 
    const { category } = useParams<{category: string}>();
    // Hooks must run unconditionally, so these sit above the `if (!category)
    // return null` below even though category may briefly be undefined.
    // resetKey=category so this restarts fresh on every category switch —
    // Review itself doesn't unmount between categories (React Router keeps
    // the same component instance, just re-renders with new params), so
    // without this the hook's state would stay stuck from the previous
    // category while the section's own `key` still forces its DOM to
    // remount, leaving cards "ready" from frame one instead of waiting.
    const panelStage = usePanelReveal(contentActive, category);
    const titleReady = panelStageIndex(panelStage) >= panelStageIndex('title');
    const cardsReady = panelStageIndex(panelStage) >= panelStageIndex('cards');
    const decodedPanelTitle = useDecodeText(`${category ?? ''} VIEW PANEL`.toUpperCase(), titleReady);

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


    const filterReviews = (posts : any) => {
        return posts.filter((review: any) => {
            // Date released filter
            if (filters.dateReleasedRange.start) {
                const releaseDate = convertToISODate(review.release_date);
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
    }

    const clearFilters = () => {
        setFilters({
            dateReleasedRange: { active: false, start: '', end: '' },
            dateCompletedRange: { active: false,  start: '', end: '' },
            ratingRange: { active: false,  min: '', max: '' },
            genres: []
        });
        setFilteredPosts(posts);
    }

    if (!category) return null;

    
    useEffect(()=>{
        clearFilters();
        setFilters((prev) => ({
            ...prev,
            genres: genreParam ? [genreParam] : []
        }))
        let tempGenres : string[] = [];
        
        if(location.pathname.includes('/games')) tempGenres = gameGenres;
        if(location.pathname.includes('/cinema')) tempGenres = movieGenres;
        if(location.pathname.includes('/books')) tempGenres = bookGenres;
        
        setGenreOptions(tempGenres);

    },[location.pathname])

    useEffect(() => {
        const fetchPosts = async () => {
            const type = category.toString().endsWith('s') ? category.slice(0, -1) : category;

            try {
                setLoading(true);
                setError(null);
                const data = await backend.getReviews({ type });
                setPosts(data);
                setFilteredPosts(data);
            } catch (error) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [category])

    useEffect(() => {
        let result = query ? rankByTitle(posts, query) : [...posts];
        result = filterReviews(result);
        setFilteredPosts(result);
    }, [posts, query, filters]);

    useEffect(()=> {
        //Handle Active Filter State
        if(filters.ratingRange.min || filters.ratingRange.max) {
            handleNestedFieldChange('ratingRange', 'active', true);
        }else{
            handleNestedFieldChange('ratingRange', 'active', false);
        }
    
        if(filters.dateCompletedRange.start || filters.dateCompletedRange.end){
            handleNestedFieldChange('dateCompletedRange', 'active', true);
        }else{
            handleNestedFieldChange('dateCompletedRange', 'active', false);
        }

        if(filters.dateReleasedRange.start || filters.dateReleasedRange.end){
            handleNestedFieldChange('dateReleasedRange', 'active', true);
        }else{
            handleNestedFieldChange('dateReleasedRange', 'active', false);
        }
    },[filters.dateReleasedRange.start, filters.dateReleasedRange.end, 
        filters.ratingRange.min, filters.ratingRange.max,
        filters.dateCompletedRange.start, filters.dateReleasedRange.end])



    const renderContent = () => {
        if (loading) return (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2">
                <Loader/>
            </div>)
        if (error) return <div>Error: {error}</div>;
        
        return (
          <section key={category} className={`mt-5 relative ${contentActive ? '' : 'invisible'}`}>
            {/* Sibling of article, not a child — a transform (from
                nier-enter) makes an element establish its own
                stacking context, which would trap a -z-1 child instead of
                letting it render behind the whole article as intended. */}
            <div className={`absolute w-full h-[42rem] mt-5 bg-nier-shadow top-1 left-1 ${contentActive ? 'nier-enter' : 'invisible'}`}></div>
            <article className={`bg-nier-100 mt-5 relative flex flex-col h-[42rem] ${contentActive ? 'nier-enter' : 'invisible'}`}>
                    <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5 flex-shrink-0">
                        <h3 className={`text-nier-text-dark text-xl uppercase ${titleReady ? '' : 'invisible'}`}>{decodedPanelTitle}</h3>
                    </div>

                    <header className={`flex gap-3 justify-between items-center px-4 pt-4 pb-4 border-b border-nier-150/40 flex-shrink-0 ${titleReady ? '' : 'invisible'}`}>
                        <TextField label="Search" value={query} onChange={setQuery} altBg={true}/>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 h-12 cursor-pointer transition-colors duration-150 flex-shrink-0 ${
                                showFilters || filters.ratingRange.active || filters.dateReleasedRange.active || filters.dateCompletedRange.active || filters.genres.length > 0
                                    ? 'bg-nier-dark'
                                    : 'bg-nier-150 hover:bg-nier-150/60'
                            }`}
                        >
                            <ion-icon
                                name="funnel-outline"
                                style={{ color: showFilters || filters.ratingRange.active || filters.dateReleasedRange.active || filters.dateCompletedRange.active || filters.genres.length > 0 ? '#C4BEAC' : 'inherit' }}
                            ></ion-icon>
                            <p className={`text-sm whitespace-nowrap ${showFilters || filters.ratingRange.active || filters.dateReleasedRange.active || filters.dateCompletedRange.active || filters.genres.length > 0 ? 'text-nier-text-light' : ''}`}>
                                Filter
                            </p>
                        </button>
                    </header>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="mx-4 mt-4 bg-nier-100-lighter relative flex-shrink-0">
                            <div className="h-8 bg-nier-150 flex items-center justify-between px-4">
                                <p className="text-xs uppercase tracking-widest text-nier-text-dark/70">Filter Panel</p>
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="text-xl leading-none cursor-pointer hover:opacity-60 transition-opacity"
                                >×</button>
                            </div>

                            <div className="p-4 flex flex-col gap-5">

                                {/* Rating · Released · Completed */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

                                    {/* Rating stepper */}
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-nier-text-dark/40 mb-3">Rating</p>
                                        <div className="flex flex-col gap-2">
                                            {(['min', 'max'] as const).map(bound => (
                                                <div key={bound} className="flex items-center justify-between">
                                                    <p className="text-xs uppercase text-nier-text-dark/50 w-6">{bound}</p>
                                                    <div className="flex items-stretch h-8">
                                                        <button
                                                            onClick={() => {
                                                                const cur = parseFloat(filters.ratingRange[bound] || '0');
                                                                const next = Math.max(0, cur - 1);
                                                                handleNestedFieldChange('ratingRange', bound, next.toString());
                                                            }}
                                                            className="w-8 bg-nier-150/60 hover:bg-nier-150 flex items-center justify-center cursor-pointer text-base leading-none transition-colors duration-150"
                                                        >−</button>
                                                        <div className="w-12 flex items-center justify-center bg-nier-100 border-y border-nier-150 text-sm select-none">
                                                            {filters.ratingRange[bound] || '—'}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const cur = parseFloat(filters.ratingRange[bound] || '0');
                                                                const next = Math.min(10, cur + 1);
                                                                handleNestedFieldChange('ratingRange', bound, next.toString());
                                                            }}
                                                            className="w-8 bg-nier-150/60 hover:bg-nier-150 flex items-center justify-center cursor-pointer text-base leading-none transition-colors duration-150"
                                                        >+</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Released range */}
                                    <div className="sm:pl-5 sm:border-l border-nier-150/40">
                                        <p className="text-xs uppercase tracking-widest text-nier-text-dark/40 mb-3">Released</p>
                                        <div className="flex flex-col gap-2">
                                            {([['start', 'From'], ['end', 'To']] as [string, string][]).map(([field, label]) => (
                                                <div key={field} className="flex items-center gap-3">
                                                    <p className="text-xs uppercase text-nier-text-dark/50 w-7 flex-shrink-0">{label}</p>
                                                    <input
                                                        type="date"
                                                        value={filters.dateReleasedRange[field as 'start' | 'end']}
                                                        onChange={e => handleNestedFieldChange('dateReleasedRange', field, e.target.value)}
                                                        className="flex-1 border border-nier-150 bg-nier-100 px-2 py-1 text-sm focus:outline focus:border-nier-dark"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Completed range */}
                                    <div className="sm:pl-5 sm:border-l border-nier-150/40">
                                        <p className="text-xs uppercase tracking-widest text-nier-text-dark/40 mb-3">Completed</p>
                                        <div className="flex flex-col gap-2">
                                            {([['start', 'From'], ['end', 'To']] as [string, string][]).map(([field, label]) => (
                                                <div key={field} className="flex items-center gap-3">
                                                    <p className="text-xs uppercase text-nier-text-dark/50 w-7 flex-shrink-0">{label}</p>
                                                    <input
                                                        type="date"
                                                        value={filters.dateCompletedRange[field as 'start' | 'end']}
                                                        onChange={e => handleNestedFieldChange('dateCompletedRange', field, e.target.value)}
                                                        className="flex-1 border border-nier-150 bg-nier-100 px-2 py-1 text-sm focus:outline focus:border-nier-dark"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Genres */}
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-nier-text-dark/40 mb-2">Genres</p>
                                    <MutliSelectField
                                        label="Genres"
                                        options={genreOptions}
                                        value={filters.genres}
                                        onChange={value => handleFieldChange('genres', value)}
                                    />
                                </div>

                                {/* Active filter summary + clear */}
                                <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-nier-150/40">
                                    <div className="flex gap-1.5 flex-wrap">
                                        {filters.ratingRange.active && (
                                            <button
                                                onClick={() => { handleNestedFieldChange('ratingRange', 'min', ''); handleNestedFieldChange('ratingRange', 'max', ''); }}
                                                className="flex items-center gap-1.5 text-xs px-2 py-0.5 bg-nier-dark text-nier-text-light cursor-pointer hover:bg-nier-text-dark transition-colors duration-150"
                                            >
                                                Rating {filters.ratingRange.min}–{filters.ratingRange.max}
                                                <span className="opacity-60">×</span>
                                            </button>
                                        )}
                                        {filters.dateReleasedRange.active && (
                                            <button
                                                onClick={() => { handleNestedFieldChange('dateReleasedRange', 'start', ''); handleNestedFieldChange('dateReleasedRange', 'end', ''); }}
                                                className="flex items-center gap-1.5 text-xs px-2 py-0.5 bg-nier-dark text-nier-text-light cursor-pointer hover:bg-nier-text-dark transition-colors duration-150"
                                            >
                                                Released {filters.dateReleasedRange.start} – {filters.dateReleasedRange.end}
                                                <span className="opacity-60">×</span>
                                            </button>
                                        )}
                                        {filters.dateCompletedRange.active && (
                                            <button
                                                onClick={() => { handleNestedFieldChange('dateCompletedRange', 'start', ''); handleNestedFieldChange('dateCompletedRange', 'end', ''); }}
                                                className="flex items-center gap-1.5 text-xs px-2 py-0.5 bg-nier-dark text-nier-text-light cursor-pointer hover:bg-nier-text-dark transition-colors duration-150"
                                            >
                                                Completed {filters.dateCompletedRange.start} – {filters.dateCompletedRange.end}
                                                <span className="opacity-60">×</span>
                                            </button>
                                        )}
                                        {filters.genres.map(g => (
                                            <button
                                                key={g}
                                                onClick={() => handleFieldChange('genres', filters.genres.filter(x => x !== g))}
                                                className="flex items-center gap-1.5 text-xs px-2 py-0.5 bg-nier-150 capitalize cursor-pointer hover:bg-nier-dark hover:text-nier-text-light transition-colors duration-150"
                                            >
                                                {g} <span className="opacity-60">×</span>
                                            </button>
                                        ))}
                                    </div>
                                    <Button handleClick={clearFilters} label="Clear" type="secondary" />
                                </div>
                            </div>

                            <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />
                        </div>
                    )}

                    {/* Review Preview Grid */}
                    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 overflow-y-auto flex-1 items-start content-start ${titleReady ? '' : 'invisible'}`}>
                        {filteredPosts.length > 0
                            ? filteredPosts
                                .filter((post: any) => post.status === "done")
                                .sort((a: any, b: any) => {
                                    return new Date(b.date_completed).getTime() - new Date(a.date_completed).getTime();
                                })
                                .map((post: any, i: number) => (
                                    <div
                                        className={`w-full ${cardsReady ? 'nier-panel-card-fall' : 'invisible'}`}
                                        key={post._id}
                                        style={cardsReady ? ({ '--nier-card-delay': `${Math.min(i, 20) * 30}ms` } as React.CSSProperties) : undefined}
                                    >
                                    <Card
                                        {...post}
                                        releaseDate={filters.dateReleasedRange.active}
                                        completeDate={filters.dateCompletedRange.active}
                                        ratingRange={filters.ratingRange.active}
                                    />
                                    </div>
                                ))
                            : <h3>No Matching Reviews</h3>
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