import { IGame } from "../models/game";
import { createSidebar } from "./sidebar";

export const createGameContainer = () => {
    return`
    <section id="game-list-container" class="p-5 w-3xl m-auto">
        ${createSidebar()}
        <div id="game-list" class="flex gap-5 flex-wrap justify-center">
        </div>
        <div id="game-list-controls-open" class="fixed top-0 right-0 z-9 p-3 flex items-end justify-center h-15 border-slate-100/20">
        <div class="flex items-center justify-center h-10 w-10 bg-black/30 rounded-md cursor-pointer">
          <ion-icon class="text-white text-2xl" name="list-outline"></ion-icon>
        </div>
      </div>
    </section>
`
} 
    
export const createCover = (game : IGame) : HTMLElement => {
    const coverDOM : HTMLElement = document.createElement('article');
    coverDOM.classList.add('w-56', 'h-80', 'rounded-md', 'shadow-md', 'border',
        'border-slate-500', 'overflow-hidden', 'cursor-pointer', 'relative', 'bg-cover',
        'bg-center', 'duration-75', 'hover:shadow-lg', 'focus:shadow-lg', 'focus:shadow-black/15', 'group', 'game-card'
    );
    coverDOM.setAttribute('tabindex', '0');
    coverDOM.dataset.slug = game.slug;
    coverDOM.style.backgroundImage = `url(${game.imagePath})`
    let coverHTML : string = `
        <div class="absolute bottom-0 bg-black/60 backdrop-blur-md p-2 flex items-center justify-between w-full h-16
            duration-100 z-1">
            <p class="text-white text-left">${game.title}</p>
            <div>
            <p class="text-white text-l border-1 h-10 w-10 flex items-center justify-center rounded-sm ">${game.rating}</p>
            </div>
        </div>

        <div class="
        pointer-events-none
        h-full w-full bg-center bg-cover absolute z-0 duration-100 opacity-0 group-hover:opacity-100 group-focus:opacity-100 flex flex-col
        justify-center items-center" style="background-image: url(${game.previewGifPath})">
            <div class="absolute pointer-events-none bg-black/60 h-full w-full">
            </div>
            <ion-icon name="eye-outline" class="text-white text-4xl"></ion-icon>
            <p class="z-1 text-white uppercase tracking-widest text-xs">view game</p>
        </div>
    `;
    coverDOM.innerHTML = coverHTML;
    return coverDOM;
}