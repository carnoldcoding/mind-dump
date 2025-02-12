import { renderGameListPage, renderGamePage } from './viewModels/game'
import './style.css'

const handleRouting = () => {
    const path = window.location.pathname;
    if(path.startsWith('/game/')){
        const gameSlug = path.split('/')[2];
        renderGamePage(gameSlug);
    }else if (path.startsWith('/game-list')){
        renderGameListPage();
    }
}

window.addEventListener('load', handleRouting);
window.addEventListener('popstate', handleRouting);