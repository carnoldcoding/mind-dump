import { TextField } from "../../../../components/common/TextField"
import { SelectField } from "../../../../components/common/SelectField"
import { DateField } from "../../../../components/common/DateField"
import { MutliSelectField } from "../../../../components/common/MultiSelectField"
import { BigTextField } from "../../../../components/common/BigTextField"
import { ImageTextField } from "../../../../components/common/ImageTextField"
import { useState, useEffect } from "react"
import { Button } from "../../../../components/common/Button"
import config from "../../../../config"
import { NumTextField } from "../../../../components/common/NumTextField"
import { transformKeysToSnakeCase } from "../../../../utils/helpers"
import { movieGenres, gameGenres, bookGenres } from "../../../../utils/helpers"

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

interface GameReviewDetails {
    story: string;
    gameplay: string;
    graphics: string;
    sound: string;
}

interface CinemaReviewDetails {
    story: string;
    cinematography: string;
    casting: string;
    sound: string;
}

interface BookReviewDetails {
    story: string;
    world: string;
    characters: string;
    writing: string;
}

interface Arguments{
    isOpen: boolean,
    setIsOpen: any,
    onReviewAdded: any,
    editingReview?: any
}

interface GameReview extends BaseReview<'game', GameReviewDetails> {}
interface CinemaReview extends BaseReview<'cinema', CinemaReviewDetails> {}
interface BookReview extends BaseReview<'book', BookReviewDetails> {}

type Review = GameReview | CinemaReview | BookReview;

