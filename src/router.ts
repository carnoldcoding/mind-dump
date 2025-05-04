import { renderHomePage } from "./viewModels/homePage";
import { renderGameListPage } from "./viewModels/game";
import { renderSelectedGenres } from "./viewModels/sidebar";
import { renderGamePage } from "./viewModels/game";
import { renderNotFoundPage } from "./viewModels/notFound";
import { createBrowserHistory } from 'history';

export const history = createBrowserHistory();

history.listen(({action, location}) => {
    console.log(
        `The current URL is ${location.pathname}${location.search}${location.hash}`
      );
      console.log(`The last navigation action was ${action}`);
      handleRouting();
})

export const handleRouting = () => {
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
