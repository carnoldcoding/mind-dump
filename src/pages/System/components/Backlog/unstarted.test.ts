import { describe, expect, it } from 'vitest';
import { applyControls, NO_CONTROLS, facetsFor, unstartedReadouts, type UnstartedControls } from './unstarted';

// Ids are not read for identity here, only for the capture time daysWaiting
// derives from, so a plain string is enough for everything but that.
const review = (over: Partial<Record<string, unknown>> = {}) => ({
    _id: 'a',
    title: 'Nioh',
    type: 'game',
    status: 'todo',
    genres: [] as string[],
    creator: '',
    release_date: '',
    ...over,
}) as never;

const controls = (over: Partial<UnstartedControls> = {}): UnstartedControls => ({ ...NO_CONTROLS, ...over });

describe('narrowing Not Started', () => {
    it('shows everything when nothing is set', () => {
        const items = [review({ title: 'Nioh' }), review({ title: 'Elden Ring' })];

        expect(applyControls(items, controls()).map(r => r.title))
            .toEqual(['Nioh', 'Elden Ring']);
    });
});

describe('filtering', () => {
    const items = [
        review({ title: 'Nioh', type: 'game', genres: ['action', 'rpg'], creator: 'Team NINJA' }),
        review({ title: 'Nioh 2', type: 'game', genres: ['action'], creator: 'Team NINJA' }),
        review({ title: 'Inception', type: 'cinema', genres: ['thriller'], creator: 'Nolan' }),
        review({ title: 'The Hobbit', type: 'book', genres: ['fantasy'], creator: 'Tolkien' }),
    ];

    it('narrows to a Category', () => {
        expect(applyControls(items, controls({ category: 'game' })).map(r => r.title))
            .toEqual(['Nioh', 'Nioh 2']);
    });

    it('narrows to a genre', () => {
        expect(applyControls(items, controls({ genre: 'action' })).map(r => r.title))
            .toEqual(['Nioh', 'Nioh 2']);
    });

    it('narrows to a creator', () => {
        expect(applyControls(items, controls({ creator: 'Tolkien' })).map(r => r.title))
            .toEqual(['The Hobbit']);
    });

    // Every control is an AND. Two filters that each match something but share
    // nothing must come back empty rather than falling back to either.
    it('applies every control together', () => {
        expect(applyControls(items, controls({ category: 'game', genre: 'rpg' })).map(r => r.title))
            .toEqual(['Nioh']);
        expect(applyControls(items, controls({ category: 'game', genre: 'fantasy' })))
            .toEqual([]);
    });

    // Title only, the same as every other search in the app — see
    // utils/rankByTitle and CONTEXT.md on the term.
    it('searches titles, ranking a prefix above a substring', () => {
        const searched = applyControls(
            [review({ title: 'Demon Souls' }), review({ title: 'Souls of Iron' })],
            controls({ query: 'souls' }),
        );

        expect(searched.map(r => r.title)).toEqual(['Souls of Iron', 'Demon Souls']);
    });

    it('does not search creators or genres', () => {
        expect(applyControls(items, controls({ query: 'tolkien' }))).toEqual([]);
        expect(applyControls(items, controls({ query: 'fantasy' }))).toEqual([]);
    });
});

