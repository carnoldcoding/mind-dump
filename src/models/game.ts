import { snakeToCamel } from "../utils";

export interface IGame {
    id: string,
    title: string,
    description: string,
    slug: string,
    review: {
      story: string,
      gameplay: string,
      graphics: string,
      sound: string  
    },
    genres: string[],
    developers: string[],
    platforms: string[],
    releaseDate: Date,
    rating: number,
    imagePath: string,
    previewGifPath: string,
    bannerPath: string
}

export let gameData :IGame[] = [];

export const transformGameData = (gameData: any): IGame => {
    const transformedGame: any = {};
    Object.keys(gameData).forEach(key => {
        const camelKey = snakeToCamel(key);
        transformedGame[camelKey] = gameData[key];
    });

    return transformedGame as IGame;
};

export const fetchGameData = async () => {
    try {
        const response = await fetch("/gameData.json");
        if(response.ok){
            gameData = await response.json();
            return gameData;
        }
    } catch (error) {
        console.log("Error fetching data");
    }
}