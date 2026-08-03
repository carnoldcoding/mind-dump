// What a rating is, once, at the edge where it arrives.
//
// The API sends `rating` as a string for most Reviews and as a number for a
// few — 40 and 5 of 45 at the time of writing — because the editor's field is
// a text input and nothing has ever normalised what it saves. Every surface
// that wanted rated Reviews asked `typeof review.rating === "number"`, which
// is a reasonable question to ask of a field the type declares as a number,
// and which silently threw away seven Reviews in eight. The site footer
// averaged five of them and reported it as the average of the collection.
//
// So the coercion happens once, as Reviews enter the store, and `Review.rating`
// becomes true rather than aspirational. No surface has to know any of this,
// and the `typeof` checks already written are correct as they stand.

/**
 * The rating a record carries, or `undefined` when it carries none.
 *
 * Absence and zero are different answers: a Review rated 0 was rated, and the
 * app distinguishes the two in three other places. NaN is reported as absence
 * rather than passed along, because `typeof NaN === "number"` would put the
 * trap back exactly where this takes it out.
 */
export function toRating(raw: unknown): number | undefined {
    if (raw === null || raw === undefined) return undefined;

    // Only strings and numbers can be a rating. An object or an array reaching
    // here means the shape changed, and guessing at it would hide that.
    if (typeof raw !== "string" && typeof raw !== "number") return undefined;

    if (typeof raw === "string" && raw.trim() === "") return undefined;

    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
}
