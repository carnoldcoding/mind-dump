import { useLocation } from "react-router";
import { navItems } from "./NavItems";
import { NavTab } from "./NavTab";
import { useTrustedDevice } from "../../context/TrustedDeviceContext";

// Search is not in this bar. It was a tab that opened rather than went, and
// every Category shelf now searches itself with a field in its own panel — so
// the tab was a second way to do a thing the page you are already on does
// better. It is hidden, not removed: SearchModal is still mounted by Layout,
// still owns Cmd/Ctrl+K, and a URL carrying `?search` still opens it.
const Navigation = () => {
    const location = useLocation();
    const { trusted } = useTrustedDevice();
    const visibleNavItems = navItems.filter(item => item.path !== "/system" || trusted);

    return (
        <>
            <nav data-boot-border data-top-rule className="flex items-start justify-center pt-8 gap-10 fixed w-screen nier-dot-pattern bg-nier-50 z-50">
                {visibleNavItems.map((item) => (
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
                    />
                ))}
            </nav>
            <div className="h-5"></div>
        </>
    );
};

export default Navigation;
