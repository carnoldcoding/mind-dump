import { gameGenreKinds, type GameGenreKind } from './genres';

/**
 * Which kind a stored game Genre is. A value on none of the lists — an IGDB
 * name kept as-is by Backlog capture, say — counts as a genre, so the editor
 * still shows it somewhere it can be removed.
 */
const kindOf = (value: string): GameGenreKind =>
  (Object.keys(gameGenreKinds) as GameGenreKind[]).find(kind =>
    gameGenreKinds[kind].includes(value)) ?? 'genre';

/** The stored Genres of one kind, in stored order. */
export const genresOfKind = (genres: string[], kind: GameGenreKind): string[] =>
  genres.filter(value => kindOf(value) === kind);

/**
 * The stored Genres with one kind's values replaced by `next`. Every other
 * kind is kept as stored, so editing one field never drops another's values.
 */
export const withGenresOfKind = (
  genres: string[],
  kind: GameGenreKind,
  next: string[],
): string[] => [...genres.filter(value => kindOf(value) !== kind), ...next];
