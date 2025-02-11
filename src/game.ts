import { createCover } from "./components/gameCover";
import { IGame } from "./interfaces/Game";

const snakeToCamel = (str: string): string => {
    return str.replace(/_([a-z])/g, (match, group1) => group1.toUpperCase());
};

const transformGameData = (gameData: any): IGame => {
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
            const data = await response.json();
            return data;
        }
    } catch (error) {
        console.log("Error fetching data");
    }
}

export const renderGameData = async () => {
    const data = await fetchGameData();
    const container = document.querySelector('#game-list') as HTMLElement;
    if(container){
        data.forEach((game: any) => {
            const gameCoverDOM = createCover(transformGameData(game));
            container.append(gameCoverDOM);
        })
    }
}