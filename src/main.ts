import { renderGameListPage, renderGamePage } from './viewModels/game'
import { renderNotFoundPage } from './viewModels/notFound';
import { renderHomePage } from './viewModels/homePage';
import { mountNavListeners } from './viewModels/nav';
import { createBrowserHistory } from 'history';
import { fetchGameData } from './models/game';
import { renderSelectedGenres } from './viewModels/sidebar';
import './style.css'

export const history = createBrowserHistory();

const handleRouting = () => {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    if(path.startsWith('/game/')){
        const gameSlug = path.split('/')[2];
        renderGamePage(gameSlug);
    }else if (path.startsWith('/game-list')){
        const genres = urlParams.get('genres')?.split(',');
        console.log('Genre: ', genres);
        const filters = {
            genres: genres,
            ratingRange: '',
            developer: '',
            dateReleased: '12/2/2024'
        }
        renderGameListPage(filters);
        renderSelectedGenres();
    }else if(path == '/'){
        renderHomePage();
    }else{
        renderNotFoundPage();
    }
    setTimeout(()=>{
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth"
        });
    },10)
}

const setup = async () => {
    await fetchGameData();
    handleRouting();
    mountNavListeners();
}

history.listen(({action, location}) => {
    console.log(
        `The current URL is ${location.pathname}${location.search}${location.hash}`
      );
      console.log(`The last navigation action was ${action}`);
      handleRouting();
})

window.addEventListener('load', setup);
window.addEventListener('popstate', handleRouting);