import { IGame } from "../interfaces/Game";


export const createCover = (game : IGame) => {
    const coverDOM : HTMLElement = document.createElement('div');
    let coverHTML : string = `
          <article class="w-56 h-80 rounded-md shadow-md border 
            border-slate-500
            overflow-hidden
            cursor-pointer
            relative
            bg-cover bg-center
            duration-75
            hover:shadow-lg
            hover:shadow-black/15
            group
            bg-[url(${game.imagePath})]">
            <div class="absolute bottom-0 bg-black/60 backdrop-blur-md p-2 flex items-center
              duration-100 z-1">
              <p class="text-white text-center">${game.title}</p>
              <div>
                <p class="text-white text-l border-1 h-10 w-10 flex items-center justify-center rounded-sm ">${game.rating}</p>
              </div>
            </div>

            <div class="
            h-full w-full bg-center bg-cover absolute z-0 duration-100 opacity-0 group-hover:opacity-100 flex flex-col
            justify-center items-center
            bg-[url('${game.previewGifPath}')]">
              <div class="absolute bg-black/60 h-full w-full">
              </div>
              <ion-icon name="eye-outline" class="text-white text-4xl"></ion-icon>
              <p class="z-1 text-white uppercase tracking-widest text-xs">view game</p>
            </div>
          </article>
    `;
    coverDOM.innerHTML = coverHTML;
    return coverDOM;
}