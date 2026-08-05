import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router";
import { useParams } from "react-router";
import PageHeader from "../../components/common/PageHeader";
import { backend } from "../../api/backend";
import { normaliseReview } from "../../store/reviews";
import Loader from "../../components/common/Loader";
import type { AudioTrack } from "../../types";
import AudioPlayer from "./AudioPlayer";
import { useStageState } from "../../context/BootSequenceContext";
import { useRevealTimeline } from "../../hooks/useRevealTimeline";
import { fade, wipe } from "../../utils/motion";
import { usePanelHeight } from "../../hooks/usePanelHeight";
import { Panel } from "../../components/common/Panel";
import { enterClass } from "../../utils/animations";
import { ReviewCover } from "../../components/review/ReviewCover";
// Every tab in the reference carries a glyph as well as a word, and the glyph
// is what you navigate by once you know the menu. Shared with the Backlog,
// which marks a Review with the sections it has written, so a section looks
// the same wherever it is named.
import { SECTION_GLYPH, writtenSections } from "../../utils/critique";
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


/**
 * One tab of the reference's top menu bar — the one screen element this site
 * had an exact analogue for and wasn't using.
 *
 * The two state screenshots are specific about what the bar does. Hover is a
 * light fill with a dark hairline and a caret pointing in from the left.
 * Selected is inverted *and taller*: it hangs below the rule the other tabs
 * sit on, with a small foot under it. That vertical break is what makes the
 * selected tab read as attached to the panel below rather than as one more
 * button — which is exactly the relationship these tabs have to the critique.
 */
const Tab = ({ id, label, active, onSelect }: {
    id: string;
    label: string;
    active: boolean;
    onSelect: () => void;
}) => (
    // The group is the wrapper rather than the button, because the caret sits
    // outside the tab it points at — in the gap the reference leaves for it.
    <div className="group/tab relative flex-shrink-0">
        <span
            aria-hidden="true"
            className={`absolute -left-2.5 top-3 -translate-y-1/2 text-[9px] text-nier-text-dark transition-opacity duration-150 ${
                active ? 'opacity-0' : 'opacity-0 group-hover/tab:opacity-100'
            }`}
        >
            ➤
        </span>
        <button
            onClick={onSelect}
            aria-pressed={active}
            className={`relative z-10 flex items-center gap-1.5 px-2.5 cursor-pointer transition-colors duration-150 ${
                active
                    // Two units taller than the rest of the row, which is what
                    // takes it past the rule at top-6.
                    ? 'h-8 bg-nier-dark text-nier-text-light'
                    : 'h-6 bg-nier-150/60 border border-transparent hover:bg-nier-100-lighter hover:border-nier-dark'
            }`}
        >
            <span aria-hidden="true" className="text-[10px] leading-none opacity-70">
                {SECTION_GLYPH[id] ?? '▪'}
            </span>
            <span className="text-xs uppercase tracking-wide whitespace-nowrap">{label}</span>
        </button>
        {/* The foot under the selected tab. */}
        {active && (
            <span aria-hidden="true" className="absolute z-10 left-1/2 -translate-x-1/2 top-8 w-2 h-1 bg-nier-dark" />
        )}
    </div>
);

/**
 * What the caption bar says. The other two panels name their selection here;
 * on a page about one thing, the selection is which part of it you are
 * reading — and when there is no critique yet, that is worth saying rather
 * than leaving the bar to state the obvious.
 */
const captionFor = (title: string, activeTab: string, sectionCount: number): string => {
    if (sectionCount === 0) return `${title} — not written up yet`;
    const label = activeTab === 'mods'
        ? 'Mods'
        : reviewPropMap[activeTab as keyof typeof reviewPropMap] ?? activeTab;
    return `${title} — ${label}`;
};

/**
 * The reference's map screen annotates its list from below rather than
 * captioning it inline: a small grey label, a ❖-marked heading, and a line of
 * detail under both.
 *
 * That is the shape the release date and the creator were always in — one is a
 * name and the other is context for it — and they were being run together into
 * a single italic line at the foot of the panel, as far from the cover as the
 * layout could put them. Under the cover they are next to the thing they are
 * about.
 */
