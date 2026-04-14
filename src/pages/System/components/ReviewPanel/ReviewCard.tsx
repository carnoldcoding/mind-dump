import { useState } from "react";
import { Button } from "../../../../components/common/Button";

interface ReviewCardProps {
    review: any;
    onEdit: (review: any) => void;
    onDelete: (slug: string) => void;
    onDragStart: (e: React.DragEvent, slug: string) => void;
    onDragEnd: () => void;
    isDragging: boolean;
}

const typeIconMap: Record<string, string> = {
    book: "book-sharp",
    game: "game-controller-sharp",
    cinema: "videocam-sharp",
};

export const ReviewCard = ({ review, onEdit, onDelete, onDragStart, onDragEnd, isDragging }: ReviewCardProps) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [deleteError, setDeleteError] = useState("");

    const handleConfirmDelete = async () => {
        if (deleteInput === review.slug) {
            setConfirmDelete(false);
            setDeleteInput("");
            setDeleteError("");
            await onDelete(review.slug);
        } else {
            setDeleteError("Incorrect keyword");
        }
    };

    const handleCancelDelete = () => {
        setConfirmDelete(false);
        setDeleteInput("");
        setDeleteError("");
    };

    return (
        <>
            <article
                draggable
                onDragStart={(e) => onDragStart(e, review.slug)}
                onDragEnd={onDragEnd}
                className={`bg-nier-100-lighter relative cursor-grab active:cursor-grabbing group select-none transition-opacity duration-100 ${isDragging ? "opacity-30" : ""}`}
            >
                {/* Title bar */}
                <div className="h-8 bg-nier-150 flex items-center justify-between px-2 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <ion-icon className="flex-shrink-0 text-sm" name={typeIconMap[review.type]}></ion-icon>
                        <p className="text-sm truncate leading-none">{review.title}</p>
                    </div>
                    <div className="flex items-center justify-center bg-nier-dark w-7 h-7 flex-shrink-0">
                        <p className="text-nier-text-light text-sm leading-none">{review.rating}</p>
                    </div>
                </div>

                {/* Image */}
                {review.image_path && (
                    <div
                        className="h-28 w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${review.image_path})` }}
                    />
                )}

                {/* Footer */}
                <div className="px-2 py-1.5 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1 min-w-0">
                        {review.genres?.slice(0, 2).map((genre: string) => (
                            <span key={genre} className="text-xs px-1 py-0.5 bg-nier-150/70">{genre}</span>
                        ))}
                        {review.genres?.length > 2 && (
                            <span className="text-xs px-1 py-0.5 bg-nier-150/70">+{review.genres.length - 2}</span>
                        )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                            draggable={false}
                            onClick={(e) => { e.stopPropagation(); onEdit(review); }}
                            className="cursor-pointer p-1 hover:bg-nier-150 transition-colors duration-150"
                        >
                            <ion-icon name="pencil-sharp" style={{ fontSize: "13px" }}></ion-icon>
                        </button>
                        <button
                            draggable={false}
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                            className="cursor-pointer p-1 hover:bg-nier-150 transition-colors duration-150"
                        >
                            <ion-icon name="trash-sharp" style={{ fontSize: "13px" }}></ion-icon>
                        </button>
                    </div>
                </div>

                {/* Drop shadow */}
                <div className="absolute w-full h-full bg-nier-shadow top-0.5 left-0.5 -z-10 pointer-events-none"></div>
            </article>

            {/* Delete confirmation modal */}
            {confirmDelete && (
                <aside className="fixed top-0 left-0 h-screen w-screen bg-black/40 z-99 flex items-center justify-center">
                    <div className="w-lg bg-nier-100-lighter relative">
                        <div className="h-7 w-full bg-nier-150 flex items-center px-2">
                            <h3>Confirmation</h3>
                        </div>
                        <div className="flex flex-col items-center p-4 gap-4">
                            <ion-icon name="close-circle-outline" style={{ fontSize: "64px" }}></ion-icon>
                            <h3 className="text-xl">Are you sure?</h3>
                            <p className="text-sm">
                                Type to confirm: <span className="italic">{review.slug}</span>
                            </p>
                            <div className="w-full">
                                <input
                                    className="focus:outline focus:border-nier-dark border-nier-150 border w-full p-2 px-4"
                                    type="text"
                                    value={deleteInput}
                                    onChange={(e) => setDeleteInput(e.target.value)}
                                />
                                {deleteError && (
                                    <p className="text-red-700 text-sm mt-2">{deleteError}</p>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <Button label="cancel" handleClick={handleCancelDelete} />
                                <Button label="confirm" type="primary" handleClick={handleConfirmDelete} />
                            </div>
                        </div>
                        <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1" />
                    </div>
                </aside>
            )}
        </>
    );
};
