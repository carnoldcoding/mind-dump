import { history } from "../main";

export const mountNavListeners = () => {
    const home = document.getElementById('nav-home');
    const games = document.getElementById('nav-games');

    if(!home || !games) return;
    
    home.addEventListener('click', ()=> {
        history.push('/');
    })

    games.addEventListener('click', ()=> {
        history.push('/game-list');
    })
}