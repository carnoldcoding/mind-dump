import { history } from "../main";

export const mountNavListeners = () => {
    const mind = document.getElementById('nav-mind');
    const home = document.getElementById('nav-home');
    const games = document.getElementById('nav-games');

    if(!mind || !home || !games) return;
    
    mind.addEventListener('click', ()=> {
        history.push('/');
    })
    
    home.addEventListener('click', ()=> {
        history.push('/');
    })

    games.addEventListener('click', ()=> {
        history.push('/game-list');
    })
}