// The one place that knows how a Review's Category maps to a URL. The `type`
// on a Review is singular (`game`); the Category in a URL is plural (`games`)
// — except cinema, which is the same either way. See CONTEXT.md.
//
// Surfaces keep their own labels for these: the Now page calls them PLAYING /
// WATCHING / READING, Search calls them GAMES / CINEMA / BOOKS. What they must
// not each keep is a private copy of the address.

export const CATEGORIES = [
    { type: "game", path: "games" },
    { type: "cinema", path: "cinema" },
    { type: "book", path: "books" },
] as const;

export type CategoryType = (typeof CATEGORIES)[number]["type"];

/**
 * A Review's address. One address for its whole life, whatever Status it is
 * in — per ADR-0003, which is why queued rows link here like any other.
 */
export function reviewPath(review: { type: string; slug: string }): string {
    const category = CATEGORIES.find(c => c.type === review.type);
    return `/${category?.path ?? review.type}/${review.slug}`;
}

/**
 * A Review's address is derived from its title, the same way whether it was
 * captured in the Backlog folder or authored in the Reviews window.
 */
export const generateSlug = (title: string): string =>
    title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-');
