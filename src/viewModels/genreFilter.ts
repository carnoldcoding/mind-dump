import { createGenreFilter } from "../views/genreFilter";
import { genres } from "../models/genre";

export let selectedGenres : string[] = [];
let isOpen = false;

const onGenreSelect = (e : any) => {
  addGenre(e);
  renderGenreFilter();
}

export const resetSelectedGenres = () => {
  selectedGenres = [];
}


const addGenre = (e:any) => {
  const selectedGenre = e.target.dataset.genre;
  if(selectedGenres.includes(selectedGenre)) return;
  selectedGenres.push(e.target.dataset.genre); 
}

const removeGenre = (e:any) => {
  const selectedGenre = e.target.dataset.genre;
  selectedGenres = selectedGenres.filter(genre => genre != selectedGenre);
  renderGenreFilter();
}

const toggleDropdown = (e : any) => {
  const peerElement = e.target as HTMLElement;
  const element = peerElement.parentElement?.querySelector('.genre-select-container') as HTMLElement;
  if(element){
    if(isOpen){
      element.classList.add('hidden');
      isOpen = false;
    }else{
      element.classList.remove('hidden');
      isOpen = true;
    }
  }
}

export const renderGenreFilter = () => {
  const filterContainer = document.querySelector(".filters-container");
  if(!filterContainer) return;

  filterContainer.innerHTML = ``;

  const availableGenres = genres.filter(genre => !selectedGenres.includes(genre));
  filterContainer.append(createGenreFilter(
    availableGenres, 
    selectedGenres, 
    onGenreSelect, 
    removeGenre,
    toggleDropdown,
    isOpen));
}

export const renderSelectedGenres = () => {
  const selectedGenreContainer = document.querySelector('#genres-selected') as HTMLElement;
   const selectedGenreTemplate = selectedGenres.map(genre =>
`<p class="text-white tracking-wide bg-slate-700 hover:bg-slate-600 cursor-pointer
 py-.5 px-4 rounded-2xl flex text-center select-none selected-genre" data-genre=${genre}>${genre}</p>`).join('');

   selectedGenreContainer.innerHTML = selectedGenreTemplate;

   const genreElements = document.querySelectorAll('.selected-genre');
  
  genreElements.forEach(genre => {
    genre.addEventListener('click', removeGenre);
  });
}

