// One tab shape, whether it goes somewhere or does something.
//
// Destinations are links; Search is a button that opens a modal. They look and
// behave identically in the bar, because from the bar's point of view they are
// the same kind of thing — a place you are, or are not, currently in.

import { Link } from "react-router";

type Props = {
    icon: string;
    iconActive: string;
    label: string;
    active: boolean;
    /** A destination. Omitted makes this a button, and `onClick` does the work. */
    to?: string;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
};

export const NavTab = ({ icon, iconActive, label, active, to, onClick, className = '', style }: Props) => {
    // Every tab uses the SAME outer size, always — the nav's own height never
    // changes on tab switch. Only the inner background rectangle, absolutely
    // positioned so it cannot affect layout, grows when active.
    const outer = `relative z-0 flex px-1 pt-2 pb-8 w-45 justify-start self-start transition-all duration-300 ease-in-out ${className}`;

    const body = (
        <>
            {/* Reaches 1.75px past the tab's own bottom so an active tab meets
                the pattern border's rule rather than stopping a hair above it
                and leaving a seam. */}
            <div
                className={`absolute inset-x-0 top-0 -z-10 transition-all duration-300 ease-in-out ${
                    active ? 'bottom-[-1.75px] bg-nier-text-dark' : 'h-10 bg-nier-150/70'
                }`}
            />
            <div className={`h-5.5 w-5.5 flex items-center justify-center p-0.5 mr-1 ml-0.5 transition-all duration-300 ease-in-out ${
                active ? 'bg-nier-text-light' : 'bg-nier-text-dark'
            }`}>
                <img
                    src={active ? iconActive : icon}
                    alt=""
                    className="w-full h-full object-contain transition-all duration-300 ease-in-out"
                />
            </div>
            <h3 className={`uppercase text-2xl leading-none transition-all duration-300 ease-in-out ${
                active ? 'text-nier-text-light' : 'text-nier-text-dark'
            }`}>
                {label}
            </h3>
        </>
    );

    if (to) {
        return <Link to={to} className={outer} style={style}>{body}</Link>;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            aria-expanded={active}
            className={`${outer} cursor-pointer text-left`}
            style={style}
        >
            {body}
        </button>
    );
};
