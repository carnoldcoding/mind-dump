import { Link, useLocation } from "react-router-dom";
import { navItems } from "./NavItems";

interface NavigationMobileProps{
    isOpen: boolean;
    onClose: () => void;
}

const NavigationMobile = ({ isOpen, onClose } : NavigationMobileProps) => {
    const location = useLocation();
    return (
        <>
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black/5 z-1"
                onClick={onClose}
            />
        )}
        
        <nav className={`fixed right-0 top-0 flex flex-col justify-start items-center gap-5 bg-nier-100 max-w-md h-screen p
            transition-all ease-in-out duration-300 overflow-hidden
            shadow-[-3px_5px_0_0] shadow-nier-shadow pt-15 z-40 ${isOpen ? 'w-60 p-5' : 'w-0 p0'}`}>
            {navItems.map(item => {
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
            <div className="nier-dot-pattern fixed w-screen bg-nier-50 z-30"></div>
            <div className="h-2"></div>

        </>
    )
}

export default NavigationMobile;