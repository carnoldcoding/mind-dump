import { createHomePage } from "../views/homePage"

export const renderHomePage = () => {
    const app = document.querySelector('#app') as HTMLElement;
    if(!app) return
    app.innerHTML = createHomePage();
}