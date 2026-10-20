import { describe, it, expect } from 'vitest';
import { genresOfKind, withGenresOfKind } from './genreKinds';

describe('genresOfKind', () => {
    const stored = ['rpg', 'first-person', 'couch-co-op', 'indie', 'top-down'];

    it('gives each kind only its own values, in stored order', () => {
        expect(genresOfKind(stored, 'genre')).toEqual(['rpg', 'indie']);
        expect(genresOfKind(stored, 'perspective')).toEqual(['first-person', 'top-down']);
        expect(genresOfKind(stored, 'playMode')).toEqual(['couch-co-op']);
    });

    // Play mode is who you play with. How a game plays — turn-based, or a
    // former tag like open-world — is a Genre.
    it('files how a game plays under genre, not play mode', () => {
        const stored = ['turn-based', 'real-time-strategy', 'open-world', 'story-rich', 'indie'];
        expect(genresOfKind(stored, 'genre')).toEqual(stored);
        expect(genresOfKind(stored, 'playMode')).toEqual([]);
    });

    it('files who you play with under play mode', () => {
        const stored = ['single-player', 'multiplayer', 'couch-co-op', 'pvp', 'mmo', 'party'];
        expect(genresOfKind(stored, 'playMode')).toEqual(stored);
    });

    it('files a value on no list under genre, so it stays visible', () => {
        const captured = ['Role-playing (RPG)', 'pvp'];
        expect(genresOfKind(captured, 'genre')).toEqual(['Role-playing (RPG)']);
        expect(genresOfKind(captured, 'playMode')).toEqual(['pvp']);
    });
});

describe('withGenresOfKind', () => {
    it('replaces one kind and leaves the other kinds alone', () => {
        const stored = ['rpg', 'first-person', 'multiplayer', 'indie'];
        const next = withGenresOfKind(stored, 'perspective', ['top-down', 'isometric']);
        expect(next).toHaveLength(5);
        expect(next).toEqual(expect.arrayContaining(['rpg', 'multiplayer', 'indie', 'top-down', 'isometric']));
        expect(next).not.toContain('first-person');
    });

    it('keeps an unlisted value when another kind is edited', () => {
        const stored = ['Role-playing (RPG)', 'multiplayer'];
        expect(withGenresOfKind(stored, 'playMode', [])).toEqual(['Role-playing (RPG)']);
    });

    it('lets the genre field remove an unlisted value', () => {
        const stored = ['Role-playing (RPG)', 'rpg', 'multiplayer'];
        expect(withGenresOfKind(stored, 'genre', ['rpg'])).toEqual(
            expect.arrayContaining(['rpg', 'multiplayer']),
        );
        expect(withGenresOfKind(stored, 'genre', ['rpg'])).toHaveLength(2);
    });
});
