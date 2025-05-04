
export const createSidebar = () : {
  element: HTMLElement,
  openMenu: () => void,
  closeMenu: () => void
} => {
    const sidebarTemplate = `
        <div id="game-list-controls-open" class="fixed top-0 right-0 z-9 p-3 flex items-end justify-center h-15 border-slate-100/20">
          <div class="flex items-center justify-center h-10 w-10 bg-black/30 rounded-md cursor-pointer">
                <ion-icon class="text-white text-2xl" name="list-outline"></ion-icon>
          </div>
        </div>
        <div id="side-menu-backdrop" class="w-full h-full bg-black/20 absolute top-0 left-0 backdrop-blur-sm z-10"></div>
        <aside class="fixed right-0 p-3 top-0 h-full w-2xs overflow-hidden bg-black/30 backdrop-blur-md z-11 duration-75 border-l border-slate-200/20 shadow-md" id="game-list-controls">
          <ion-icon id="game-list-controls-close" class="text-white text-3xl absolute top-4 right-4 cursor-pointer" name="close-outline"></ion-icon>
          <div class="flex flex-col gap-3">
            <div class="text-white text-2xl">Filters</div>
            <div>
              <div class="rounded-sm text-white w-full p-2 bg-slate-700 relative flex justify-between items-center cursor-pointer" id="genre-dropdown">
                <p class="text-slate-300 select-none ">Genres</p>
                <ion-icon name="caret-down-outline"></ion-icon>
              </div>
            </div>
            <button class="apply-filter-button bg-green-300 hover:bg-green-200 py-2 px-5 rounded-md cursor-pointer capitalize grow">
              apply
            </button>
            <button class="reset-filter-button bg-red-300 hover:bg-red-200 cursor-pointer py-2 px-5 rounded-md capitalize grow">
              reset
            </button>
          </div>
        </aside>
    `

    const sidebar = document.createElement('div');
    sidebar.innerHTML = sidebarTemplate;

    const openToggle = sidebar.querySelector('#game-list-controls-open') as HTMLElement;
    const closeToggle = sidebar.querySelector('#game-list-controls-close') as HTMLElement;
    const menu = sidebar.querySelector('#game-list-controls') as HTMLElement;
    const menuBackdrop = sidebar.querySelector('#side-menu-backdrop') as HTMLElement;
    
  
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

    return {
      element: sidebar,
      openMenu,
      closeMenu,
    }
}

