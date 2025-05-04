import { gameData } from "../models/game";
import { createGamePage } from "../views/gameReview";
import { IGame, transformGameData } from "../models/game";

export const renderGameReview = async (slug : string) => {
    const game = gameData.find((g: IGame) => g.slug === slug);
    const app = document.querySelector('#app') as HTMLElement;
    if(!app) return;

    app.innerHTML = '';
    const gamePageHTML = createGamePage(transformGameData(game));
    app.append(gamePageHTML);
} 