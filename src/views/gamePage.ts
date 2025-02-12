import { IGame } from "../models/Game";

export const createGamePage = (game : IGame) : HTMLElement => {
    const gamePageDOM = document.createElement('section');
    return gamePageDOM;
}