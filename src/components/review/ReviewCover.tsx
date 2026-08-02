// A Review's cover, and the only place the treatment is expressed. Tinted to
// the palette at rest and resolving to full colour when the nearest
// `.nier-card` ancestor is hovered or focused.
//
// Extracted because the Review detail page needs the same cover at a size a
// card never asks for: with the fragment copied, the next tweak to the
// treatment would have had to be made twice.

type Props = {
    /** Empty or missing renders the placeholder rather than a broken slot. */
    imagePath?: string;
    /**
     * Fill the container instead of holding the card's 3:4 ratio — for places
     * that already know the height they want.
     */
    fill?: boolean;
    /**
     * Skip the tint entirely. A card holds its art back until you point at it
     * so a grid reads as one surface; a Review you have actually opened is the
     * one place the art is the point, so it arrives in full colour.
     */
    full?: boolean;
};

export const ReviewCover = ({ imagePath, fill = false, full = false }: Props) => (
    <div className={`nier-cover ${fill ? 'nier-cover-fill' : ''}`}>
        {imagePath
            ? (
                <>
                    <img
                        src={imagePath}
                        alt=""
                        loading="lazy"
                        className={full ? 'nier-cover-img nier-cover-img-full' : 'nier-cover-img'}
                    />
                    {!full && <div className="nier-cover-tint" />}
                </>
            )
            : <div className="nier-cover-empty" aria-hidden="true" />}
    </div>
);
