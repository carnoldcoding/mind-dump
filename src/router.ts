import { renderHomePage } from "./viewModels/homePage";
import { renderGameListPage } from "./viewModels/gameList";
import { renderGameReview } from "./viewModels/gameReview";
import { renderNotFoundPage } from "./viewModels/notFound";
import { createBrowserHistory } from 'history';
import { renderSidebar } from "./viewModels/sidebar";

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
        renderGameReview(gameSlug);
    }else if (path.startsWith('/game-list')){
        const genres = urlParams.get('genres')?.split(',');
        const filters = {
            genres: genres,
            ratingRange: '',
            developer: '',
            dateRange: ''
        }
        renderGameListPage(filters);
        renderSidebar();
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