describe('ordering', () => {
    // daysWaiting reads the capture time out of a Mongo ObjectId, so these are
    // real ids with known timestamps rather than arbitrary strings. The first
    // four bytes are the Unix second the id was made.
    const idAt = (iso: string) =>
        Math.floor(new Date(iso).getTime() / 1000).toString(16).padStart(8, '0') + '0'.repeat(16);

    const items = [
        review({ title: 'Bravely', _id: idAt('2026-06-01'), release_date: '2019-03-01' }),
        review({ title: 'Astral', _id: idAt('2026-01-01'), release_date: '2024-11-01' }),
        review({ title: 'Cuphead', _id: idAt('2026-03-01'), release_date: '2017-09-01' }),
    ];

    it('puts the longest waiting first by default', () => {
        expect(applyControls(items, controls()).map(r => r.title))
            .toEqual(['Astral', 'Cuphead', 'Bravely']);
    });

    it('flips to the most recently captured', () => {
        expect(applyControls(items, controls({ ascending: false })).map(r => r.title))
            .toEqual(['Bravely', 'Cuphead', 'Astral']);
    });

    it('sorts by title A to Z, and back', () => {
        expect(applyControls(items, controls({ sort: 'title' })).map(r => r.title))
            .toEqual(['Astral', 'Bravely', 'Cuphead']);
        expect(applyControls(items, controls({ sort: 'title', ascending: false })).map(r => r.title))
            .toEqual(['Cuphead', 'Bravely', 'Astral']);
    });

    it('sorts by release date, newest first by default', () => {
        expect(applyControls(items, controls({ sort: 'release' })).map(r => r.title))
            .toEqual(['Astral', 'Bravely', 'Cuphead']);
    });

    // An explicit sort is a stronger statement than the ranking a search does
    // on the way past, so it wins.
    it('lets an explicit sort override the search ranking', () => {
        const searched = applyControls(
            [review({ title: 'Souls of Iron' }), review({ title: 'Demon Souls' })],
            controls({ query: 'souls', sort: 'title' }),
        );

        expect(searched.map(r => r.title)).toEqual(['Demon Souls', 'Souls of Iron']);
    });

    it('leaves the caller array alone', () => {
        const original = [...items];
        applyControls(items, controls({ sort: 'title' }));
        expect(items).toEqual(original);
    });
});

describe('what the controls can offer', () => {
    const items = [
        review({ title: 'Nioh', type: 'game', genres: ['action', 'rpg'], creator: 'Team NINJA' }),
        review({ title: 'Nioh 2', type: 'game', genres: ['action'], creator: 'Team NINJA' }),
        review({ title: 'Inception', type: 'cinema', genres: ['thriller'], creator: 'Nolan' }),
    ];

    it('counts each Category for the rail', () => {
        expect(facetsFor(items, NO_CONTROLS).categories)
            .toEqual([
                { value: null, count: 3 },
                { value: 'game', count: 2 },
                { value: 'cinema', count: 1 },
                // Present at zero rather than absent — see the next test.
                { value: 'book', count: 0 },
            ]);
    });

    // A Category with nothing in it still holds its slot in the rail, dimmed,
    // the same rule the editor's section bar follows — see docs/chrome.md.
    it('keeps a Category with nothing in it', () => {
        expect(facetsFor(items, NO_CONTROLS).categories.map(c => c.value))
            .toContain('book');
        expect(facetsFor(items, NO_CONTROLS).categories.find(c => c.value === 'book')?.count)
            .toBe(0);
    });

    // Offering a genre that returns nothing is offering a dead end. The
    // options come from what the other controls have already left.
    it('offers only genres present in the current Category', () => {
        expect(facetsFor(items, { ...NO_CONTROLS, category: 'cinema' }).genres)
            .toEqual([{ value: 'thriller', count: 1 }]);
    });

    it('offers only creators present in the current Category', () => {
        expect(facetsFor(items, { ...NO_CONTROLS, category: 'game' }).creators)
            .toEqual([{ value: 'Team NINJA', count: 2 }]);
    });

    // The rail counts must not answer to the rail's own choice, or picking
    // GAMES would make every other Category read zero.
    it('counts Categories against the other controls, not the Category', () => {
        const withGenre = facetsFor(items, { ...NO_CONTROLS, category: 'game', genre: 'action' });

        expect(withGenre.categories.find(c => c.value === 'game')?.count).toBe(2);
        expect(withGenre.categories.find(c => c.value === 'cinema')?.count).toBe(0);
    });
});

