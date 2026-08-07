import { describe, expect, it } from 'vitest';
import { hintFor, resolveTab, tabsFor, type Category, type Subject } from './tabs';

describe('which tabs a Review has', () => {
    it('offers every tab on a saved game Review', () => {
        expect(tabsFor({ type: 'game', saved: true }).map(t => t.id))
            .toEqual(['data', 'critique', 'mods', 'media']);
    });

    // The bar keeps its shape whatever the Review is. A tab that cannot be
    // used is dimmed in place rather than removed, so the bar never reflows
    // under the pointer — the reference greys its unavailable categories for
    // the same reason.
    it('offers the same tabs in the same order whatever the Review is', () => {
        const bars = [
            tabsFor({ type: 'game', saved: true }),
            tabsFor({ type: 'cinema', saved: false }),
            tabsFor({ type: 'book', saved: true }),
        ].map(bar => bar.map(t => t.id));

        expect(bars[1]).toEqual(bars[0]);
        expect(bars[2]).toEqual(bars[0]);
    });

    // Mods belong to a game. CONTEXT.md: "Only meaningful for game-category
    // Reviews."
    it('makes Mods available only to games', () => {
        const available = (type: Category) =>
            tabsFor({ type, saved: true }).find(t => t.id === 'mods')!.available;

        expect(available('game')).toBe(true);
        expect(available('cinema')).toBe(false);
        expect(available('book')).toBe(false);
    });

    // Screenshots and audio are filed under a Review's id, so there is nothing
    // to attach them to until the record exists.
    it('makes Media available only once the Review is saved', () => {
        const available = (saved: boolean) =>
            tabsFor({ type: 'game', saved }).find(t => t.id === 'media')!.available;

        expect(available(true)).toBe(true);
        expect(available(false)).toBe(false);
    });

    it('always offers Data and Critique', () => {
        const subjects: Subject[] = [
            { type: 'game', saved: true },
            { type: 'cinema', saved: false },
            { type: 'book', saved: false },
        ];

        for (const review of subjects) {
            const bar = tabsFor(review);
            expect(bar.find(t => t.id === 'data')!.available).toBe(true);
            expect(bar.find(t => t.id === 'critique')!.available).toBe(true);
        }
    });
});

describe('which tab is showing', () => {
    it('shows the tab asked for when the Review can use it', () => {
        expect(resolveTab('critique', tabsFor({ type: 'game', saved: true }))).toBe('critique');
        expect(resolveTab('mods', tabsFor({ type: 'game', saved: true }))).toBe('mods');
    });

    // Changing a game to cinema while Mods is open would otherwise leave the
    // reader on a panel with nothing in it and no way back but a click.
    it('falls back to Data when the open tab stops being available', () => {
        expect(resolveTab('mods', tabsFor({ type: 'cinema', saved: true }))).toBe('data');
        expect(resolveTab('media', tabsFor({ type: 'game', saved: false }))).toBe('data');
    });

    // The first autosave makes Media usable. Nothing should move on its own at
    // that moment — the reader did not ask to go anywhere.
    it('leaves the reader where they are when a different tab becomes available', () => {
        expect(resolveTab('critique', tabsFor({ type: 'game', saved: false }))).toBe('critique');
        expect(resolveTab('critique', tabsFor({ type: 'game', saved: true }))).toBe('critique');
    });

    // The fallback has to be committed, not just displayed. A reader knocked
    // off Mods onto Data and then back to a game Category must stay on Data:
    // being returned to Mods mid-edit is the same unasked-for move the
    // fallback exists to prevent, only later and more surprising.
    it('does not send the reader back when a section becomes available again', () => {
        const asGame = tabsFor({ type: 'game', saved: true });
        const asCinema = tabsFor({ type: 'cinema', saved: true });

        const afterCategoryChange = resolveTab('mods', asCinema);
        expect(afterCategoryChange).toBe('data');

        // The editor writes that back, so this is what it asks for next.
        expect(resolveTab(afterCategoryChange, asGame)).toBe('data');
    });

    it('falls back to Data for a tab it does not know', () => {
        expect(resolveTab('weapons' as never, tabsFor({ type: 'game', saved: true }))).toBe('data');
    });
});

describe('what the hint bar says', () => {
    it('describes the focused field', () => {
        expect(hintFor({ field: 'slug', tab: 'data', tabs: [] }))
            .toBe('Sets the address this Review answers to.');
    });

    // Nothing focused yet, or focus left for the chrome — the bar still has to
    // say where the reader is.
    it('describes the open tab when no field is focused', () => {
        expect(hintFor({ field: null, tab: 'critique', tabs: [] }))
            .toBe('Records judgement, section by section.');
    });

    // A critique section is per-Category, so its line is built rather than
    // listed — there is no fixed set of section names to write copy for.
    it('names the section a critique field is for', () => {
        expect(hintFor({ field: 'gameplay', tab: 'critique', tabs: [] }))
            .toBe('Records judgement on gameplay.');
    });

    // Hovering a dimmed tab should say why it is dimmed, which is the one
    // thing the reader cannot work out from looking at it.
    it('says why an unavailable tab cannot be opened', () => {
        const tabs = tabsFor({ type: 'cinema', saved: false });

        expect(hintFor({ field: null, tab: 'data', tabs, hovered: 'mods' }))
            .toBe('Modifications are kept for games only.');
        expect(hintFor({ field: null, tab: 'data', tabs, hovered: 'media' }))
            .toBe('Available once this Review is registered.');
    });

    it('describes an available hovered tab rather than explaining it', () => {
        const tabs = tabsFor({ type: 'game', saved: true });

        expect(hintFor({ field: null, tab: 'data', tabs, hovered: 'mods' }))
            .toBe('Manages modifications applied to this game.');
    });
});