const Annotation = ({ label, name, detail }: {
    label: string;
    name: string;
    detail?: string;
}) => (
    <div className="flex flex-col gap-0.5 pt-2 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-widest text-nier-text-dark/40">{label}</p>
        <div className="border-t border-nier-text-dark/30 pt-1 flex items-baseline gap-1.5">
            <span aria-hidden="true" className="text-[10px] text-nier-text-dark/60">❖</span>
            <p className="text-sm uppercase tracking-wide truncate">{name}</p>
        </div>
        {detail && (
            <p className="text-xs text-nier-text-dark/60 pl-4">{detail}</p>
        )}
    </div>
);

const ReviewDetail = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    // See Search/index.tsx — waits for the boot sequence's 'header' stage
    // before its first ever reveal, true immediately on every navigation
    // after that.
    const { active: contentActive } = useStageState('header');

    const [loading,   setLoading]   = useState<boolean>(false);
    const [error,     setError]     = useState<string | null>(null);
    const [data,      setData]      = useState<any>(null);
    const [activeTab, setActiveTab] = useState<string>('');
    const [mods,        setMods]        = useState<Mod[]>([]);
    const [tracks,      setTracks]      = useState<AudioTrack[]>([]);
    const [screenshots, setScreenshots] = useState<{ _id: string; url: string; title?: string }[]>([]);
    const [selectedImg, setSelectedImg] = useState<{ url: string; title?: string } | null>(null);
    const [parent]                  = useState(location.pathname.split('/')[1]);
    const { slug }                  = useParams<{ category: string; slug: string }>();
    // The same entrance the grid panel uses: the frame wipes in and its
    // header follows a beat behind. The Panel is keyed on `slug`, so moving
    // between reviews remounts it and the timeline is built afresh — that is
    // what the old resetKey argument was for.
    const scope = useRef<HTMLDivElement>(null);
    useRevealTimeline(contentActive, (tl) => {
        wipe(tl, '[data-panel-surface]');
        fade(tl, '[data-detail-chrome]', '<0.2');
    }, scope);
    const { ref: panelRef, maxHeight } = usePanelHeight<HTMLElement>();

    const handleClose   = () => navigate(`/${parent}`);
    const filterByGenre = (genre: string) => navigate(`/${parent}?genre=${genre}`);

    useEffect(() => {
        if (!slug) return;
        const fetchPost = async () => {
            try {
                setLoading(true);
                setError(null);
                const d = await backend.getReviews({ slug });
                // This page is the one surface that does not read the shared
                // collection — it fetches its own record by slug — so the
                // store's coercion never touches it and it applies the same
                // one itself. Without this, `rating` here is whatever the API
                // sent, which for most records is a string.
                setData(d[0] ? normaliseReview(d[0]) : d[0]);
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
        const entries = writtenSections(data);
        const loadedMods: Mod[] = data.mods ?? [];
        setMods(loadedMods);
        if (entries.length > 0) setActiveTab(entries[0]);
        else if (loadedMods.length > 0) setActiveTab('mods');

        backend.getAudioTracks(data._id).then(setTracks).catch(() => { /* network error */ });
        backend.getImages(data._id, 'screenshot').then(setScreenshots).catch(() => { /* network error */ });
    }, [data]);


    if (loading) return <Loader />;
    if (error)   return <div className="mt-5">Error: {error}</div>;
    if (!data)   return null;

    const creator = data.creator || data.director || data.author || data.developers?.[0] || '—';
    // The sections that were written, in the order the Category lists them
    // rather than alphabetically. `writtenSections` is the one place that
    // decides what "written" means; this page used to answer it twice, in two
    // slightly different ways, a few lines apart.
    const reviewEntries = writtenSections(data)
        .map(key => [key, data.review[key] as string] as [string, string]);

    const activeContent = reviewEntries.find(([k]) => k === activeTab)?.[1] ?? '';

    // The tabs in the order they are rendered, so "section 3 of 7" counts the
    // same things the bar shows and in the same order the eye reads them.
    // Mods are a tab on a game that has any, and are not a section of the
    // critique anywhere else.
    const sections = [
        ...reviewEntries.map(([key]) => key),
        ...(data.type === 'game' && mods.length > 0 ? ['mods'] : []),
    ];
    const sectionCount = sections.length;
    const sectionPosition = Math.max(sections.indexOf(activeTab) + 1, 1);

    return (
        <>
            <PageHeader name={data.title} />

            <Panel
                key={slug}
                wrapperRef={scope}
                wrapperClassName="mt-5"
                className="bg-nier-100 md:h-[34rem]"
                style={maxHeight ? { maxHeight } : undefined}
                frameRef={panelRef}
            >

                    {/* ── Header bar ─────────────────────────────────── */}
                    <div data-detail-chrome className="h-10 bg-nier-150 flex items-stretch flex-shrink-0">
                        <div className="flex items-center gap-2 px-4 flex-1 min-w-0">
                            <ion-icon name={TYPE_ICON[data.type]} style={{ flexShrink: 0 }}></ion-icon>
                            <h3 className="text-nier-text-dark text-lg truncate uppercase tracking-wide">
                                {data.title}
                            </h3>
                        </div>
                        {/* Unfinished work has no rating yet, and rendering
                            the absence as a bare 0 reads as a score. Empty
                            critique sections already self-hide; this is the
                            part that didn't.

                            Keyed on Status rather than on the number being
                            falsy: unrated work stores a 0, and so does work
                            genuinely rated 0. Only Status tells them apart. */}
                        {data.status === 'done' && data.rating != null && (
                            <div className="bg-nier-dark flex items-center justify-center px-4 flex-shrink-0">
                                <p className="text-nier-text-light text-lg leading-none font-medium">{data.rating}</p>
                            </div>
                        )}
                        <button
                            onClick={handleClose}
                            className="px-4 text-2xl leading-none cursor-pointer flex items-center hover:bg-nier-dark hover:text-nier-text-light transition-colors duration-150"
                        >×</button>
                    </div>

                    {/* ── Body ───────────────────────────────────────── */}
                    {/* The gutter rail is the one piece of the frame every
                        reference screen shares, whatever is inside it. */}
                    <div data-detail-chrome className="p-4 flex gap-4 flex-1 min-h-0">

                        <div aria-hidden="true" className="hidden md:flex w-1 flex-shrink-0 flex-col">
                            <span className="w-full flex-[2] bg-nier-shadow" />
                            <span className="w-full flex-[5] bg-nier-150/50" />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

                        {/* Cover, and directly under it the two facts that are
                            about the cover — which is the arrangement the map
                            screen uses, and where the footer's italic line
                            should have been all along. */}
                        <div className="md:w-72 flex-shrink-0 flex flex-col min-h-0">
                            {/* Full colour, not the card treatment: a grid tints
                                its covers so it reads as one surface, but you have
                                opened this one, and here the art is the point. */}
                            <div className="h-56 md:h-auto md:flex-1 min-h-0">
                                <ReviewCover imagePath={data.image_path} fill full />
                            </div>
                            <Annotation
                                label={data.type}
                                name={creator}
                                detail={data.release_date?.trim() || undefined}
                            />
                        </div>

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
                                <div className="flex flex-col flex-1 min-h-0">

                                    {/* The menu bar. The rule sits at the
                                        height of an unselected tab and runs
                                        behind the row, so the selected tab —
                                        two units taller — visibly crosses it.
                                        min-h-9 keeps the row from changing
                                        height as selection moves. */}
                                    <div className="relative flex items-start gap-2.5 flex-wrap min-h-9 flex-shrink-0 pb-1">
                                        <span aria-hidden="true" className="absolute left-0 right-0 top-6 h-px bg-nier-text-dark/25" />
                                        {reviewEntries.map(([key]) => (
                                            <Tab
                                                key={key}
                                                id={key}
                                                label={reviewPropMap[key as keyof typeof reviewPropMap] ?? key}
                                                active={activeTab === key}
                                                onSelect={() => setActiveTab(key)}
                                            />
                                        ))}
                                        {data.type === 'game' && mods.length > 0 && (
                                            <Tab
                                                id="mods"
                                                label={`Mods (${mods.length})`}
                                                active={activeTab === 'mods'}
                                                onSelect={() => setActiveTab('mods')}
                                            />
                                        )}
                                    </div>

                                    {/* The reference's middle column is not a
                                        bare pane — it is a framed box with a
                                        title bar of its own naming what is in
                                        it, and a count in its bottom right.
                                        Which section of how many is the honest
                                        version of that count here: it says how
                                        much of the critique you have seen,
                                        which nothing else on the page does. */}
                                    <div className="relative flex-1 min-h-0 flex flex-col border border-nier-150 bg-nier-100-lighter">
                                        <div className="h-7 bg-nier-150 flex items-center justify-between px-3 flex-shrink-0">
                                            <span className="text-[10px] uppercase tracking-widest text-nier-text-dark">
                                                {activeTab === 'mods'
                                                    ? 'Installed Mods'
                                                    : reviewPropMap[activeTab as keyof typeof reviewPropMap] ?? activeTab}
                                            </span>
                                        </div>

                                        {activeTab === 'mods' ? (
                                            <ul className="flex-1 min-h-0 overflow-y-auto flex flex-col">
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
                                        ) : (
                                            <div className="flex-1 overflow-y-auto p-3 min-h-0 flex flex-col gap-3">
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
                                                {activeTab === 'graphics' && screenshots.length > 0 && (
                                                    <div className="border-t border-nier-150 pt-2 flex gap-2 overflow-x-auto pb-1">
                                                        {screenshots.map(img => (
                                                            <button
                                                                key={img._id}
                                                                onClick={() => setSelectedImg(img)}
                                                                className="shrink-0 h-24 aspect-video bg-nier-150/20 overflow-hidden block cursor-pointer hover:opacity-80 transition-opacity"
                                                                title={img.title}
                                                            >
                                                                <img
                                                                    src={img.url}
                                                                    alt={img.title || 'Screenshot'}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* The reference's 所持数 3/99, in the
                                            corner it puts it in. */}
                                        <p className="flex-shrink-0 text-right text-[10px] uppercase tracking-widest text-nier-text-dark/50 px-3 py-1.5 border-t border-nier-150/60">
                                            Section {sectionPosition} / {sectionCount}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>

                    {/* ── Caption bar ────────────────────────────────── */}
                    {/* What every reference screen ends with, and what the two
                        other panels on this site already end with: what you
                        are looking at on the left, what you can do about it on
                        the right. It replaces an italic line that repeated the
                        release date and the creator, both of which now sit
                        under the cover they belong to. */}
                    <div data-detail-chrome className="flex-shrink-0 border-t border-nier-150 flex items-center gap-3 px-4 py-2">
                        <span aria-hidden="true" className="w-1 h-5 bg-nier-dark flex-shrink-0" />
                        <p className="text-xs uppercase tracking-wide truncate text-nier-text-dark/70">
                            {captionFor(data.title, activeTab, sectionCount)}
                        </p>
                        <p className="ml-auto flex-shrink-0 text-xs uppercase tracking-wide text-nier-text-dark/50">
                            <span className="hidden sm:inline">↔ Section&nbsp;&nbsp;&nbsp;</span>✕ Back
                        </p>
                    </div>

            </Panel>
            {selectedImg && createPortal(
                <div
                    className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 ${enterClass('nier-backdrop-enter')}`}
                    onClick={() => setSelectedImg(null)}
                >
                    <div
                        className="relative w-full max-w-4xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="absolute w-full h-full bg-nier-dark top-1 left-1" />
                        <article className="bg-nier-100-lighter relative flex flex-col">
                            <div className="h-10 bg-nier-150 flex items-center justify-between px-5 flex-shrink-0">
                                <span className="text-nier-text-dark text-sm uppercase tracking-widest truncate">
                                    {selectedImg.title || 'Screenshot'}
                                </span>
                                <button
                                    onClick={() => setSelectedImg(null)}
                                    className="text-3xl leading-none cursor-pointer hover:text-nier-dark transition-colors ml-4 flex-shrink-0"
                                >×</button>
                            </div>
                            <div className="bg-nier-100 p-2">
                                <img
                                    src={selectedImg.url}
                                    alt={selectedImg.title || 'Screenshot'}
                                    className="w-full max-h-[80vh] object-contain block"
                                />
                            </div>
                        </article>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default ReviewDetail;
