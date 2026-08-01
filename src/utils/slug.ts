/**
 * A Review's address is derived from its title, the same way whether it was
 * captured in the Backlog folder or authored in the Reviews window.
 */
export const generateSlug = (title: string): string =>
    title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-');
