import { ReviewPreview } from "./ReviewPreview"
import { ReviewModal } from "./ReviewModal"
import { ReviewGridCard } from "./ReviewGridCard"
import { useState, useEffect } from "react"
import config from "../../../../config"
import { TextField } from "../../../../components/common/TextField"
import { Button } from "../../../../components/common/Button"

type ViewMode = 'list' | 'grid';

const TYPE_FILTERS = [
    { key: null,     label: 'All',    icon: null },
    { key: 'game',   label: 'Game',   icon: 'game-controller-sharp' },
    { key: 'cinema', label: 'Cinema', icon: 'videocam-sharp' },
    { key: 'book',   label: 'Book',   icon: 'book-sharp' },
] as const;

export const ReviewList = () => {
    const [viewMode,    setViewMode]    = useState<ViewMode>('grid');
    const [typeFilter,  setTypeFilter]  = useState<string | null>(null);
    const [isOpen,      setIsOpen]      = useState<boolean>(false);
    const [error,       setError]       = useState<string | null>(null);
    const [posts,       setPosts]       = useState<any[]>([]);
    const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
    const [editMode,    setEditMode]    = useState<any>(null);
    const [query,       setQuery]       = useState<string>('');
    const [sortState,   setSortState]   = useState({
        title: true, type: true, rating: true, date: true, status: true,
    });

    // Search filter
    useEffect(() => {
        const postCopy = [...posts];
        const firstPass  = postCopy.filter(p => p.title.toLowerCase().startsWith(query.toLowerCase()));
        const secondPass = postCopy.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) && !firstPass.includes(p));
        setFilteredPosts([...firstPass, ...secondPass]);
    }, [query, posts]);

    const handleAdd  = () => { setEditMode(null);   setIsOpen(true); };
    const handleEdit = (review: any) => { setEditMode(review); setIsOpen(true); };

    // ── Status update (inline, no modal needed) ──────────────────────
    const updatePostStatus = async (slug: string, newStatus: string) => {
        const post = posts.find((p: any) => p.slug === slug);
        if (!post || post.status === newStatus) return;

        const today = new Date().toLocaleDateString('en-US', {
            month: '2-digit', day: '2-digit', year: 'numeric',
        });

        try {
            const url = new URL('/api/posts/update_post', config.apiUri);
            await fetch(url.toString(), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...post,
                    status:         newStatus,
                    date_completed: newStatus === 'done' ? today : post.date_completed,
                }),
            });
            fetchPosts();
        } catch (err) {
            console.error('Status update error:', err);
        }
    };

    // ── Sort (list view) ─────────────────────────────────────────────
    const sortPosts = (metric: 'title' | 'type' | 'rating' | 'status') => {
        const sortedPosts = [...filteredPosts];
        const statusPriority = { TODO: 1, ACTIVE: 2, DONE: 3 } as any;

        if (metric === 'rating') {
            sortedPosts.sort((a, b) => sortState.rating ? a.rating - b.rating : b.rating - a.rating);
        } else if (metric === 'title') {
            sortedPosts.sort((a, b) => {
                const c = a.title.toUpperCase().localeCompare(b.title.toUpperCase());
                return sortState.title ? c : -c;
            });
        } else if (metric === 'type') {
            sortedPosts.sort((a, b) => {
                const c = a.type.toUpperCase().localeCompare(b.type.toUpperCase());
                return sortState.type ? c : -c;
            });
        } else if (metric === 'status') {
            sortedPosts.sort((a, b) => {
                const ap = statusPriority[a.status?.toUpperCase()] ?? 999;
                const bp = statusPriority[b.status?.toUpperCase()] ?? 999;
                return sortState.status ? ap - bp : bp - ap;
            });
        }

        setFilteredPosts(sortedPosts);
        setSortState(prev => ({
            ...Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: true }), {} as typeof prev),
            [metric]: !prev[metric as keyof typeof prev],
        }));
    };

    const deletePost = async (slug: string) => {
        try {
            setError(null);
            const url = new URL('/api/posts/remove_post', config.apiUri);
            const response = await fetch(url.toString(), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug }),
            });
            if (!response.ok) setError('Failed to delete review');
        } catch (err: any) {
            setError('Network error: ' + err.message);
        }
    };

    const fetchPosts = async () => {
        try {
            setError(null);
            const url = new URL('/api/posts', config.apiUri);
            const response = await fetch(url.toString());
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
                setFilteredPosts(data);
            } else {
                setError('Failed to fetch posts');
            }
        } catch {
            setError('Network error');
        }
    };

    useEffect(() => { fetchPosts(); }, []);

    // ── Derived ──────────────────────────────────────────────────────
    const displayPosts = typeFilter
        ? filteredPosts.filter((p: any) => p.type === typeFilter)
        : filteredPosts;

    // ── Renderers ────────────────────────────────────────────────────
    const renderGrid = () => (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
            {displayPosts.length > 0
                ? displayPosts.map((post: any) => (
                    <ReviewGridCard
                        key={post.slug}
                        review={post}
                        onEdit={handleEdit}
                    />
                ))
                : <p className="col-span-full text-sm text-nier-text-dark/50 py-4">No reviews found.</p>
            }
        </div>
    );

    const renderList = () => (
        <div className="overflow-auto">
            <div className="min-w-[48rem]">
                <div className="grid grid-cols-6 bg-nier-150 text-center h-10 px-4 border-b border-b-nier-dark/50">
                    <div className="col-span-2 flex items-center justify-center"><p className="text-sm uppercase tracking-wide select-none">Title</p></div>
                    <div className="col-span-1 flex items-center justify-center"><p className="text-sm uppercase tracking-wide select-none">Type</p></div>
                    <div className="col-span-1 flex items-center justify-center"><p className="text-sm uppercase tracking-wide select-none">Rating</p></div>
                    <div className="col-span-1 flex items-center justify-center"><p className="text-sm uppercase tracking-wide select-none">Status</p></div>
                    <div className="flex items-center justify-center"><p className="text-sm uppercase tracking-wide select-none">Actions</p></div>
                </div>
                <ul className="h-100 overflow-y-scroll">
                    {displayPosts.map((post: any) => (
                        <ReviewPreview
                            key={post.slug}
                            review={post}
                            deletePost={deletePost}
                            onDelete={fetchPosts}
                            onEdit={handleEdit}
                            onStatusUpdate={updatePostStatus}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );

    return (
        <article>
            {/* Toolbar */}
            <header className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between px-4 py-4 border-b border-b-nier-dark/50">
                <TextField label="Search" value={query} onChange={setQuery} />
                <div className="flex gap-2 items-center flex-shrink-0">
                    {/* View toggle */}
                    <div className="flex h-10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-2 px-3 cursor-pointer transition-colors duration-150 ${
                                viewMode === 'grid' ? 'bg-nier-dark' : 'bg-nier-150 hover:bg-nier-150/60'
                            }`}
                        >
                            <ion-icon name="grid-outline" style={{ color: viewMode === 'grid' ? '#C4BEAC' : 'inherit' }}></ion-icon>
                            <p className={`text-sm ${viewMode === 'grid' ? 'text-nier-text-light' : ''}`}>Grid</p>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-3 cursor-pointer transition-colors duration-150 ${
                                viewMode === 'list' ? 'bg-nier-dark' : 'bg-nier-150 hover:bg-nier-150/60'
                            }`}
                        >
                            <ion-icon name="list-outline" style={{ color: viewMode === 'list' ? '#C4BEAC' : 'inherit' }}></ion-icon>
                            <p className={`text-sm ${viewMode === 'list' ? 'text-nier-text-light' : ''}`}>List</p>
                        </button>
                    </div>
                    <div className="h-10">
                        <Button handleClick={handleAdd} label="Add Review" type="primary" />
                    </div>
                </div>
            </header>

            {/* Type filter · Sort · Entry count */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2 border-b border-b-nier-dark/20">
                {/* Type tabs */}
                <div className="flex gap-1 flex-wrap">
                    {TYPE_FILTERS.map(({ key, label, icon }) => (
                        <button
                            key={key ?? 'all'}
                            onClick={() => setTypeFilter(key ?? null)}
                            className={`flex items-center gap-1.5 px-3 py-1 text-sm cursor-pointer transition-colors duration-150 ${
                                typeFilter === key
                                    ? 'bg-nier-dark text-nier-text-light'
                                    : 'bg-nier-150/60 hover:bg-nier-150'
                            }`}
                        >
                            {icon && (
                                <ion-icon
                                    name={icon}
                                    style={{ color: typeFilter === key ? '#C4BEAC' : 'inherit', fontSize: '13px' }}
                                ></ion-icon>
                            )}
                            <span className={typeFilter === key ? 'text-nier-text-light' : ''}>{label}</span>
                        </button>
                    ))}
                </div>

                {/* Sort + entry count */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs text-nier-text-dark/40 uppercase tracking-wide mr-0.5">Sort</p>
                    {(['title', 'type', 'rating', 'status'] as const).map(metric => (
                        <button
                            key={metric}
                            onClick={() => sortPosts(metric)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-nier-150/60 hover:bg-nier-150 transition-colors duration-150 cursor-pointer capitalize"
                        >
                            {metric}
                            <ion-icon
                                name={sortState[metric] ? 'caret-down-sharp' : 'caret-up-sharp'}
                                style={{ fontSize: '10px' }}
                            ></ion-icon>
                        </button>
                    ))}
                    <p className="text-xs text-nier-text-dark/50 italic whitespace-nowrap ml-2">{displayPosts.length} entries</p>
                </div>
            </div>

            <ReviewModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                onReviewAdded={fetchPosts}
                editingReview={editMode}
            />

            {error && <p className="px-4 py-2 text-red-700 text-sm">{error}</p>}

            {viewMode === 'grid' ? renderGrid() : renderList()}
        </article>
    );
};
