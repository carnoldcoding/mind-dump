import searchIcon from '../../assets/search.svg';
import searchLightIcon from '../../assets/search-light.svg';
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
  {
    iconActive: searchIcon,
    icon: searchLightIcon,
    label: "search",
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
  {
    iconActive: bookIcon,
    icon: bookLightIcon,
    label: "journal",
    path: "/journal"
  },
  {
    iconActive: powerIcon,
    icon: powerLightIcon,
    label: "system",
    path: "/system"
  },
];