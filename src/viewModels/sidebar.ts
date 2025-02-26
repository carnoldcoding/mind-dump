let filters : string[] = [];

export const mountSidebarListeners = () =>{
    //Open / Close Filter Menu Functionality
    const openToggle = document.querySelector('#game-list-controls-open') as HTMLElement;
    const closeToggle = document.querySelector('#game-list-controls-close') as HTMLElement;
    const menu = document.querySelector('#game-list-controls') as HTMLElement;
    const menuBackdrop = document.querySelector('#side-menu-backdrop') as HTMLElement;
    if(!menu || !menuBackdrop || !openToggle || ! closeToggle) {
      console.log(openToggle);
      return;
    }

    const openMenu = () => {
      menu.classList.add('w-2xs');
      menu.classList.remove('hidden');
      menuBackdrop.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }

    const closeMenu = () => {
      menu.classList.remove('w-2xs');
      menu.classList.add('hidden');
      menuBackdrop.style.display = 'none';
      document.body.style.overflow = 'auto';
    }

    menuBackdrop.addEventListener('click', closeMenu);
    openToggle.addEventListener('click', openMenu);
    closeToggle.addEventListener('click', closeMenu);
}

const renderSelectedGenres = () => {
  const selectedGenreContainer = document.querySelector('#genres-selected') as HTMLElement;
   let selectedGenreTemplate = ``;

  filters.forEach(filter => {
    selectedGenreTemplate += `<p class="text-white tracking-wide bg-slate-700 hover:bg-slate-600 cursor-pointer py-.5 px-4 rounded-2xl flex text-center select-none selected-genre" data-filter=${filter}>${filter}</p>`
   })
   selectedGenreContainer.innerHTML = selectedGenreTemplate;

   const genreElements = document.querySelectorAll('.selected-genre');
  
  genreElements.forEach(genre => {
    genre.addEventListener('click', removeFilter);
  });
  
   selectedGenreTemplate = '';
}


const addFilter = (e:any) => {
  const filter = e.target.dataset.filter;
  if(filters.includes(filter)) return;
  filters.push(filter);
  renderSelectedGenres();
}

const removeFilter = (e:any) => {
 const selectedFilter = e.target.dataset.filter;
 if(!filters.includes(selectedFilter)) return;
 filters = filters.filter(f => f != selectedFilter);
 renderSelectedGenres();
}

export const mountGenreListeners = () => {
   const options = document.querySelectorAll('#genre-select > p');
   options.forEach(option => {
     option.addEventListener('click', addFilter);
   })
}