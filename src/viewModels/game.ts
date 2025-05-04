import { createCover, createGameContainer } from "../views/gameListPage";
import { IGame, transformGameData } from "../models/game";
import { createGamePage } from "../views/gamePage";
import { history } from "../router";
import { gameData } from "../models/game";
import { renderGenreSelection, mountGenreListeners, mountSidebarListeners } from "./sidebar";

const mountGameCardListeners = () => {
    const cards = document.querySelectorAll('.game-card') as NodeListOf<HTMLElement>;
        cards.forEach((card : HTMLElement) => {
            card.addEventListener('click', (e) => {
                const gameSlug = (e.target as HTMLElement).dataset.slug;
                if(gameSlug){
                    history.push(`/game/${gameSlug}`);
                }
            });
        })
}

export const renderGameListPage = async (filters : any) => {
    const app = document.querySelector('#app');
    if(!app) return;

    app.innerHTML = '';
    app.innerHTML = createGameContainer();
    renderGenreSelection();
    const gameList = document.querySelector('#game-list') as HTMLElement;
    
    if(gameList){
        gameList.innerHTML = '';

        if(filters.genres){
            const filteredList = gameData.filter((game : any) => game.genres.some((genre : any) => filters.genres.includes(genre)))
            filteredList.forEach((game: any) => {
                const gameCoverDOM = createCover(transformGameData(game));
                gameList.append(gameCoverDOM);
            })
        }else{
            gameData.forEach((game: any) => {
                const gameCoverDOM = createCover(transformGameData(game));
                gameList.append(gameCoverDOM);
            })
        }
       
        mountGameCardListeners();
        mountSidebarListeners();
        mountGenreListeners();
    }
}

export const renderGamePage = async (slug : string) => {
    const game = gameData.find((g: IGame) => g.slug === slug);
    const app = document.querySelector('#app') as HTMLElement;
    if(!app) return;

    app.innerHTML = '';
    const gamePageHTML = createGamePage(transformGameData(game));
    app.append(gamePageHTML);
}