// One Review factory for the whole suite. Five test files had grown their own
// byte-identical copy, differing only in which Status they defaulted to — so
// the defaults live here and each suite overrides what it is actually about.
//
// Not a fixture of real data: the fields are deliberately boring, so that a
// test asserting on a title or a date is asserting on something it set itself.

import type { Review } from "../store/reviews";

export const makeReview = (title: string, over: Partial<Review> = {}): Review => ({
    _id: `id-${title}`,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    type: "game",
    status: "done",
    rating: 8,
    genres: [],
    review: {},
    image_path: "",
    release_date: "1999-01-01",
    date_completed: "2026-01-01",
    creator: "",
    ...over,
});
