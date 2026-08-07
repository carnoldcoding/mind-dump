import { TextField } from "../../../../components/common/TextField"
import { SelectField } from "../../../../components/common/SelectField"
import { DateField } from "../../../../components/common/DateField"
import { MutliSelectField } from "../../../../components/common/MultiSelectField"
import { BigTextField } from "../../../../components/common/BigTextField"
import { ImageTextField } from "../../../../components/common/ImageTextField"
import { useState, useEffect, useRef } from "react"
import { Button } from "../../../../components/common/Button"
import { backend } from "../../../../api/backend"
import { useMediaUpload } from "./useMediaUpload"
import { NumTextField } from "../../../../components/common/NumTextField"
import { transformKeysToSnakeCase } from "../../../../utils/helpers"
import { todayIso } from "../../../../utils/completionDate"
import { generateSlug } from "../../../../utils/slug"
import { toIsoDate } from "./migration"
import { gameGenres, movieGenres, bookGenres } from "../../../../utils/genres"
import { useRetained } from "../../../../hooks/useRetained"
import ModModal from "./ModModal"
import type { Mod } from "./ModModal"
import type { AudioTrack } from "../../../../types"
import { sectionsFor } from "../../../../utils/critique"
import AudioPlayer from "../../../ReviewDetail/AudioPlayer"
import { Modal } from "../../../../components/common/Modal"
import { TabBar } from "./TabBar"
import { FieldRow } from "./FieldRow"
import { DEFAULT_TAB, hintFor, resolveTab, tabsFor, type TabId } from "./tabs"
import { useRevealTimeline } from "../../../../hooks/useRevealTimeline"
import { domino } from "../../../../utils/motion"

interface BaseReview<TType extends string, TReview> {
    title: string;
    slug: string;
    type: TType;
    creator: string;
    description: string;
    releaseDate: string;
    dateCompleted: string;
    genres: string[];
    review: TReview;
    rating: number;
    imagePath: string;
    status: string;
}

interface GameReviewDetails   { story: string; gameplay: string; graphics: string; sound: string; }
interface CinemaReviewDetails { story: string; cinematography: string; casting: string; sound: string; }
interface BookReviewDetails   { story: string; world: string; characters: string; writing: string; }

interface GameReview   extends BaseReview<'game',   GameReviewDetails>   {}
interface CinemaReview extends BaseReview<'cinema', CinemaReviewDetails> {}
interface BookReview   extends BaseReview<'book',   BookReviewDetails>   {}

type Review     = GameReview | CinemaReview | BookReview;
type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

interface Arguments {
    isOpen: boolean;
    setIsOpen: any;
    onReviewAdded: any;
    editingReview?: any;
}

const EMPTY_REVIEW: Partial<Review> = {
    title: '', slug: '', description: '', releaseDate: '', dateCompleted: '',
    creator: '', genres: [], review: {} as any, rating: 0, imagePath: '', status: '',
};

