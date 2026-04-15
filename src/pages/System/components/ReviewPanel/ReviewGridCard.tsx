interface ReviewGridCardProps {
    review: any;
    onEdit: (review: any) => void;
}

const TYPE_ICON: Record<string, string> = {
    game:   'game-controller-sharp',
    cinema: 'videocam-sharp',
    book:   'book-sharp',
};

const STATUS_ICON: Record<string, string> = {
    todo:   'close-circle-outline',
    active: 'timer-outline',
    done:   'checkmark-circle-outline',
};

export const ReviewGridCard = ({ review, onEdit }: ReviewGridCardProps) => (
    <article
        onClick={() => onEdit(review)}
        className="flex flex-col relative border border-nier-150 cursor-pointer hover:border-nier-dark transition-colors duration-150"
    >
        {/* Header: type + rating */}
        <div className="h-8 bg-nier-150 flex items-stretch justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5 min-w-0 px-2">
                <ion-icon name={TYPE_ICON[review.type]}></ion-icon>
                <p className="text-xs uppercase tracking-wide">{review.type}</p>
            </div>
            <div className="bg-nier-dark flex items-center justify-center w-8 flex-shrink-0">
                <p className="text-nier-text-light text-sm leading-none">{review.rating}</p>
            </div>
        </div>

        {/* Cover image */}
        <div
            className="h-32 bg-cover bg-center bg-nier-100"
            style={review.image_path ? { backgroundImage: `url(${review.image_path})` } : {}}
        />

        {/* Title */}
        <div className="bg-nier-100 px-2 py-1 border-t border-nier-150">
            <p className="text-sm truncate">{review.title}</p>
        </div>

        {/* Footer: status */}
        <div className="bg-nier-100 flex items-center px-2 py-1 border-t border-nier-150">
            <ion-icon name={STATUS_ICON[review.status] ?? 'ellipse-outline'}></ion-icon>
            <p className="text-xs capitalize ml-1">{review.status}</p>
        </div>

        {/* Drop shadow */}
        <div className="absolute w-full h-full bg-nier-shadow top-0.5 left-0.5 -z-10 pointer-events-none" />
    </article>
);
