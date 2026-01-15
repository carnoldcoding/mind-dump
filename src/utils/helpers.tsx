function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function transformKeysToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToSnakeCase);
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      acc[camelToSnake(key)] = transformKeysToSnakeCase(value);
      return acc;
    }, {} as Record<string, any>);
  }

  return obj;
}

  const gameGenres = [
      "action",
      "rpg",
      "action-rpg",
      "souls-like",
      "shooter",
      "first-person",
      "third-person",
      "strategy",
      "simulation",
      "open-world",
      "metroidvania",
      "roguelike",
      "survival",
      "horror",
      "puzzle",
      "platformer",
      "story-rich",
      "multiplayer"
  ]

  const movieGenres = [
  "action",
  "adventure",
  "drama",
  "comedy",
  "thriller",
  "horror",
  "sci-fi",
  "fantasy",
  "documentary",
  "animation",
  "romance",
  "crime",
  "mystery",
  "family",
  "biographical",
  "musical",
  "war",
  "western"
];

const bookGenres = [
  "fiction",
  "fantasy",
  "science-fiction",
  "mystery",
  "thriller",
  "romance",
  "historical",
  "non-fiction",
  "biography",
  "self-help",
  "philosophy",
  "horror",
  "poetry",
  "young-adult",
  "classic",
  "graphic-novel",
  "memoir",
  "short-stories"
];


export {transformKeysToSnakeCase, gameGenres, movieGenres, bookGenres}