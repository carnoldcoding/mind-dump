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
        // `fixed` + z-order on the outer <nav>, which wears NO .nier-dot-pattern
        // so they aren't overridden; the bar's look (pattern strip, background,
        // its flex layout) lives on the inner wrapper that wears the class,
        // mirroring BottomBar. Putting .nier-dot-pattern on a `fixed` element
        // demoted it to normal flow — its position:relative outranks the `fixed`
        // utility on a tie, and custom.css loads later. data-boot-border /
        // data-top-rule ride the wrapper so the tabs stay its direct children
        // for the boot stagger, the clip wipe reveals the bar, and CornerLines
        // reads the rule's bottom. Layout reserves the measured height on <main>,
        // so the old h-5 spacer is gone.
        <nav className="fixed top-0 left-0 w-screen z-50">
            <div data-boot-border data-top-rule className="flex items-start justify-center pt-8 gap-10 nier-dot-pattern bg-nier-50">
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
            </div>
        </nav>
    );
};

export default Navigation;