export const ReviewModal = ({isOpen, setIsOpen, onReviewAdded, editingReview} : Arguments) => {
    const [type, setType] = useState<'game' | 'cinema' | 'book'>('game');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [genreOptions, setGenreOptions] = useState<string[]>([]);

    const [review, setReview] = useState<Partial<Review>>({
        title: '',
        slug: '',
        description: '',
        releaseDate: '',
        dateCompleted: '',
        creator: '',
        genres: [],
        review: {} as any,
        rating: 0,
        imagePath: '',
        status: '',
    });

    useEffect(() => {
        if (editingReview) {
            console.log(editingReview.type);
            setReview({
                title: editingReview.title || '',
                slug: editingReview.slug || '',
                description: editingReview.description || '',
                releaseDate: editingReview.release_date || '',
                creator: editingReview.creator || editingReview.developers?.[0] || editingReview.director || editingReview.author || '',
                genres: editingReview.genres || [],
                review: editingReview.review || {} as any,
                rating: editingReview.rating || 0,
                imagePath: editingReview.image_path || '',
                status: editingReview.status || ''
            });
            setType(editingReview.type || 'game');
            let tempGenres : string[] = [];
                
            if(editingReview.type === "game") tempGenres = gameGenres;
            if(editingReview.type === "cinema") tempGenres = movieGenres;
            if(editingReview.type === "book") tempGenres = bookGenres;
            setGenreOptions(tempGenres);
        }

        
    }, [editingReview]);
    
    const bigTextFieldMap: Record<'game' | 'cinema' | 'book', string[]> = {
        'game': ['story', 'gameplay', 'graphics', 'sound'],
        'cinema': ['story', 'cinematography', 'casting', 'sound'],
        'book': ['story', 'world', 'characters', 'writing']
    }

    const handleFieldChange = (field: string, value: any) => {
        const reviewFields = bigTextFieldMap[type];
        const previousStatus = review.status;

        if(reviewFields?.includes(field)){
            setReview(prev => ({
                ...prev,
                review: {
                    ...(prev.review as any),
                    [field]: value
                }
            }))
        }else{
            setReview(prev => ({
                ...prev, 
                [field]: value
            }))
        }

        //Alter DateCompleted if Status is changed to "Done"
        if(field === 'status' && value === 'done' && previousStatus !== "done"){
            setReview(prev => ({
                ...prev,
                dateCompleted: new Date().toLocaleDateString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    year: "numeric",
                })
            }))
        }
    }

    const handleTypeChange = (newType: 'game' | 'cinema' | 'book') => {
        setType(newType);
        // Reset the type-specific fields when type changes
        const baseFields = {
            title: review.title,
            description: review.description,
            releaseDate: review.releaseDate,
            genres: review.genres,
        };
        
        if (newType === 'game') {
            setReview({ ...baseFields, review: {story: '', gameplay: '', graphics: '', sound: ''} });
        } else if (newType === 'cinema') {
            setReview({ ...baseFields, review: {story: '', cinematography: '', casting: '', sound: ''} });
        } else {
            setReview({ ...baseFields, review: {story: '', world: '', characters: '', writing: ''} });
        }
    }
    
       const handleApply = async () => {
        const parsedReview = transformKeysToSnakeCase(review);
        const isEditMode = !!editingReview;
        
        try {
            setLoading(true);
            setError(null);
            
            const endpoint = isEditMode ? '/api/posts/update_post' : '/api/posts/add_post';
            const url = new URL(endpoint, config.apiUri);
            
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...parsedReview,
                    type: type,
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(isEditMode ? 'Review updated:' : 'Review created:', data);
                handleCancel();
                onReviewAdded();
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                setError(`Failed to ${isEditMode ? 'update' : 'create'} review`);
            }
        } catch (error : any) {
            console.error('Network error:', error);
            setError('Network error: ' + error.message);
        } finally {
            setLoading(false);
        }
    }
    
    const handleCancel = () => {
        setReview({
            title: '',
            slug: '',
            description: '',
            releaseDate: '',
            creator: '',
            genres: [],
            review: {} as any,
            rating: 0,
            imagePath: '',
            status: ''
        });
        setType('game');
        setIsOpen(false);
    }

    return (
        <article className={`${isOpen ? 'min-h-10 p-4' : 'h-0 p-0 border-b-0'} border-b border-b-nier-dark
        overflow-hidden flex flex-col gap-4
        `}>
            <div className="w-full flex gap-4 flex-col md:flex-row">
                <TextField
                    label="Title"
                    value={review.title || ''}
                    onChange={(value) => handleFieldChange('title', value)}
                />

                <TextField
                    label="Slug"
                    value={review.slug || ''}
                    onChange={(value) => handleFieldChange('slug', value)}
                />

                <SelectField 
                    label="Type" 
                    value={type}
                    onChange={handleTypeChange} 
                    options={["game", "cinema", "book"]}
                />

                <DateField 
                    label="Release Date"
                    value={review.releaseDate || ''}
                    onChange={(value) => handleFieldChange('releaseDate', value)}
                />
            </div>
            <div className="w-full flex gap-4 flex-col md:flex-row">
                <TextField
                    label="Description"
                    value={review.description || ''}
                    onChange={(value) => handleFieldChange('description', value)}
                />

                <TextField
                    label="Creator"
                    value={review.creator || ''}
                    onChange={(value) => handleFieldChange('creator', value)}
                />

                <NumTextField
                    label="Rating"
                    value={review.rating || ''}
                    onChange={(value) => handleFieldChange('rating', value)}
                />
            </div>
            <div className="w-full flex gap-4 flex-col md:flex-row">
                
                <SelectField 
                    label="Status" 
                    value={review.status}
                    onChange={(value) => handleFieldChange('status', value)} 
                    options={["todo", "active", "done"]}
                />

                <MutliSelectField 
                    label="Genres" 
                    options={genreOptions}
                    value={review.genres || []}
                    onChange={(value) => handleFieldChange('genres', value)}
                />
                <ImageTextField
                    label="Image Path"
                    value={review.imagePath || ''}
                    onChange={(value) => handleFieldChange('imagePath', value)}
                />
            </div>
            <div className="flex flex-col gap-4">
                {bigTextFieldMap[type]?.map((field) => (
                    <BigTextField 
                        key={field} 
                        label={field}
                        value={(review.review as any)?.[field] || ''}
                        onChange={(value) => handleFieldChange(field, value)}
                    />
                ))}
            </div>
            <div className="flex gap-4">
                <Button handleClick={handleCancel} label="cancel" />
                <Button handleClick={handleApply} type="primary" label={editingReview ? "update" : "apply"} />
            </div>
        </article>
    )
}