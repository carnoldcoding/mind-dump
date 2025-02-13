import { IGame } from "../models/game";

const createGenreBubbles = (genres : string[]) => {
    let genresHTML = ``;
    genres.forEach(genre => {
        genresHTML += `
            <p class="text-white text-sm rounded-sm px-2 capitalize py-1 bg-slate-800">${genre}</p>
        `;
    })
    return genresHTML
}

export const createGamePage = (game : IGame) : HTMLElement => {
    const gamePageDOM = document.createElement('section');
    gamePageDOM.classList.add('game-container', 'flex', 'flex-col', 'items-center', '-mt-15')
    gamePageDOM.innerHTML = `
        <div class=" w-full h-72 bg-cover bg-center relative "
            style="background-image: url('${game.bannerPath}')">
            <div class="absolute bottom-0 w-full h-20 bg-linear-to-b from-transparent to-slate-700"></div>
        </div>
        <article class="flex flex-col gap-12 max-w-4xl p-2 sm:px-4 md:px-6 lg:px-10">
            <div class="flex flex-col items-center justify-center sm:flex-row sm:items-unset gap-5 ">
            <div>
                <div class="relative -mt-16 z-1 h-80 w-56 bg-cover border-slate-500 rounded-md shadow-md border bg-center shadow-black/40"
                style="background-image: url('${game.imagePath}')">
                </div>
                <div class="relative max-w-56 flex flex-wrap gap-2 mt-2">
                    ${createGenreBubbles(game.genres)}
                </div>
            </div>
            <div class="max-w-2xl p-3">
                <header class="flex flex-col gap-2">
                <h1 class="text-white text-4xl">${game.title}</h1>
                <div class="flex justify-between align-bottom">
                    <div>
                        <h3 class="text-slate-200 text-l">${game.developers}</h3>
                        <h3 class="text-slate-200 text-l">${game.releaseDate}</h3>
                    </div>
                    <div>
                    <p class="text-white text-l border-1 h-10 w-10 flex items-center justify-center rounded-sm">${game.rating}</p>
                    </div>
                </div>
                <hr class="text-white">
                </header>
                <div>
                <p class="text-white pt-3">
                   ${game.description}
                </p>
                </div>
            </div>
            </div>
            <div class="w-full p-2 flex flex-col gap-3">
                <h3 class="text-white text-4xl">Review</h3>
                <hr class="text-white">
                <div class="mt-2">
                    <h3 class="text-white text-lg font-bold">Story & World Building</h3>
                    <p class="text-slate-200">
                        ${game.review.story}
                    </p>
                </div>
                <div class="mt-2">
                    <h3 class="text-white text-lg font-bold">Gameplay</h3>
                    <p class="text-slate-200">
                        ${game.review.gameplay}
                    </p>
                </div>

                <div class="mt-2">
                    <h3 class="text-white text-lg font-bold">Graphics</h3>
                    <p class="text-slate-200">
                        ${game.review.graphics}
                    </p>
                </div>

                <div class="mt-2">
                    <h3 class="text-white text-lg font-bold">Sound Design</h3>
                    <p class="text-slate-200">
                        ${game.review.sound}
                    </p>
                </div>
            </div>
        </article>
      `
    return gamePageDOM;
}