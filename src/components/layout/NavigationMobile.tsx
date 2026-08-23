import { Link, useLocation } from "react-router";
import { navItems } from "./NavItems";
import { useTrustedDevice } from "../../context/TrustedDeviceContext";
import { useScrollLock } from "../../utils/scrollLock";

interface NavigationMobileProps{
    isOpen: boolean;
    onClose: () => void;
}

const NavigationMobile = ({ isOpen, onClose } : NavigationMobileProps) => {
    const location = useLocation();
    const { trusted } = useTrustedDevice();
    const visibleNavItems = navItems.filter(item => item.path !== "/system" || trusted);

    // The drawer is a light overlay: it dims and locks the page behind it, and
    // a press off it closes. The backdrop is what rescues the close — the open
    // drawer overlaps the × in the bar, so without a press-outside there was
    // no way out but picking a destination.
    useScrollLock(isOpen);

    return (
        <>
        {/* The bar. `fixed` and the z-order live on this outer <header>, which
            carries NO .nier-dot-pattern — so they are not overridden. The bar's
            look (background, the dotted-strip border, its height) lives on the
            inner wrapper that wears .nier-dot-pattern, mirroring BottomBar. That
            class sets position:relative + z-index:0 for its pseudo-elements, and
            putting it on a `fixed` element used to demote the header to normal
            flow (custom.css loads after Tailwind, same @layer utilities, so its
            rule wins the tie). Layout reserves this bar's measured height on
            <main>, so no spacer is needed.

            data-boot-border / data-top-rule ride the inner wrapper: the clip
            wipe reveals the visible bar, the nav-item stagger addresses the row
            below as its direct child, and CornerLines reads the rule's bottom. */}
        <header className="fixed top-0 left-0 w-screen z-101">
            <div data-boot-border data-top-rule className="nier-dot-pattern bg-nier-50 h-[4.25rem]">
                <div className="flex items-center justify-end h-[calc(4.25rem-1.25rem-1.75px)] px-4">
                    <button
                        onClick={onClose}
                        aria-label={isOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isOpen}
                        className="text-nier-text-dark h-11 w-11 text-display leading-none flex items-center justify-center flex-shrink-0"
                    >
                        {isOpen ? '×' : '☰'}
                    </button>
                </div>
            </div>
        </header>

        {/* The dimming backdrop. Below the drawer (z-100) and the bar (z-101),
            above everything else. Kept mounted and faded so it can play out
            with the drawer's slide rather than cutting; inert when closed. A
            press anywhere on it closes. */}
        <div
            aria-hidden="true"
            onClick={onClose}
            className={`fixed inset-0 z-[99] bg-nier-dark/40 transition-opacity duration-300 ${
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        />

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
                    <h3 className="uppercase text-title text-nier-text-light leading-none transition-all duration-300 ease-in-out">
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
                    <h3 className="uppercase text-title text-nier-text-dark leading-none transition-all duration-300 ease-in-out">
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