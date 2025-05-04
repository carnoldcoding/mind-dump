import { createSidebar } from "../views/sidebar";

export const renderSidebar = () => {
  const app = document.querySelector("#app");
  const { element, openMenu, closeMenu } = createSidebar();

  app?.append(element);
}