describe('what the Readout column says', () => {
    const idAt = (iso: string) =>
        Math.floor(new Date(iso).getTime() / 1000).toString(16).padStart(8, '0') + '0'.repeat(16);
    const NOW = new Date('2026-08-08T12:00:00Z');

    it('counts what is showing, not what exists', () => {
        const items = [
            review({ type: 'game', _id: idAt('2026-08-01') }),
            review({ type: 'cinema', _id: idAt('2026-08-01') }),
        ];

        expect(unstartedReadouts(items, items, { ...NO_CONTROLS, category: 'game' }, NOW).showing).toBe(1);
    });

    it('reports the longest wait and the middle one', () => {
        const items = [
            review({ _id: idAt('2026-08-06') }),   // 2d
            review({ _id: idAt('2026-07-29') }),   // 10d
            review({ _id: idAt('2026-05-10') }),   // 90d
        ];
        const out = unstartedReadouts(items, items, NO_CONTROLS, NOW);

        expect(out.oldest).toBe(90);
        expect(out.medianWait).toBe(10);
    });

    // Not Started growing faster than it is cleared is worth knowing,
    // so the two figures have to count the same window.
    it('counts what was added in the last 30 days', () => {
        const items = [
            review({ _id: idAt('2026-08-01') }),
            review({ _id: idAt('2026-07-20') }),
            review({ _id: idAt('2026-01-01') }),
        ];

        expect(unstartedReadouts(items, items, NO_CONTROLS, NOW).added30).toBe(2);
    });

    // Counted across everything unfinished, not across the unstarted. A
    // Review that started is `active` and has left the list this describes,
    // so counting it there could only ever return zero.
    it('counts what was started in the last 30 days', () => {
        const unstarted = [review({ _id: idAt('2026-01-01'), status: 'todo' })];
        const unfinished = [
            ...unstarted,
            review({ _id: idAt('2026-01-01'), status: 'active', date_started: '2026-08-02' }),
            review({ _id: idAt('2026-01-01'), status: 'active', date_started: '2026-02-01' }),
        ];

        expect(unstartedReadouts(unstarted, unfinished, NO_CONTROLS, NOW).started30).toBe(1);
    });

    it('would report zero if it counted only the unstarted', () => {
        const unstarted = [review({ _id: idAt('2026-01-01'), status: 'todo' })];

        expect(unstartedReadouts(unstarted, unstarted, NO_CONTROLS, NOW).started30).toBe(0);
    });

    // An empty list is a real state, reached by filtering. Nothing may read
    // NaN or Infinity on screen.
    it('answers an empty list without arithmetic on nothing', () => {
        expect(unstartedReadouts([], [], NO_CONTROLS, NOW))
            .toEqual({ showing: 0, oldest: null, medianWait: null, added30: 0, started30: 0 });
    });

    // Ids that carry no capture time are normal in this repo's fixtures, and
    // must not be counted as waiting zero days.
    it('ignores rows whose id carries no capture time', () => {
        const items = [review({ _id: 'id-Nioh' }), review({ _id: idAt('2026-05-10') })];
        const out = unstartedReadouts(items, items, NO_CONTROLS, NOW);

        expect(out.showing).toBe(2);
        expect(out.oldest).toBe(90);
        expect(out.medianWait).toBe(90);
    });
});

// Both of these were shipped broken and neither was visible to a test: the
// toggle silently did nothing while typing, and the entrance addressed a
// selector the markup no longer matched.
describe('regressions worth keeping named', () => {
    it('honours the direction toggle while searching', () => {
        const items = [review({ title: 'Souls A' }), review({ title: 'Souls B' })];

        expect(applyControls(items, controls({ query: 'souls' })).map(r => r.title))
            .toEqual(['Souls A', 'Souls B']);
        expect(applyControls(items, controls({ query: 'souls', ascending: false })).map(r => r.title))
            .toEqual(['Souls B', 'Souls A']);
    });
});
