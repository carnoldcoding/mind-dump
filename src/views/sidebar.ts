

export const createSidebar = () => {
    return `
        <div>
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
              <div id="genre-select" class="mt-2 max-h-20 overflow-y-scroll w-full bg-slate-700">
              </div>
              <div id="genres-selected" class="mt-2 flex gap-2 flex-wrap">
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
       </div>
    `
}

