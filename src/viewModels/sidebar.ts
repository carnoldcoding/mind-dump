import { createSidebar } from "../views/sidebar";
import { renderGenreFilter } from "./genreFilter";
import { selectedGenres, resetSelectedGenres} from "./genreFilter";
import { history } from "../router";

export const renderSidebar = () => {

  const applyFilters = () => {
    //Apply Genre Filters
    if(selectedGenres.length > 0){
        history.push(`/game-list/?genres=${selectedGenres}`)
      }else{
        history.push('/game-list');
      }
    //Apply other filters
  }

  const resetFilters = () => {
    //Reset Genre Filters
    resetSelectedGenres();
    history.push('/game-list');
    //Reset other filters
  }

  // Render sidebar
  const app = document.querySelector("#app");
  const { element, openMenu, closeMenu } = createSidebar(applyFilters, resetFilters);
  app?.append(element);

  // Render filters
  renderGenreFilter();
}