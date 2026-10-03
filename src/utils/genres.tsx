/**
 * A game's Genres come in four kinds (see CONTEXT.md), kept apart so the
 * Review editor can offer each in its own field. They are still stored, and
 * filtered, as the one list.
 */
const gameGenresProper = [
    "4x",
    "action",
    "adventure",
    "arcade",
    "battle-royale",
    "beat-em-up",
    "card-game",
    "city-builder",
    "deckbuilder",
    "dungeon-crawler",
    "fighting",
    "hack-and-slash",
    "horror",
    "immersive-sim",
    "jrpg",
    "life-sim",
    "management",
    "metroidvania",
    "platformer",
    "point-and-click",
    "puzzle",
    "racing",
    "real-time-strategy",
    "rhythm",
    "roguelike",
    "roguelite",
    "rpg",
    "sandbox",
    "shoot-em-up",
    "shooter",
    "simulation",
    "souls-like",
    "sports",
    "stealth",
    "strategy",
    "survival",
    "tactics",
    "tower-defense",
    "visual-novel",
    "walking-simulator",
];

const gamePerspectives = [
    "first-person",
    "isometric",
    "side-scroller",
    "third-person",
    "top-down",
    "vr",
];

const gamePlayModes = [
    "co-op",
    "mmo",
    "multiplayer",
    "party",
    "pvp",
    "turn-based",
];

const gameTags = [
    "indie",
    "open-world",
    "story-rich",
];

export const gameGenreKinds = {
    genre: gameGenresProper,
    perspective: gamePerspectives,
    playMode: gamePlayModes,
    tag: gameTags,
};

export type GameGenreKind = keyof typeof gameGenreKinds;

export const gameGenres = [...gameGenresProper, ...gamePerspectives, ...gamePlayModes, ...gameTags];

export const movieGenres = [
    "action",
    "adventure",
    "anime",
    "animation",
    "biographical",
    "comedy",
    "coming-of-age",
    "crime",
    "disaster",
    "documentary",
    "drama",
    "family",
    "fantasy",
    "found-footage",
    "historical",
    "horror",
    "martial-arts",
    "musical",
    "mystery",
    "noir",
    "psychological",
    "romance",
    "satire",
    "sci-fi",
    "spy",
    "superhero",
    "thriller",
    "war",
    "western",
];

export const bookGenres = [
    "adventure",
    "biography",
    "classic",
    "dark-fantasy",
    "dystopian",
    "epic-fantasy",
    "essays",
    "fantasy",
    "fiction",
    "graphic-novel",
    "historical",
    "horror",
    "literary-fiction",
    "memoir",
    "mystery",
    "mythology",
    "non-fiction",
    "philosophy",
    "poetry",
    "political",
    "romance",
    "satire",
    "science-fiction",
    "self-help",
    "short-stories",
    "thriller",
    "true-crime",
    "young-adult",
];
