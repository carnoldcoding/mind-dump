import homeIcon from '../../assets/home.svg';
import homeLightIcon from '../../assets/home-light.svg';
import gameAltIcon from '../../assets/game-alt.svg';
import gameAltLightIcon from '../../assets/game-alt-light.svg';
import monitorIcon from '../../assets/monitor.svg';
import monitorLightIcon from '../../assets/monitor-light.svg';
import bookIcon from '../../assets/book.svg';
import bookLightIcon from '../../assets/book-light.svg';
import powerIcon from '../../assets/power.svg';
import powerLightIcon from '../../assets/power-light.svg';

interface NavItem {
  icon: string;
  iconActive: string;
  label: string;
  path: string;
}

export const navItems: NavItem[] = [
  // Now, not Search: the index route stopped being a search box (ADR-0003).
  // Search is a pinned control in the bar rather than a destination, so it
  // isn't in this list at all.
  {
    iconActive: homeIcon,
    icon: homeLightIcon,
    // Reads "current"; the page is still Now. UI copy over vocabulary, the
    // same way the Backlog says "Started" for Status `active`.
    label: "current",
    path: "/"
  },
  {
    iconActive: gameAltIcon,
    icon: gameAltLightIcon,
    label: "games",
    path: "/games"
  },
  {
    iconActive: monitorIcon,
    icon: monitorLightIcon,
    label: "cinema",
    path: "/cinema"
  },
  {
    iconActive: bookIcon,
    icon: bookLightIcon,
    label: "books",
    path: "/books"
  },
  // {
  //   iconActive: bookIcon,
  //   icon: bookLightIcon,
  //   label: "journal",
  //   path: "/journal"
  // },
  {
    iconActive: powerIcon,
    icon: powerLightIcon,
    label: "system",
    path: "/system"
  },
];