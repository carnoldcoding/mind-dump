import { createParentElement } from "../utils";

export const createNavbar = ({
    onHomeClick,
    onGamesClick
} : {
    onHomeClick: () => void;
    onGamesClick: () => void;
}) : HTMLElement => {
    const navbarTemplate = `
        <ul class="flex items-end gap-6 bg-black/30 px-5 py-2 rounded-lg backdrop-blur-lg">
            <ion-icon id="nav-home" class="text-white text-2xl tracking-wide capitalize cursor-pointer" name="home-outline"></ion-icon>
            <ion-icon id="nav-games" class="text-white text-2xl tracking-wide capitalize cursor-pointer" name="game-controller-outline"></ion-icon>
            <ion-icon id="search-icon" class="text-white text-2xl tracking-wide capitalize cursor-pointer" name="search-outline"></ion-icon>
        </ul>
    `

    const navbar = createParentElement('nav', 'sticky top-0 z-9  p-3 flex items-end justify-center h-15 border-slate-100/20')
    navbar.innerHTML = navbarTemplate;

    const home = navbar.querySelector('#nav-home');
    const games = navbar.querySelector('#nav-games');

    home?.addEventListener('click', onHomeClick);

    games?.addEventListener('click', onGamesClick);
    return navbar
}