export const ReviewModal = ({ isOpen, setIsOpen, onReviewAdded, editingReview }: Arguments) => {
    const [type, setType]               = useState<'game' | 'cinema' | 'book'>('game');
    const [review, setReview]           = useState<Partial<Review>>(EMPTY_REVIEW);
    const [creatorList, setCreatorList] = useState<string[]>([]);
    const [saveStatus, setSaveStatus]   = useState<SaveStatus>('idle');
    const [slugManual, setSlugManual]   = useState(false);
    const [deleteStage, setDeleteStage] = useState<'idle' | 'confirm'>('idle');
    const [deleteInput, setDeleteInput] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [mods, setMods]               = useState<Mod[]>([]);
    const [modModal, setModModal]       = useState<{ mod?: Mod; index?: number } | null>(null);
    const shownModModal                 = useRetained(modModal);
    const [tracks, setTracks]           = useState<AudioTrack[]>([]);
    const [uploadFile, setUploadFile]   = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const audioUpload = useMediaUpload('/api/audio/upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Sections ─────────────────────────────────────────────────────
    // What the reader asked for, which is not always what is showing: a
    // Category change can take a tab away underneath them. resolveTab decides.
    const [chosenTab, setChosenTab] = useState<TabId>(DEFAULT_TAB);
    const [hoveredTab, setHoveredTab] = useState<TabId | undefined>(undefined);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    /**
     * The id of a Review this modal created, so Media stops being dead on a
     * newly captured one. Autosave writes the record within seconds; without
     * keeping what the write returned there is nothing to file an upload
     * under, and the tab stayed unavailable for the whole session.
     */
    const [createdId, setCreatedId] = useState<string | null>(null);

    const [images, setImages]               = useState<{ _id: string; url: string; title?: string }[]>([]);
    const [imgFiles, setImgFiles]           = useState<File[]>([]);
    const [imgTitle, setImgTitle]           = useState('');
    const imageUpload = useMediaUpload('/api/images/upload');
    const imgFileInputRef = useRef<HTMLInputElement>(null);

    // Refs for values needed inside timer callbacks (avoids stale closures)
    const reviewRef        = useRef(review);
    const typeRef          = useRef(type);
    const modsRef          = useRef(mods);
    const editingReviewRef = useRef(editingReview);
    const isNewlySaved     = useRef(false);
    const autosaveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

    reviewRef.current        = review;
    typeRef.current          = type;
    modsRef.current          = mods;
    editingReviewRef.current = editingReview;

    // ── Body scroll lock ─────────────────────────────────────────────
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // ── Load / reset when modal opens or editing target changes ─────
    useEffect(() => {
        if (!isOpen) return;

        if (editingReview) {
            setReview({
                title:         editingReview.title         || '',
                slug:          editingReview.slug          || '',
                description:   editingReview.description   || '',
                // The control is a native <input type="date">, which only
                // understands ISO and renders blank for anything else — so a
                // US-format release date showed as empty and silently cleared
                // itself on the next save. Stored release dates are a mix of
                // both formats; converting on the way in means editing one
                // leaves it canonical.
                releaseDate:   toIsoDate(editingReview.release_date || '') || '',
                dateCompleted: editingReview.date_completed || '',
                creator:       editingReview.creator || editingReview.developers?.[0] || editingReview.director || editingReview.author || '',
                genres:        editingReview.genres        || [],
                review:        editingReview.review        || {} as any,
                rating:        editingReview.rating        || 0,
                imagePath:     editingReview.image_path    || '',
                status:        editingReview.status        || '',
            });
            setType(editingReview.type || 'game');
            setMods(editingReview.mods ?? []);
            setSlugManual(true);     // existing slug — don't auto-override
            fetchTracks(editingReview._id);
            fetchImages(editingReview._id);
        } else {
            setReview(EMPTY_REVIEW);
            setType('game');
            setMods([]);
            setTracks([]);
            setUploadFile(null);
            setUploadTitle('');
            setImages([]);
            setImgFiles([]);
            setImgTitle('');
            setSlugManual(false);
            isNewlySaved.current = false;
            setCreatedId(null);
        }

        // Every open starts on Data. The editor is opened from a list, so
        // where the last Review was left says nothing about this one.
        setChosenTab(DEFAULT_TAB);
        setFocusedField(null);
        setSaveStatus('idle');
    }, [editingReview, isOpen]);

    const genreOptions = type === 'game' ? gameGenres : type === 'cinema' ? movieGenres : bookGenres;

    // ── Fetch creators when type changes ─────────────────────────────
    useEffect(() => {
        backend.getCreators(type).then(setCreatorList).catch(() => { /* silently ignore */ });
    }, [type]);

    // ── Autosave: 2.5s after last change ────────────────────────────
    useEffect(() => {
        if (!isOpen || !review.title?.trim() || !review.slug?.trim()) return;

        setSaveStatus('unsaved');

        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
            const isUpdate = !!editingReviewRef.current || isNewlySaved.current;
            performSave(reviewRef.current, typeRef.current, isUpdate, false);
        }, 2500);

        return () => {
            if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        };
    }, [review, type, isOpen]);

    // ── Core save function ───────────────────────────────────────────
    const performSave = async (
        currentReview: Partial<Review>,
        currentType: string,
        isUpdate: boolean,
        closeAfter: boolean,
    ) => {
        const parsed = transformKeysToSnakeCase(currentReview);

        setSaveStatus('saving');

        try {
            const written = await backend.saveReview(
                { ...parsed, type: currentType, mods: modsRef.current },
                isUpdate,
            );
            setSaveStatus('saved');
            isNewlySaved.current = true;
            // add_post answers with the id it inserted. Keeping it is what
            // lets Media open on a Review this modal has only just created —
            // uploads are filed under it, and until now the response was
            // dropped and the tab stayed shut until a reopen.
            if (!isUpdate && written?.id) setCreatedId(String(written.id));
            if (closeAfter) {
                onReviewAdded();
                resetAndClose();
            } else {
                setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2500);
            }
        } catch {
            setSaveStatus('error');
        }
    };

    const resetAndClose = () => {
        setReview(EMPTY_REVIEW);
        setType('game');
        setMods([]);
        setModModal(null);
        setSlugManual(false);
        isNewlySaved.current = false;
        setSaveStatus('idle');
        setDeleteStage('idle');
        setDeleteInput('');
        setDeleteError('');
        setIsOpen(false);
    };

    const handleDelete = async () => {
        if (deleteInput !== editingReview?.slug) {
            setDeleteError('Incorrect keyword');
            return;
        }
        try {
            await backend.deleteReview(editingReview.slug);
            onReviewAdded();
            resetAndClose();
        } catch {
            setDeleteError('Delete failed');
        }
    };

    // Close: flush unsaved changes first, then refresh list
    const handleClose = async () => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

        if (saveStatus === 'unsaved' && review.title?.trim() && review.slug?.trim()) {
            const isUpdate = !!editingReview || isNewlySaved.current;
            await performSave(review, type, isUpdate, false);
        }

        onReviewAdded();
        resetAndClose();
    };

    const handleSave = () => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        const isUpdate = !!editingReview || isNewlySaved.current;
        performSave(review, type, isUpdate, true);
    };

    // ── Field handlers ───────────────────────────────────────────────
    const handleFieldChange = (field: string, value: any) => {
        const previousStatus = review.status;

        if (sectionsFor(type).includes(field)) {
            setReview(prev => ({
                ...prev,
                review: { ...(prev.review as any), [field]: value },
            }));
            return;
        }

        // Auto-generate slug from title (until user edits slug manually)
        if (field === 'title' && !slugManual) {
            setReview(prev => ({ ...prev, title: value, slug: generateSlug(value) }));
            return;
        }

        // Auto-set dateCompleted when status flips to done. ISO, because this
        // is the value everything else orders by — see issue #18.
        if (field === 'status' && value === 'done' && previousStatus !== 'done') {
            setReview(prev => ({
                ...prev,
                status: value,
                dateCompleted: todayIso(),
            }));
            return;
        }

        setReview(prev => ({ ...prev, [field]: value }));
    };

    const handleSlugChange = (value: string) => {
        setSlugManual(true);
        setReview(prev => ({ ...prev, slug: value }));
    };

    const handleTypeChange = (newType: string) => {
        const t = newType as 'game' | 'cinema' | 'book';
        setType(t);
        const reviewDefaults: Record<'game' | 'cinema' | 'book', any> = {
            game:   { story: '', gameplay: '', graphics: '', sound: '' },
            cinema: { story: '', cinematography: '', casting: '', sound: '' },
            book:   { story: '', world: '', characters: '', writing: '' },
        };
        setReview(prev => ({
            title: prev.title, slug: prev.slug, description: prev.description,
            creator: prev.creator, releaseDate: prev.releaseDate,
            rating: prev.rating, status: prev.status, imagePath: prev.imagePath,
            genres: prev.genres, dateCompleted: prev.dateCompleted,
            review: reviewDefaults[t],
        } as Partial<Review>));
    };

    // ── Audio track helpers ──────────────────────────────────────────
    const fetchTracks = async (postId: string) => {
        backend.getAudioTracks(postId).then(setTracks).catch(() => { /* network error */ });
    };

    const handleAudioUpload = async () => {
        if (!uploadFile || !reviewId) return;
        const file  = uploadFile;
        const title = uploadTitle || file.name.replace(/\.[^.]+$/, '');

        const ok = await audioUpload.upload([file], () => {
            const form = new FormData();
            form.append('file', file);
            form.append('post_id', reviewId);
            form.append('title', title);
            return form;
        });

        if (ok) {
            setUploadFile(null);
            setUploadTitle('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchTracks(reviewId);
        }
    };

    const handleAudioDelete = async (trackId: string) => {
        try {
            await backend.deleteAudioTrack(trackId);
            setTracks(prev => prev.filter(t => t._id !== trackId));
        } catch { /* network error */ }
    };

    // ── Image helpers ────────────────────────────────────────────────
    const fetchImages = async (postId: string) => {
        backend.getImages(postId, 'screenshot').then(setImages).catch(() => { /* network error */ });
    };

    const handleImageUpload = async () => {
        if (!imgFiles.length || !reviewId) return;
        const total = imgFiles.length;

        await imageUpload.upload(imgFiles, file => {
            const form = new FormData();
            form.append('file', file);
            form.append('post_id', reviewId);
            form.append('type', 'screenshot');
            form.append('title', (total === 1 && imgTitle) ? imgTitle : file.name.replace(/\.[^.]+$/, ''));
            return form;
        });

        setImgFiles([]);
        setImgTitle('');
        if (imgFileInputRef.current) imgFileInputRef.current.value = '';
        fetchImages(reviewId);
    };

    const handleImageDelete = async (imageId: string) => {
        try {
            await backend.deleteImage(imageId);
            setImages(prev => prev.filter(img => img._id !== imageId));
        } catch { /* network error */ }
    };

    // ── What is showing ──────────────────────────────────────────────
    // Either the Review we were handed, or the one we have since written.
    const reviewId: string | null = editingReview?._id ?? createdId;
    const tabs = tabsFor({ type, saved: !!reviewId });
    const activeTab = resolveTab(chosenTab, tabs);
    const hint = hintFor({ field: focusedField, tab: activeTab, tabs, hovered: hoveredTab });

    // The rows of whichever section is open arrive one after another. Rebuilt
    // on the tab, which is what replays it — a different section is a
    // different entrance, not the same one at a different moment.
    //
    // `ready` is true rather than gated on the boot signal: the modal is not
    // part of the page's reveal, and Modal has already played it in.
    const panelScope = useRef<HTMLDivElement>(null);
    useRevealTimeline(
        isOpen,
        (timeline) => domino(timeline, '[data-tab-row]'),
        panelScope,
        [activeTab, isOpen],
    );

    if (!isOpen) return null;

    const saveLabel = (() => {
        if (saveStatus === 'saving')  return 'Saving…';
        if (saveStatus === 'unsaved') return 'Unsaved changes';
        if (saveStatus === 'saved')   return 'Saved';
        if (saveStatus === 'error')   return 'Save failed';
        return null;
    })();


    return (
        <Modal
            open={isOpen}
            onClose={() => setIsOpen(false)}
            label="Review"
            backdropClassName="z-[110] overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4"
            className="w-full max-w-4xl"
        >
            {/* One height whatever the section. The frame is the constant and
                its contents change inside it, so the bar and the hint line do
                not move under the pointer when a section is switched. */}
            <article className="bg-nier-100-lighter relative w-full h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-2rem)] sm:max-h-[46rem] flex flex-col">

                {/* Header. The section is a suffix in the reference's register:
                    the subject, then which part of it is open. */}
                <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5 flex-shrink-0 gap-3 min-w-0">
                    <h3 className="text-nier-text-dark text-xl uppercase tracking-wide truncate min-w-0">
                        {editingReview ? `Edit — ${editingReview.title}` : 'New Review'}
                        <span className="text-sm tracking-[0.2em] text-nier-text-dark/50 ml-3">
                            · {tabs.find(t => t.id === activeTab)?.label}
                        </span>
                    </h3>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={handleClose}
                        className="text-3xl leading-none cursor-pointer hover:text-nier-dark transition-colors duration-150 flex-shrink-0"
                    >×</button>
                </div>

                <TabBar tabs={tabs} active={activeTab} onSelect={setChosenTab} onHover={setHoveredTab} />

                <div
                    ref={panelScope}
                    role="tabpanel"
                    id={`review-panel-${activeTab}`}
                    aria-labelledby={`review-tab-${activeTab}`}
                    className="overflow-y-auto flex-1 px-4 py-4 flex flex-col gap-3"
                >
                    {activeTab === 'data' && (
                        <>
                            <FieldRow field="title" onFocusField={setFocusedField}>
                                <TextField
                                    label="Title"
                                    value={review.title || ''}
                                    onChange={(v: string) => handleFieldChange('title', v)}
                                />
                            </FieldRow>

                            <FieldRow field="slug" onFocusField={setFocusedField}>
                                <TextField label="Slug" value={review.slug || ''} onChange={handleSlugChange} />
                                {!slugManual && review.slug && (
                                    <p className="text-xs text-nier-text-dark/40 px-1 leading-none pt-0.5">auto-generated</p>
                                )}
                            </FieldRow>

                            {/* CONTEXT.md calls this a Category. `type` is the
                                field it is stored in, not the word for it. */}
                            <FieldRow field="type" onFocusField={setFocusedField}>
                                <SelectField
                                    label="Category"
                                    value={type}
                                    onChange={handleTypeChange}
                                    options={['game', 'cinema', 'book']}
                                />
                            </FieldRow>

                            <FieldRow field="creator" onFocusField={setFocusedField}>
                                <TextField
                                    label="Creator"
                                    value={review.creator || ''}
                                    autofillData={creatorList}
                                    onChange={(v: string) => handleFieldChange('creator', v)}
                                />
                            </FieldRow>

                            <FieldRow field="releaseDate" onFocusField={setFocusedField}>
                                <DateField
                                    label="Release Date"
                                    value={review.releaseDate || ''}
                                    onChange={(v) => handleFieldChange('releaseDate', v)}
                                />
                            </FieldRow>

                            <FieldRow field="status" onFocusField={setFocusedField}>
                                <SelectField
                                    label="Status"
                                    value={review.status}
                                    onChange={(v) => handleFieldChange('status', v)}
                                    options={['todo', 'active', 'done']}
                                />
                            </FieldRow>

                            <FieldRow field="rating" onFocusField={setFocusedField}>
                                <NumTextField
                                    label="Rating"
                                    value={review.rating?.toString() || ''}
                                    onChange={(v) => handleFieldChange('rating', v)}
                                />
                            </FieldRow>

                            <FieldRow field="genres" onFocusField={setFocusedField}>
                                <MutliSelectField
                                    label="Genres"
                                    options={genreOptions}
                                    value={review.genres || []}
                                    onChange={(v) => handleFieldChange('genres', v)}
                                />
                            </FieldRow>

                            <FieldRow field="imagePath" onFocusField={setFocusedField}>
                                <ImageTextField
                                    label="Image Path"
                                    value={review.imagePath || ''}
                                    onChange={(v) => handleFieldChange('imagePath', v)}
                                />
                            </FieldRow>

                            <FieldRow field="description" onFocusField={setFocusedField}>
                                <TextField
                                    label="Description"
                                    value={review.description || ''}
                                    onChange={(v: string) => handleFieldChange('description', v)}
                                />
                            </FieldRow>
                        </>
                    )}

                    {/* A Category offers at most four sections and requires
                        none of them, so nothing here counts what is written or
                        marks a section absent. See CONTEXT.md. */}
                    {activeTab === 'critique' && sectionsFor(type).map((field) => (
                        <FieldRow key={field} field={field} onFocusField={setFocusedField}>
                            <BigTextField
                                label={field}
                                value={(review.review as any)?.[field] || ''}
                                onChange={(v) => handleFieldChange(field, v)}
                            />
                        </FieldRow>
                    ))}

                    {activeTab === 'mods' && (
                        <>
                            <div data-tab-row className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-widest text-nier-text-dark/50">
                                    Mods{mods.length > 0 ? ` (${mods.length})` : ''}
                                </span>
                                <button
                                    onClick={() => setModModal({})}
                                    className="text-[10px] uppercase tracking-wide px-2 py-0.5 border border-nier-dark rounded-sm cursor-pointer hover:bg-nier-text-dark hover:text-nier-100-lighter transition-colors"
                                >
                                    + Add
                                </button>
                            </div>
                            {mods.length === 0 ? (
                                <p data-tab-row className="text-xs text-nier-text-dark/35 italic">No mods added.</p>
                            ) : (
                                <ul className="flex flex-col divide-y divide-nier-150/30 border border-nier-150">
                                    {mods.map((mod, i) => (
                                        <li key={i} data-tab-row className="flex items-center justify-between gap-3 px-3 py-2 group hover:bg-nier-150/20 transition-colors">
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <span className="text-sm text-nier-text-dark truncate">{mod.name}</span>
                                                {mod.author && <span className="text-xs text-nier-text-dark/50">{mod.author}</span>}
                                            </div>
                                            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={() => setModModal({ mod, index: i })}
                                                    className="text-sm text-nier-text-dark/40 hover:text-nier-text-dark cursor-pointer transition-colors"
                                                >✎</button>
                                                <button
                                                    onClick={() => setMods(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="text-sm text-nier-text-dark/30 hover:text-red-800 cursor-pointer transition-colors"
                                                >×</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}

                    {activeTab === 'media' && (
                        <>
                            <span data-tab-row className="text-[10px] uppercase tracking-widest text-nier-text-dark/50">
                                Screenshots{images.length > 0 ? ` (${images.length})` : ''}
                            </span>

                            {images.length > 0 && (
                                <div data-tab-row className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {images.map(img => (
                                        <div key={img._id} className="relative group aspect-video bg-nier-150/20 overflow-hidden">
                                            <a href={img.url} target="_blank" rel="noreferrer">
                                                <img src={img.url} alt={img.title || 'Screenshot'} className="w-full h-full object-cover" />
                                            </a>
                                            <button
                                                onClick={() => handleImageDelete(img._id)}
                                                className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-800"
                                            >×</button>
                                            {img.title && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[10px] text-white truncate block">{img.title}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div data-tab-row className="flex flex-col gap-1.5">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div
                                        className="sm:flex-1 flex items-center gap-2 px-3 h-9 border border-dashed border-nier-150 cursor-pointer hover:bg-nier-150/20 transition-colors"
                                        onClick={() => imgFileInputRef.current?.click()}
                                    >
                                        <span className="text-sm text-nier-text-dark/80 truncate flex-1">
                                            {imgFiles.length === 0 ? 'Select images...' : imgFiles.length === 1 ? imgFiles[0].name : `${imgFiles.length} files selected`}
                                        </span>
                                        <span className="text-xs uppercase tracking-widest text-nier-text-dark/50 shrink-0">Browse</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {imgFiles.length <= 1 && (
                                            <input
                                                type="text"
                                                placeholder="Title (opt)"
                                                value={imgTitle}
                                                onChange={e => setImgTitle(e.target.value)}
                                                className="flex-1 sm:w-36 sm:flex-none px-3 h-9 bg-nier-100-lighter border border-nier-150 text-sm outline-none"
                                            />
                                        )}
                                        <button
                                            onClick={handleImageUpload}
                                            disabled={imageUpload.uploading || !imgFiles.length}
                                            className="px-3 h-9 text-sm bg-nier-dark text-nier-text-light hover:bg-nier-text-dark cursor-pointer disabled:opacity-40 disabled:cursor-default shrink-0"
                                        >
                                            {imageUpload.uploading
                                                ? imageUpload.progress.total > 1
                                                    ? `${imageUpload.progress.current}/${imageUpload.progress.total} — ${imageUpload.progress.filePct}%`
                                                    : `${imageUpload.progress.filePct}%`
                                                : imgFiles.length > 1 ? `Upload ${imgFiles.length}` : 'Upload'}
                                        </button>
                                    </div>
                                </div>
                                {imageUpload.uploading && (
                                    <div className="w-full bg-nier-150/30 h-1">
                                        <div
                                            className="bg-nier-text-dark h-1 transition-all duration-200"
                                            style={{ width: `${Math.round(((imageUpload.progress.current - 1) / imageUpload.progress.total + imageUpload.progress.filePct / 100 / imageUpload.progress.total) * 100)}%` }}
                                        />
                                    </div>
                                )}
                                <input
                                    ref={imgFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={e => {
                                        const files = Array.from(e.target.files ?? []);
                                        if (!files.length) return;
                                        setImgFiles(files);
                                        if (files.length === 1 && !imgTitle)
                                            setImgTitle(files[0].name.replace(/\.[^.]+$/, ''));
                                        else
                                            setImgTitle('');
                                    }}
                                />
                            </div>

                            <span data-tab-row className="text-[10px] uppercase tracking-widest text-nier-text-dark/50 border-t border-nier-150 pt-4">
                                Soundtrack{tracks.length > 0 ? ` (${tracks.length})` : ''}
                            </span>

                            {tracks.length > 0 && (
                                <ul data-tab-row className="flex flex-col divide-y divide-nier-150/30 border border-nier-150">
                                    {tracks.map((track, i) => (
                                        <li key={track._id} className="flex items-center gap-3 px-3 py-2 group hover:bg-nier-150/20 transition-colors">
                                            <span className="text-[10px] text-nier-text-dark/40 font-mono shrink-0 tabular-nums">
                                                {String(i + 1).padStart(2, '0')}
                                            </span>
                                            <span className="text-xs uppercase tracking-wide text-nier-text-dark w-32 truncate shrink-0">{track.title}</span>
                                            <AudioPlayer compact src={track.url} title={track.title} index={i} />
                                            <button
                                                onClick={() => handleAudioDelete(track._id)}
                                                className="text-sm text-nier-text-dark/30 hover:text-red-800 cursor-pointer transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                            >×</button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div data-tab-row className="flex flex-col gap-1.5">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div
                                        className="sm:flex-1 flex items-center gap-2 px-3 h-9 border border-dashed border-nier-150 cursor-pointer hover:bg-nier-150/20 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <span className="text-sm text-nier-text-dark/80 truncate flex-1">
                                            {uploadFile ? uploadFile.name : 'Select MP3...'}
                                        </span>
                                        <span className="text-xs uppercase tracking-widest text-nier-text-dark/50 shrink-0">Browse</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Title"
                                            value={uploadTitle}
                                            onChange={e => setUploadTitle(e.target.value)}
                                            className="flex-1 sm:w-36 sm:flex-none px-3 h-9 bg-nier-100-lighter border border-nier-150 text-sm outline-none"
                                        />
                                        <button
                                            onClick={handleAudioUpload}
                                            disabled={audioUpload.uploading || !uploadFile}
                                            className="px-3 h-9 text-sm bg-nier-dark text-nier-text-light hover:bg-nier-text-dark cursor-pointer disabled:opacity-40 disabled:cursor-default shrink-0"
                                        >
                                            {audioUpload.uploading ? `${audioUpload.progress.filePct}%` : 'Upload'}
                                        </button>
                                    </div>
                                </div>
                                {audioUpload.uploading && (
                                    <div className="w-full bg-nier-150/30 h-1">
                                        <div className="bg-nier-text-dark h-1 transition-all duration-200" style={{ width: `${audioUpload.progress.filePct}%` }} />
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="audio/mpeg,audio/mp3,.mp3"
                                    className="hidden"
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (!f) return;
                                        setUploadFile(f);
                                        if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, ''));
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* The bottom band. It describes, in the flat third person the
                    reference uses, and the actions sit at the other end of it.
                    Deleting takes the whole row: it is the one moment the band
                    stops describing and starts asking for something. */}
                <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-nier-150 flex-shrink-0 min-h-[56px]">
                    {deleteStage === 'confirm' ? (
                        <div className="flex flex-col gap-1.5 w-full">
                            <p className="text-xs text-nier-text-dark/60">
                                Type to confirm: <span className="italic">{editingReview?.slug}</span>
                            </p>
                            <div className="flex gap-2 items-center">
                                <input
                                    autoFocus
                                    className="focus:outline focus:border-nier-dark border border-nier-150 flex-1 px-2 py-2 text-sm bg-nier-100-lighter"
                                    type="text"
                                    value={deleteInput}
                                    onChange={(e) => { setDeleteInput(e.target.value); setDeleteError(''); }}
                                />
                                <Button type="secondary" label="Cancel" handleClick={() => { setDeleteStage('idle'); setDeleteInput(''); setDeleteError(''); }} />
                                <Button type="primary" label="Confirm Delete" handleClick={handleDelete} />
                            </div>
                            {deleteError && <p className="text-red-700 text-xs">{deleteError}</p>}
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-nier-text-dark/60 truncate min-w-0">{hint}</p>
                            <div className="flex gap-2 items-center shrink-0">
                                <span className={`text-sm italic transition-opacity duration-200 ${
                                    saveLabel ? 'opacity-100' : 'opacity-0'
                                } ${saveStatus === 'error' ? 'text-red-700' : 'text-nier-text-dark/60'}`}>
                                    {saveLabel ?? '—'}
                                </span>
                                {editingReview && (
                                    <Button type="secondary" label="Delete" handleClick={() => setDeleteStage('confirm')} />
                                )}
                                <Button type="primary" label={editingReview ? 'Update' : 'Save'} handleClick={handleSave} />
                            </div>
                        </>
                    )}
                </div>

            </article>

            {/* Kept mounted so it can play its exit; the record it is
                editing is retained for the same reason. */}
            {shownModModal && (
                <ModModal
                    open={!!modModal}
                    mod={shownModModal.mod}
                    onSave={mod => {
                        setMods(prev => {
                            const next = [...prev];
                            if (shownModModal.index != null) next[shownModModal.index] = mod;
                            else next.push(mod);
                            return next;
                        });
                        setModModal(null);
                    }}
                    onClose={() => setModModal(null)}
                />
            )}
        </Modal>
    );
};
