import { createCover, createGameContainer } from "../views/gameList";
import { transformGameData } from "../models/game";
import { history } from "../router";
import { gameData } from "../models/game";

export const renderGameListPage = async (filters : any) => {
    const app = document.querySelector('#app');
    if(!app) return;

    app.innerHTML = '';
    const container = createGameContainer();
    app.appendChild(container);
    const gameList = container.querySelector('#game-list') as HTMLElement;

    const handleClick = (e : Event) => {
        const gameSlug = (e.target as HTMLElement).dataset.slug;
        if(gameSlug){
            history.push(`/game/${gameSlug}`);
        }
    }

    if(gameList){
        gameList.innerHTML = '';
        let listToRender = gameData;

        if (filters.genres) {
            listToRender = listToRender.filter((game: any) =>
              game.genres.some((genre: any) => filters.genres!.includes(genre))
            );
          }
          
          listToRender.forEach((game: any) => {
            const gameCoverDOM = createCover(transformGameData(game), handleClick);
            gameList.append(gameCoverDOM);
          });
    }
}
