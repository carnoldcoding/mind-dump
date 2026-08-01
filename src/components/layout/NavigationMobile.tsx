import { Link, useLocation } from "react-router-dom";
import { navItems } from "./NavItems";
import { useTrustedDevice } from "../../context/TrustedDeviceContext";
import { useStageState } from "../../context/BootSequenceContext";

interface NavigationMobileProps{
    isOpen: boolean;
    onClose: () => void;
}

const NavigationMobile = ({ isOpen, onClose } : NavigationMobileProps) => {
    const location = useLocation();
    const { trusted } = useTrustedDevice();
    const { active: borderActive, animating: borderAnimating } = useStageState('borders');
    const visibleNavItems = navItems.filter(item => item.path !== "/system" || trusted);
    return (
        <>
        {/* Sits in the bar's solid upper band, clear of the line and pattern
            strip along its bottom edge. h-11/w-11 is both a real tap target
            and big enough to hold the text-4xl glyph it used to overflow. */}
        <button
                onClick={onClose}
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isOpen}
                className="fixed top-2 right-4 z-101 text-nier-text-dark h-11 w-11 text-4xl leading-none flex items-center justify-center"
            >
            {isOpen ? '×' : '☰'}
        </button>
        <div className="fixed top-0 right-0 w-full z-99">
            <div className={`nier-dot-pattern fixed top-0 w-screen bg-nier-50 z-40 ${!borderActive ? 'invisible' : ''} ${borderAnimating ? 'nier-boot-border-wipe' : ''}`}></div>
        </div>
        {/* Reserves what the fixed bar covers — keep in step with the
            nier-dot-pattern height in custom.css. */}
        <div className="h-20"></div>
        

        <nav className={`fixed right-0 top-0 flex flex-col justify-start items-center gap-5 bg-nier-100 max-w-md h-screen p
            transition-all ease-in-out duration-300 overflow-hidden
            shadow-[-3px_5px_0_0] shadow-nier-shadow pt-15 z-100 ${isOpen ? 'w-60 p-5' : 'w-0 p0'}`}>
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