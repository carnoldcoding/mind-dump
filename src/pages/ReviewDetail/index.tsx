import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useParams } from "react-router";
import PageHeader from "../../components/common/PageHeader";
import config from "../../config";
import Loader from "../../components/common/Loader";
import type { AudioTrack } from "../../types";
import AudioPlayer from "./AudioPlayer";
type Mod = { name: string; author?: string; url?: string; notes?: string };

const TYPE_ICON: Record<string, string> = {
    game:   'game-controller-sharp',
    cinema: 'videocam-sharp',
    book:   'book-sharp',
};

const reviewPropMap = {
    story:          'Story',
    gameplay:       'Gameplay',
    graphics:       'Graphics',
    sound:          'Sound',
    world:          'World',
    characters:     'Characters',
    writing:        'Writing',
    cinematography: 'Cinematography',
    casting:        'Casting',
} as const;

const ReviewDetail = () => {
    const navigate  = useNavigate();
    const location  = useLocation();

    const [loading,   setLoading]   = useState<boolean>(false);
    const [error,     setError]     = useState<string | null>(null);
    const [data,      setData]      = useState<any>(null);
    const [activeTab, setActiveTab] = useState<string>('');
    const [mods,      setMods]      = useState<Mod[]>([]);
    const [tracks,    setTracks]    = useState<AudioTrack[]>([]);
    const [parent]                  = useState(location.pathname.split('/')[1]);
    const { slug }                  = useParams<{ category: string; slug: string }>();

    const handleClose   = () => navigate(`/${parent}`);
    const filterByGenre = (genre: string) => navigate(`/${parent}?genre=${genre}`);

    useEffect(() => {
        if (!slug) return;
        const fetchPost = async () => {
            try {
                setLoading(true);
                setError(null);
                const url = new URL('/api/posts', config.apiUri);
                url.searchParams.set('slug', slug);
                const response = await fetch(url.toString());
                if (response.ok) {
                    const d = await response.json();
                    setData(d[0]);
                } else {
                    setError('Failed to fetch post');
                }
            } catch {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, []);

    // Set initial tab and mods once data loads, then fetch audio tracks
    useEffect(() => {
        if (!data) return;
        const entries = Object.entries(data.review ?? {}).filter(([, v]) => (v as string).length > 0);
        const loadedMods: Mod[] = data.mods ?? [];
        setMods(loadedMods);
        if (entries.length > 0) setActiveTab(entries[0][0]);
        else if (loadedMods.length > 0) setActiveTab('mods');

        const fetchTracks = async () => {
            try {
                const url = new URL("/api/audio", config.apiUri);
                url.searchParams.set("post_id", data._id);
                const res = await fetch(url.toString());
                if (res.ok) setTracks(await res.json());
            } catch { /* network error */ }
        };
        fetchTracks();
    }, [data]);


    if (loading) return <Loader />;
    if (error)   return <div className="mt-5">Error: {error}</div>;
    if (!data)   return null;

    const creator = data.creator || data.director || data.author || data.developers?.[0] || '—';
    const reviewEntries = Object.entries(data.review ?? {})
        .filter(([, v]) => (v as string).length > 0)
        .sort() as [string, string][];

    const activeContent = reviewEntries.find(([k]) => k === activeTab)?.[1] ?? '';

    return (
        <>
            <PageHeader name={data.title} />

            <div className="mt-5 relative nier-enter">
                <aside className="absolute w-full h-full bg-nier-shadow top-1 left-1" />

                <article className="bg-nier-100 relative flex flex-col md:h-[34rem]">

                    {/* ── Header bar ─────────────────────────────────── */}
                    <div className="h-10 bg-nier-150 flex items-stretch flex-shrink-0">
                        <div className="flex items-center gap-2 px-4 flex-1 min-w-0">
                            <ion-icon name={TYPE_ICON[data.type]} style={{ flexShrink: 0 }}></ion-icon>
                            <h3 className="text-nier-text-dark text-lg truncate uppercase tracking-wide">
                                {data.title}
                            </h3>
                        </div>
                        <div className="bg-nier-dark flex items-center justify-center px-4 flex-shrink-0">
                            <p className="text-nier-text-light text-lg leading-none font-medium">{data.rating}</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="px-4 text-2xl leading-none cursor-pointer flex items-center hover:bg-nier-dark hover:text-nier-text-light transition-colors duration-150"
                        >×</button>
                    </div>

                    {/* ── Body ───────────────────────────────────────── */}
                    <div className="p-4 flex flex-col md:flex-row gap-4 flex-1 min-h-0">

                        {/* Cover image */}
                        <div
                            className="h-56 md:h-full md:w-72 bg-cover bg-center bg-nier-150 flex-shrink-0"
                            style={data.image_path ? { backgroundImage: `url(${data.image_path})` } : {}}
                        />

                        {/* Right column */}
                        <div className="flex-1 flex flex-col gap-3 min-h-0">

                            {/* Genres */}
                            <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                                {data.genres?.map((genre: string) => (
                                    <button
                                        key={genre}
                                        onClick={() => filterByGenre(genre)}
                                        className="px-2 py-0.5 bg-nier-150/60 text-xs cursor-pointer hover:bg-nier-150 transition-colors duration-150"
                                    >
                                        {genre}
                                    </button>
                                ))}
                            </div>

                            {/* Description */}
                            <p className="text-sm leading-relaxed flex-shrink-0">{data.description}</p>

                            {/* Analysis tabs */}
                            {(reviewEntries.length > 0 || mods.length > 0) && (
                                <div className="flex flex-col flex-1 min-h-0 gap-0">
                                    <div className="flex flex-wrap gap-px flex-shrink-0">
                                        {reviewEntries.map(([key]) => (
                                            <button
                                                key={key}
                                                onClick={() => setActiveTab(key)}
                                                className={`px-3 py-1 text-xs cursor-pointer transition-colors duration-150 ${
                                                    activeTab === key
                                                        ? 'bg-nier-dark text-nier-text-light'
                                                        : 'bg-nier-150/60 hover:bg-nier-150'
                                                }`}
                                            >
                                                {reviewPropMap[key as keyof typeof reviewPropMap] ?? key}
                                            </button>
                                        ))}
                                        {data.type === 'game' && mods.length > 0 && (
                                            <button
                                                onClick={() => setActiveTab('mods')}
                                                className={`px-3 py-1 text-xs cursor-pointer transition-colors duration-150 ${
                                                    activeTab === 'mods'
                                                        ? 'bg-nier-dark text-nier-text-light'
                                                        : 'bg-nier-150/60 hover:bg-nier-150'
                                                }`}
                                            >
                                                Mods{mods.length > 0 ? ` (${mods.length})` : ''}
                                            </button>
                                        )}
                                    </div>

                                    {activeTab === 'mods' ? (
                                        <div className="flex-1 min-h-0 overflow-y-auto p-3">
                                            <div className="border border-nier-150 relative">
                                                <aside className="absolute w-full h-full bg-nier-shadow -z-1 top-0.5 left-0.5" />
                                                <div className="h-6 bg-nier-150 flex items-center justify-between px-3">
                                                    <span className="text-[10px] uppercase tracking-widest text-nier-text-dark">Installed Mods</span>
                                                    <span className="text-[10px] text-nier-text-dark/50">{mods.length}/{mods.length}</span>
                                                </div>
                                                <ul className="flex flex-col">
                                                    {mods.map((mod, i) => (
                                                        <li key={i} className="border-t border-nier-150/40 first:border-t-0">
                                                            {(() => {
                                                                const rowClass = `flex items-center gap-2 px-3 py-1.5 transition-colors group ${mod.url ? 'cursor-pointer hover:bg-nier-150/50' : 'hover:bg-nier-150/30'}`;
                                                                const inner = (
                                                                    <>
                                                                        <span className="text-nier-text-dark/60 text-sm shrink-0">◎</span>
                                                                        <div className="flex flex-col flex-1 min-w-0">
                                                                            <span className="text-sm uppercase tracking-wide text-nier-text-dark truncate">{mod.name}</span>
                                                                            {mod.author && <span className="text-xs text-nier-text-dark/60">{mod.author}</span>}
                                                                        </div>
                                                                        <span className="text-xs text-nier-text-dark/60 font-mono shrink-0">[{String(i + 1).padStart(2, '0')}]</span>
                                                                    </>
                                                                );
                                                                return mod.url
                                                                    ? <a href={mod.url} target="_blank" rel="noreferrer" className={rowClass}>{inner}</a>
                                                                    : <div className={rowClass}>{inner}</div>;
                                                            })()}
                                                            {mod.notes && (
                                                                <p className="text-xs text-nier-text-dark/60 leading-relaxed px-8 pb-2 whitespace-pre-wrap">{mod.notes}</p>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto bg-nier-100-lighter p-3 min-h-0 flex flex-col gap-3">
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeContent}</p>
                                            {activeTab === 'sound' && tracks.length > 0 && (
                                                <ul className="flex flex-col border-t border-nier-150 pt-2">
                                                    {tracks.map((track, i) => (
                                                        <AudioPlayer
                                                            key={track._id}
                                                            src={track.url}
                                                            title={track.title}
                                                            index={i}
                                                        />
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Footer ─────────────────────────────────────── */}
                    <div className="h-px bg-nier-150 mx-4 flex-shrink-0" />
                    <div className="px-4 py-2 flex-shrink-0">
                        <p className="text-sm italic text-nier-text-dark/60">
                            {data.release_date} — {creator}
                        </p>
                    </div>

                </article>
            </div>
        </>
    );
};

export default ReviewDetail;
