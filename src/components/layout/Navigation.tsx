import { Link, useLocation } from "react-router-dom";
import { navItems } from "./NavItems";
import { useTrustedDevice } from "../../context/TrustedDeviceContext";
import { useStageState } from "../../context/BootSequenceContext";

const Navigation = () => {
    const location = useLocation();
    const { trusted } = useTrustedDevice();
    const { active: borderActive, animating: borderAnimating } = useStageState('borders');
    const { active: navActive, animating: navAnimating } = useStageState('nav');
    const visibleNavItems = navItems.filter(item => item.path !== "/system" || trusted);
    return (
        <>
            <nav className={`flex items-start justify-center pt-8 gap-10 fixed w-screen nier-dot-pattern bg-nier-50 z-50 ${!borderActive ? 'invisible' : ''} ${borderAnimating ? 'nier-boot-border-wipe' : ''}`}>
            {visibleNavItems.map((item, index) => {
                const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");
                const dominoClassName = `${!navActive ? 'invisible' : ''} ${navAnimating ? 'nier-boot-nav-item' : ''}`;
                const dominoStyle = navAnimating
                    ? ({ '--nier-nav-delay': `${index * 80}ms` } as React.CSSProperties)
                    : undefined;
                return (
                    isActive ?
                    // Every tab (active or not) uses this SAME outer size, always —
                    // nav's own height never changes on tab switch. Only the inner
                    // background rectangle (absolutely positioned, so it doesn't
                    // affect layout/reflow) grows to touch the line when active.
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`relative z-0 flex px-1 pt-2 pb-8 w-45 justify-start self-start transition-all duration-300 ease-in-out ${dominoClassName}`}
                        style={dominoStyle}
                    >
                    <div className="absolute inset-x-0 top-0 -z-10 h-full bg-nier-text-dark transition-all duration-300 ease-in-out" />
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
                        className={`relative z-0 flex px-1 pt-2 pb-8 w-45 justify-start self-start transition-all duration-300 ease-in-out ${dominoClassName}`}
                        style={dominoStyle}
                    >
                    <div className="absolute inset-x-0 top-0 -z-10 h-10 bg-nier-150/70 transition-all duration-300 ease-in-out" />
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
            <div className="h-5"></div>
        </>
    )
}

export default Navigation;