export const mountNavListeners = (handleRouting) => {
    const mind = document.getElementById('nav-mind');
    const home = document.getElementById('nav-home');
    const games = document.getElementById('nav-games');

    if(!mind || !home || !games) return;
    
    mind.addEventListener('click', ()=> {
        window.history.pushState(null, '', '/');
        handleRouting();
    })
    
    home.addEventListener('click', ()=> {
        window.history.pushState(null, '', '/');
        handleRouting();
    })

    games.addEventListener('click', ()=> {
        window.history.pushState(null, '', '/game-list');
        handleRouting();
    })
}