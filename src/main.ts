import { renderGameListPage, renderGamePage } from './viewModels/game'
import { renderNotFoundPage } from './viewModels/notFound';
import './style.css'

const handleRouting = () => {
    const path = window.location.pathname;
    console.log(`Path: ${path}`)
    if(path.startsWith('/game/')){
        const gameSlug = path.split('/')[2];
        renderGamePage(gameSlug);
    }else if (path.startsWith('/game-list')){
        renderGameListPage();
    }else if(path == '/'){

    }else{
        renderNotFoundPage();
    }
}

window.addEventListener('load', handleRouting);
window.addEventListener('popstate', handleRouting);