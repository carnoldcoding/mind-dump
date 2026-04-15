import { TextField } from "../../../../components/common/TextField"
import { SelectField } from "../../../../components/common/SelectField"
import { DateField } from "../../../../components/common/DateField"
import { MutliSelectField } from "../../../../components/common/MultiSelectField"
import { BigTextField } from "../../../../components/common/BigTextField"
import { ImageTextField } from "../../../../components/common/ImageTextField"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "../../../../components/common/Button"
import config from "../../../../config"
import { NumTextField } from "../../../../components/common/NumTextField"
import { transformKeysToSnakeCase } from "../../../../utils/helpers"

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

const BIG_TEXT_FIELDS: Record<'game' | 'cinema' | 'book', string[]> = {
    game:   ['story', 'gameplay', 'graphics', 'sound'],
    cinema: ['story', 'cinematography', 'casting', 'sound'],
    book:   ['story', 'world', 'characters', 'writing'],
};

const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-');

export const ReviewModal = ({ isOpen, setIsOpen, onReviewAdded, editingReview }: Arguments) => {
    const [type, setType]               = useState<'game' | 'cinema' | 'book'>('game');
    const [review, setReview]           = useState<Partial<Review>>(EMPTY_REVIEW);
    const [genreOptions, setGenreOptions] = useState<string[]>([]);
    const [creatorList, setCreatorList] = useState<string[]>([]);
    const [saveStatus, setSaveStatus]   = useState<SaveStatus>('idle');
    const [slugManual, setSlugManual]   = useState(false);
    const [deleteStage, setDeleteStage] = useState<'idle' | 'confirm'>('idle');
    const [deleteInput, setDeleteInput] = useState('');
    const [deleteError, setDeleteError] = useState('');

    // Refs for values needed inside timer callbacks (avoids stale closures)
    const reviewRef        = useRef(review);
    const typeRef          = useRef(type);
    const editingReviewRef = useRef(editingReview);
    const isNewlySaved     = useRef(false);
    const autosaveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

    reviewRef.current        = review;
    typeRef.current          = type;
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
                releaseDate:   editingReview.release_date  || '',
                dateCompleted: editingReview.date_completed || '',
                creator:       editingReview.creator || editingReview.developers?.[0] || editingReview.director || editingReview.author || '',
                genres:        editingReview.genres        || [],
                review:        editingReview.review        || {} as any,
                rating:        editingReview.rating        || 0,
                imagePath:     editingReview.image_path    || '',
                status:        editingReview.status        || '',
            });
            setType(editingReview.type || 'game');
            setSlugManual(true);     // existing slug — don't auto-override
        } else {
            setReview(EMPTY_REVIEW);
            setType('game');
            setSlugManual(false);
            isNewlySaved.current = false;
        }

        setSaveStatus('idle');
    }, [editingReview, isOpen]);

    // ── Fetch genres + creators when type changes ────────────────────
    useEffect(() => {
        const load = async (endpoint: string, setter: (d: string[]) => void) => {
            try {
                const url = new URL(endpoint, config.apiUri);
                url.searchParams.set('type', type);
                const res = await fetch(url.toString());
                if (res.ok) setter(await res.json());
            } catch { /* silently ignore */ }
        };

        load('/api/posts/get_genres',   setGenreOptions);
        load('/api/posts/get_creators', setCreatorList);
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
        const parsed   = transformKeysToSnakeCase(currentReview);
        const endpoint = isUpdate ? '/api/posts/update_post' : '/api/posts/add_post';

        setSaveStatus('saving');

        try {
            const url = new URL(endpoint, config.apiUri);
            const res = await fetch(url.toString(), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ ...parsed, type: currentType }),
            });

            if (res.ok) {
                setSaveStatus('saved');
                isNewlySaved.current = true;
                onReviewAdded();
                setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2500);
                if (closeAfter) resetAndClose();
            } else {
                setSaveStatus('error');
            }
        } catch {
            setSaveStatus('error');
        }
    };

    const resetAndClose = () => {
        setReview(EMPTY_REVIEW);
        setType('game');
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
            const url = new URL('/api/posts/remove_post', config.apiUri);
            await fetch(url.toString(), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ slug: editingReview.slug }),
            });
            onReviewAdded();
            resetAndClose();
        } catch {
            setDeleteError('Delete failed');
        }
    };

    // Close: flush unsaved changes first
    const handleClose = async () => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

        if (saveStatus === 'unsaved' && review.title?.trim() && review.slug?.trim()) {
            const isUpdate = !!editingReview || isNewlySaved.current;
            await performSave(review, type, isUpdate, false);
        }

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

        if (BIG_TEXT_FIELDS[type]?.includes(field)) {
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

        // Auto-set dateCompleted when status flips to done
        if (field === 'status' && value === 'done' && previousStatus !== 'done') {
            setReview(prev => ({
                ...prev,
                status: value,
                dateCompleted: new Date().toLocaleDateString('en-US', {
                    month: '2-digit', day: '2-digit', year: 'numeric',
                }),
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

    if (!isOpen) return null;

    const saveLabel = (() => {
        if (saveStatus === 'saving')  return 'Saving…';
        if (saveStatus === 'unsaved') return 'Unsaved changes';
        if (saveStatus === 'saved')   return 'Saved';
        if (saveStatus === 'error')   return 'Save failed';
        return null;
    })();

    return createPortal(
        <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto flex flex-col nier-backdrop-enter">
            <div className="flex flex-1 items-center justify-center p-4">
            <div className="relative w-full max-w-4xl nier-modal-enter">
                <div className="absolute w-full h-full bg-nier-dark top-1 left-1" />
            <article className="bg-nier-100-lighter relative w-full max-h-[calc(100dvh-2rem)] flex flex-col">

                {/* Header */}
                <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5 flex-shrink-0">
                    <h3 className="text-nier-text-dark text-xl uppercase tracking-wide">
                        {editingReview ? `Edit — ${editingReview.title}` : 'New Review'}
                    </h3>
                    <div
                        onClick={handleClose}
                        className="text-3xl leading-none cursor-pointer hover:text-nier-dark transition-colors duration-150"
                    >×</div>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-scroll flex-1 p-4 flex flex-col gap-4">

                    {/* Row 1: Title · Slug · Type */}
                    <div className="flex gap-4 flex-col md:flex-row">
                        <TextField
                            label="Title"
                            value={review.title || ''}
                            onChange={(v: string) => handleFieldChange('title', v)}
                        />
                        <div className="w-full flex flex-col gap-0.5">
                            <TextField
                                label="Slug"
                                value={review.slug || ''}
                                onChange={handleSlugChange}
                            />
                            {!slugManual && review.slug && (
                                <p className="text-xs text-nier-text-dark/40 px-1 leading-none">auto-generated</p>
                            )}
                        </div>
                        <SelectField
                            label="Type"
                            value={type}
                            onChange={handleTypeChange}
                            options={['game', 'cinema', 'book']}
                        />
                    </div>

                    {/* Row 2: Creator · Release Date · Rating · Status */}
                    <div className="flex gap-4 flex-col md:flex-row">
                        <TextField
                            label="Creator"
                            value={review.creator || ''}
                            autofillData={creatorList}
                            onChange={(v: string) => handleFieldChange('creator', v)}
                        />
                        <DateField
                            label="Release Date"
                            value={review.releaseDate || ''}
                            onChange={(v) => handleFieldChange('releaseDate', v)}
                        />
                        <NumTextField
                            label="Rating"
                            value={review.rating?.toString() || ''}
                            onChange={(v) => handleFieldChange('rating', v)}
                        />
                        <SelectField
                            label="Status"
                            value={review.status}
                            onChange={(v) => handleFieldChange('status', v)}
                            options={['todo', 'active', 'done']}
                        />
                    </div>

                    {/* Row 3: Genres · Image */}
                    <div className="flex gap-4 flex-col md:flex-row">
                        <MutliSelectField
                            label="Genres"
                            options={genreOptions}
                            value={review.genres || []}
                            onChange={(v) => handleFieldChange('genres', v)}
                        />
                        <ImageTextField
                            label="Image Path"
                            value={review.imagePath || ''}
                            onChange={(v) => handleFieldChange('imagePath', v)}
                        />
                    </div>

                    {/* Row 4: Description */}
                    <TextField
                        label="Description"
                        value={review.description || ''}
                        onChange={(v: string) => handleFieldChange('description', v)}
                    />

                    {/* Review sections */}
                    <div className="flex flex-col gap-3">
                        {BIG_TEXT_FIELDS[type]?.map((field) => (
                            <BigTextField
                                key={field}
                                label={field}
                                value={(review.review as any)?.[field] || ''}
                                onChange={(v) => handleFieldChange(field, v)}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-nier-150 flex-shrink-0 min-h-[56px]">
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
                            <p className={`text-sm italic transition-opacity duration-200 ${
                                saveLabel ? 'opacity-100' : 'opacity-0'
                            } ${saveStatus === 'error' ? 'text-red-700' : 'text-nier-text-dark/60'}`}>
                                {saveLabel ?? '—'}
                            </p>
                            <div className="flex gap-2">
                                {editingReview && (
                                    <Button type="secondary" label="Delete" handleClick={() => setDeleteStage('confirm')} />
                                )}
                                <Button type="primary" label={editingReview ? 'Update' : 'Save'} handleClick={handleSave} />
                            </div>
                        </>
                    )}
                </div>

            </article>
            </div>
            </div>
        </div>,
        document.body
    );
};
