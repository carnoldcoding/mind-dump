import { renderGameListPage, renderGamePage } from './viewModels/game'
import { renderNotFoundPage } from './viewModels/notFound';
import { renderHomePage } from './viewModels/homePage';
import { mountNavListeners } from './viewModels/nav';
import { createBrowserHistory } from 'history';
import './style.css'

export const history = createBrowserHistory();

const handleRouting = () => {
    const path = window.location.pathname;
    if(path.startsWith('/game/')){
        const gameSlug = path.split('/')[2];
        renderGamePage(gameSlug);
    }else if (path.startsWith('/game-list')){
        renderGameListPage();
    }else if(path == '/'){
        renderHomePage();
    }else{
        renderNotFoundPage();
    }
}

history.listen(({action, location}) => {
    console.log(
        `The current URL is ${location.pathname}${location.search}${location.hash}`
      );
      console.log(`The last navigation action was ${action}`);
      handleRouting();
})


window.addEventListener('load', handleRouting);
window.addEventListener('popstate', handleRouting);
window.addEventListener('load', mountNavListeners);