import { createNotFoundPage } from "../views/notFoundPage";

export const renderNotFoundPage = () => {
    const app = document.querySelector('#app') as HTMLElement;
    app.innerHTML = createNotFoundPage();
}