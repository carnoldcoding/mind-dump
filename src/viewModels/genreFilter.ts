import { history } from "../router";

export let filters : string[] = [];
const genres = ["action", "rpg", "third-person", "first-person"]


const createGenreSelection = () => {
  const unselectedGenres = genres.filter((genre : any) => !filters.includes(genre));
  let genresTemplate = ``;
  unselectedGenres.forEach(option => {
      genresTemplate += `<p class="p-2 text-white w-full hover:bg-slate-600 cursor-pointer select-none" data-filter=${option}>${option}</p>`;
  })

  return genresTemplate;
}

export const renderGenreSelection = () => {
  const genreSelectBox = document.querySelector('#genre-select') as HTMLElement;
  genreSelectBox.innerHTML = createGenreSelection();
  const options = document.querySelectorAll('#genre-select > p');
  options.forEach(option => {
    option.addEventListener('click', addFilter);
  })
}


export const renderSelectedGenres = () => {
  const selectedGenreContainer = document.querySelector('#genres-selected') as HTMLElement;
   const selectedGenreTemplate = filters.map(filter =>
`<p class="text-white tracking-wide bg-slate-700 hover:bg-slate-600 cursor-pointer
 py-.5 px-4 rounded-2xl flex text-center select-none selected-genre" data-filter=${filter}>${filter}</p>`).join('');

   selectedGenreContainer.innerHTML = selectedGenreTemplate;

   const genreElements = document.querySelectorAll('.selected-genre');
  
  genreElements.forEach(genre => {
    genre.addEventListener('click', removeFilter);
  });
}


const addFilter = (e:any) => {
  const filter = e.target.dataset.filter;
  if(filters.includes(filter)) return;
  filters.push(filter);
  renderSelectedGenres();
  renderGenreSelection();
}

const removeFilter = (e:any) => {
 const selectedFilter = e.target.dataset.filter;
 if(!filters.includes(selectedFilter)) return;
 filters = filters.filter(f => f != selectedFilter);
 renderSelectedGenres();
 renderGenreSelection();
}

const applyFilters = async (e:any) => {
  if(filters.length > 0){
    history.push(`/game-list/?genres=${filters}`)
  }else{
    history.push('/game-list');
  }
}

const resetFilters = async (e:any) => {
  filters = [];
  applyFilters(e);
}

export const mountGenreListeners = () => {
    const optionContainer = document.querySelector('#genre-select') as HTMLElement;
    const dropdownIcon = document.querySelector('#genre-dropdown > ion-icon');
    const applyButton = document.querySelector('.apply-filter-button');
    const resetButton = document.querySelector('.reset-filter-button');
    
   dropdownIcon?.addEventListener('click', ()=>{
    optionContainer.classList.toggle('hidden');
   })

   applyButton?.addEventListener('click', applyFilters)
   resetButton?.addEventListener('click', resetFilters);
}