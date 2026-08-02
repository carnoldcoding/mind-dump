import { useLocation } from "react-router";
import { navItems } from "./NavItems";
import { NavTab } from "./NavTab";
import { useTrustedDevice } from "../../context/TrustedDeviceContext";
import { useStageState } from "../../context/BootSequenceContext";
import { useSearch } from "../search/useSearch";
import searchIcon from '../../assets/search.svg';
import searchLightIcon from '../../assets/search-light.svg';

const Navigation = () => {
    const location = useLocation();
    const { trusted } = useTrustedDevice();
    const { active: borderActive, animating: borderAnimating } = useStageState('borders');
    const { active: navActive, animating: navAnimating } = useStageState('nav');
    const { isOpen: searchOpen, open: openSearch } = useSearch();
    const visibleNavItems = navItems.filter(item => item.path !== "/system" || trusted);

    const domino = (index: number) => ({
        className: `${!navActive ? 'invisible' : ''} ${navAnimating ? 'nier-boot-nav-item' : ''}`,
        style: navAnimating
            ? ({ '--nier-nav-delay': `${index * 80}ms` } as React.CSSProperties)
            : undefined,
    });

    return (
        <>
            <nav className={`flex items-start justify-center pt-8 gap-10 fixed w-screen nier-dot-pattern bg-nier-50 z-50 ${!borderActive ? 'invisible' : ''} ${borderAnimating ? 'nier-boot-border-wipe' : ''}`}>
                {visibleNavItems.map((item, index) => (
                    <NavTab
                        key={item.path}
                        to={item.path}
                        icon={item.icon}
                        iconActive={item.iconActive}
                        label={item.label}
                        active={
                            location.pathname === item.path ||
                            location.pathname.startsWith(item.path + "/")
                        }
                        {...domino(index)}
                    />
                ))}

                {/* A tab like any other, and the only one that opens rather
                    than goes. It takes the active state while its modal is
                    open, so the bar still says where you are. */}
                <NavTab
                    onClick={openSearch}
                    icon={searchLightIcon}
                    iconActive={searchIcon}
                    label="search"
                    active={searchOpen}
                    {...domino(visibleNavItems.length)}
                />
            </nav>
            <div className="h-5"></div>
        </>
    );
};

export default Navigation;
