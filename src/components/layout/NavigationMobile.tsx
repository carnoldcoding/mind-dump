import { Link, useLocation } from "react-router";
import { navItems } from "./NavItems";
import { useTrustedDevice } from "../../context/TrustedDeviceContext";

interface NavigationMobileProps{
    isOpen: boolean;
    onClose: () => void;
}

const NavigationMobile = ({ isOpen, onClose } : NavigationMobileProps) => {
    const location = useLocation();
    const { trusted } = useTrustedDevice();
    const visibleNavItems = navItems.filter(item => item.path !== "/system" || trusted);
    return (
        <>
        {/* The bar itself, and the only fixed element up here: it holds the
            prompt and the menu control as its own children, so they sit in it
            rather than over it, and the results panel hangs off its real
            bottom edge instead of off a coincidentally-matching height.

            h-20 lives here rather than on .nier-dot-pattern because the bottom
            bar wears that class too and wants no body at all. Of these 5rem
            the bottom 1.75px + 1.25rem is line and pattern, leaving the row
            above room to sit clear of them. */}
        <header data-boot-border className="nier-dot-pattern fixed top-0 left-0 w-screen h-20 bg-nier-50 z-101">
            <div className="flex items-center justify-end h-[calc(5rem-1.25rem-1.75px)] px-4">
                <button
                    onClick={onClose}
                    aria-label={isOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isOpen}
                    className="text-nier-text-dark h-11 w-11 text-4xl leading-none flex items-center justify-center flex-shrink-0"
                >
                    {isOpen ? '×' : '☰'}
                </button>
            </div>
        </header>
        {/* Reserves what the fixed bar covers — keep in step with the bar. */}
        <div className="h-20"></div>
        

        <nav className={`fixed right-0 top-0 flex flex-col justify-start items-center gap-5 bg-nier-100 max-w-md h-dvh p
            transition-all ease-in-out duration-300 overflow-hidden
            shadow-[-3px_5px_0_0] shadow-nier-shadow pt-24 z-100 ${isOpen ? 'w-60 p-5' : 'w-0 p0'}`}>
            {visibleNavItems.map(item => {
                const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");
                return (
                    isActive ?
                    <Link 
                        key={item.path} 
                        to={item.path}
                        onClick={onClose}
                        className="flex bg-nier-text-dark px-1 py-2 pt-2 w-45 items-center justify-start transition-all duration-300 ease-in-out -translate-x-1 "
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
                        onClick={onClose}
                        className="flex bg-nier-150/60 px-1 py-2 pt-2 w-45 items-center justify-start transition-all duration-300 ease-in-out hover:bg-nier-150/80"
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
        </>
    )
}

export default NavigationMobile;