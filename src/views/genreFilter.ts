export const createGenreFilter = () : HTMLElement => {
    const genreFilterTemplate = `
    <div id="genre-select" class="mt-2 max-h-20 overflow-y-scroll w-full bg-slate-700">
    </div>

    <div id="genres-selected" class="mt-2 flex gap-2 flex-wrap">
    </div>`

    const genreFilter = document.createElement('div');
    genreFilter.innerHTML = genreFilterTemplate;

    return genreFilter;
}