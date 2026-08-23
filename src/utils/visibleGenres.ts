/**
 * The genres a Category shelf offers.
 *
 * A Category defines a long static list of possible genres, but most of them
 * are never used, so the panel filled with permanently-empty rows. An option
 * is shown only if at least one finished Review on the shelf carries it.
 *
 * Existence is derived from the shelf's whole finished set, deliberately
 * independent of any active filter: selecting a genre must not make its
 * siblings vanish (the filters combine with AND, so it easily would), and the
 * set of rows must not flicker as filters toggle. The count beside a surviving
 * row still reflects the current filtered view — a shown row may read 0 — so
 * the panel says which genres exist here without pretending a filtered-out one
 * never did.
 *
 * Order follows `options`, so the panel keeps the Category's canonical genre
 * order rather than reordering by presence.
 */
export const genresInUse = (
  // Runtime data, not the Review type: a Review's genres can be absent in
  // practice, which is why the callers guard it — see CONTEXT/architecture on
  // the type/runtime drift.
  shelved: { genres?: string[] | null }[],
  options: string[],
): string[] =>
  options.filter(genre => shelved.some(review => review.genres?.includes(genre)));
