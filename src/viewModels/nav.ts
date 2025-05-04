import { createNavbar } from "../views/nav";
import { history } from "../router";

export const renderNavbar = () => {
    const body = document.body as HTMLElement;
    const app = body.querySelector('#app') as HTMLElement;

    const navbarHTML = createNavbar({
        onHomeClick: () => history.push('/'),
        onGamesClick: () => history.push('/game-list')
    });
    body.insertBefore(navbarHTML, app);
}