import { fetchGameData } from './models/game';
import { renderNavbar } from './viewModels/nav';
import { handleRouting } from './router';
import './style.css'

const init = async () => {
    await fetchGameData();
    renderNavbar();
    handleRouting();
}

//window.addEventListener('load', init);