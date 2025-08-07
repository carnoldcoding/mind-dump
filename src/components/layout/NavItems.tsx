interface NavItem {
    icon: string;
    iconActive: string;
    label: string;
    path: string;
}

export const navItems : NavItem[] = [
    {
        iconActive: "/src/assets/home.svg",
        icon: "/src/assets/home-light.svg",
        label: "home",
        path: "/"
    },
    {
        iconActive: "/src/assets/game-alt.svg",
        icon: "/src/assets/game-alt-light.svg",
        label: "games",
        path: "/games"
    },
    {
        iconActive: "/src/assets/monitor.svg",
        icon: "/src/assets/monitor-light.svg",
        label: "cinema",
        path: "/cinema"
    },
    {
        iconActive: "/src/assets/book.svg",
        icon: "/src/assets/book-light.svg",
        label: "books",
        path: "/books"
    },
    {
        iconActive: "/src/assets/book.svg",
        icon: "/src/assets/book-light.svg",
        label: "journal",
        path: "/journal"
    },
    {
        iconActive: "/src/assets/power.svg",
        icon: "/src/assets/power-light.svg",
        label: "system",
        path: "/system"
    },
]