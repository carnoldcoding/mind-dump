export interface IGame {
    id: string,
    title: string,
    description: string,
    genres: string[],
    developers: string[],
    platforms: string[],
    releaseDate: Date,
    rating: number,
    imagePath: string,
    previewGifPath: string
}