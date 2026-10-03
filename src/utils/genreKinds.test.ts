import { describe, it, expect } from 'vitest';
import { genresOfKind, withGenresOfKind } from './genreKinds';

describe('genresOfKind', () => {
    const stored = ['rpg', 'first-person', 'co-op', 'indie', 'top-down'];

    it('gives each kind only its own values, in stored order', () => {
        expect(genresOfKind(stored, 'genre')).toEqual(['rpg']);
        expect(genresOfKind(stored, 'perspective')).toEqual(['first-person', 'top-down']);
        expect(genresOfKind(stored, 'playMode')).toEqual(['co-op']);
        expect(genresOfKind(stored, 'tag')).toEqual(['indie']);
    });

    it('files a value on no list under genre, so it stays visible', () => {
        const captured = ['Role-playing (RPG)', 'pvp'];
        expect(genresOfKind(captured, 'genre')).toEqual(['Role-playing (RPG)']);
        expect(genresOfKind(captured, 'playMode')).toEqual(['pvp']);
    });
});

describe('withGenresOfKind', () => {
    it('replaces one kind and leaves the other kinds alone', () => {
        const stored = ['rpg', 'first-person', 'co-op', 'indie'];
        const next = withGenresOfKind(stored, 'perspective', ['top-down', 'isometric']);
        expect(next).toHaveLength(5);
        expect(next).toEqual(expect.arrayContaining(['rpg', 'co-op', 'indie', 'top-down', 'isometric']));
        expect(next).not.toContain('first-person');
    });

    it('keeps an unlisted value when another kind is edited', () => {
        const stored = ['Role-playing (RPG)', 'co-op'];
        expect(withGenresOfKind(stored, 'playMode', [])).toEqual(['Role-playing (RPG)']);
    });

    it('lets the genre field remove an unlisted value', () => {
        const stored = ['Role-playing (RPG)', 'rpg', 'co-op'];
        expect(withGenresOfKind(stored, 'genre', ['rpg'])).toEqual(
            expect.arrayContaining(['rpg', 'co-op']),
        );
        expect(withGenresOfKind(stored, 'genre', ['rpg'])).toHaveLength(2);
    });
});
