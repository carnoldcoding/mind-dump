import { Link, useLocation } from "react-router-dom";

interface NavItem {
    icon: string;
    iconActive: string;
    label: string;
    path: string;
}
const Navigation = () => {
    const location = useLocation();
    const navItems : NavItem[] = [
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
            label: "movies",
            path: "/movies"
        },
        {
            iconActive: "/src/assets/monitor-alt.svg",
            icon: "/src/assets/monitor-alt-light.svg",
            label: "shows",
            path: "/shows"
        },
        {
            iconActive: "/src/assets/book.svg",
            icon: "/src/assets/book-light.svg",
            label: "books",
            path: "/books"
        },
        {
            iconActive: "/src/assets/power.svg",
            icon: "/src/assets/power-light.svg",
            label: "system",
            path: "/system"
        },
    ]
    return (
        <>
            <nav className="flex justify-center pt-8 gap-10">
            {navItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                    isActive ?
                    <Link 
                        key={item.path} 
                        to={item.path}
                        className="flex bg-nier-text-dark px-1 py-2 pt-2 w-45 items-center justify-start transition-all duration-300 ease-in-out translate-y-1 -mb-4"
                    >
                    <div className="bg-nier-text-light h-5.5 w-5.5 flex items-center justify-center p-0.5 mr-1 ml-0.5 transition-all duration-300 ease-in-out">
                        <img
                            src={item.iconActive}
                            alt={`${item.label} icon`}
                            className="w-full h-full object-contain transition-all duration-300 ease-in-out"
                        />
                    </div>
                    <h3 className="uppercase text-2xl text-nier-text-light leading-none transition-all duration-300 ease-in-out">
                        {item.label}
                    </h3>
                    </Link>
                    :
                    <Link 
                        key={item.path} 
                        to={item.path} 
                        className="flex bg-nier-150/60 px-1 py-2 pt-2 w-45 items-center self-center justify-start transition-all duration-300 ease-in-out hover:bg-nier-150/80"
                    >
                    <div className="bg-nier-text-dark h-5.5 w-5.5 flex items-center justify-center p-0.5 mr-1 ml-0.5 transition-all duration-300 ease-in-out">
                        <img
                            src={item.icon}
                            alt={`${item.label} icon`}
                            className="w-full h-full object-contain transition-all duration-300 ease-in-out"
                        />
                    </div>
                    <h3 className="uppercase text-2xl text-nier-text-dark leading-none transition-all duration-300 ease-in-out">
                        {item.label}
                    </h3>
                    </Link>
                )
                })}
            </nav>
            <div className="nier-dot-pattern"></div>
        </>
    )
}

export default Navigation;