import { createParentElement } from "../utils";

export const createGenreFilter = (
  availableGenres: string[],
  selectedGenres: string[],
  onGenreSelect: (e: any) => void,
  removeGenre: (e: any) => void,
  toggleDropdown: (e: any) => void,
  isOpen: boolean
): HTMLElement => {

    //Create Genre Select Box
    const genreFilterTemplate = `

    <div class="rounded-sm text-white w-full p-2 bg-slate-700 relative flex 
    hover:bg-slate-600
    justify-between items-center cursor-pointer" id="genre-dropdown">
        <p class="text-slate-300 select-none pointer-events-none">Genres</p>
        <ion-icon class="pointer-events-none" name="caret-down-outline"></ion-icon>
    </div>

    <div class="genre-select-container ${!isOpen && "hidden"}">
       <div id="genre-select" class="mt-2 max-h-20 overflow-y-scroll w-full bg-slate-700">
       </div>

       <div id="genres-selected" class="mt-2 flex gap-2 flex-wrap">
    </div>
    </div>
    `

    const genreFilter = document.createElement('div');
    genreFilter.innerHTML = genreFilterTemplate;
    
    const genreSelectBox = genreFilter.querySelector('#genre-select') as HTMLElement;

    //Create Current Genre Choices
    let genreChoicesTemplate = ``;
  
    availableGenres.forEach(option => {
      genreChoicesTemplate += `<p class="p-2 text-white w-full hover:bg-slate-600 cursor-pointer select-none" data-genre=${option}>${option}</p>`;
    })

    genreSelectBox.innerHTML = genreChoicesTemplate;

    const choices = genreSelectBox.querySelectorAll('p');
    choices.forEach(choice => {
        choice.addEventListener('click', onGenreSelect);
    })

    //Add EventListener to toggle menu
    const genreContainer = genreFilter.querySelector('.genre-select-container');
    const genreDropdown = genreFilter.querySelector('#genre-dropdown');

    genreDropdown?.addEventListener('click', toggleDropdown);

    //Create Selected Genre Bubbles
    const selectedGenreContainer = genreFilter.querySelector('#genres-selected') as HTMLElement;
    
    //Append selectedGenres onto the container as children
    const selectedGenreElements = createSelectedGenres(selectedGenres, removeGenre);
    selectedGenreContainer.append(...selectedGenreElements);
    return genreFilter;
}

const createSelectedGenres = (selectedGenres : string[], removeGenre : (e: any) => void) : HTMLElement[] => {
  const genreArr : HTMLElement[] = [];
  selectedGenres.forEach(genre => {
    const p = createParentElement('p', 'text-white tracking-wide bg-slate-700 hover:bg-slate-600 cursor-pointer py-.5 px-4 rounded-2xl flex text-center select-none selected-genre');
    p.textContent = genre;
    p.dataset.genre = genre;
    p.addEventListener('click', removeGenre);
    genreArr.push(p);
  })

  return genreArr;
}