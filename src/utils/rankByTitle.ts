// Ranks items whose title starts with the query above items that merely
// contain it. Used everywhere a Review list gets live-filtered by title.
export function rankByTitle<T extends { title: string }>(items: T[], query: string): T[] {
    if (!query) return items;
    const q = query.toLowerCase();
    const startsWith = items.filter(item => item.title.toLowerCase().startsWith(q));
    const contains = items.filter(item => item.title.toLowerCase().includes(q) && !startsWith.includes(item));
    return [...startsWith, ...contains];
}
