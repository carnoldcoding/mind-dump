import { describe, it, expect } from 'vitest';
import { genresInUse } from './visibleGenres';

const shelf = (...genres: string[][]) => genres.map(g => ({ genres: g }));

describe('genresInUse', () => {
    const options = ['action', 'rpg', 'puzzle', 'horror'];

    it('keeps only genres some review on the shelf carries', () => {
        const shelved = shelf(['action', 'rpg'], ['action']);
        expect(genresInUse(shelved, options)).toEqual(['action', 'rpg']);
    });

    it('drops a genre no review has, however many are queued elsewhere', () => {
        const shelved = shelf(['rpg'], ['rpg', 'action']);
        expect(genresInUse(shelved, options)).toEqual(['action', 'rpg']);
        expect(genresInUse(shelved, options)).not.toContain('puzzle');
    });

    it('returns nothing for an empty shelf', () => {
        expect(genresInUse([], options)).toEqual([]);
    });

    it('follows the options order, not the order genres appear on reviews', () => {
        const shelved = shelf(['horror'], ['action']);
        expect(genresInUse(shelved, options)).toEqual(['action', 'horror']);
    });

    it('ignores a genre a review has that is not an option for this category', () => {
        const shelved = shelf(['action', 'not-a-real-genre']);
        expect(genresInUse(shelved, options)).toEqual(['action']);
    });

    it('tolerates a review with no genres', () => {
        const shelved = [{ genres: undefined }, { genres: ['rpg'] }];
        expect(genresInUse(shelved, options)).toEqual(['rpg']);
    });
});
