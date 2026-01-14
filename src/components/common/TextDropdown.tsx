import { useState, useRef, useEffect } from "react";

const TextDropdown = ({ label, content } : {label: string, content:string | null})=> {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const toggle = () => setIsOpen(!isOpen);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            setTimeout(() => {
                dropdownRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 100);
        }
    }, [isOpen]);

    return (
        <div ref={dropdownRef} className="flex flex-col gap-2">
            <div onClick={toggle} className={`flex select-none justify-between p-1 px-2 cursor-pointer hover:bg-nier-dark hover:text-nier-text-light group w-full ${isOpen ? 'bg-nier-dark' : 'text-nier-dark bg-nier-150/80'}`}>
                <h3 className={`capitalize group-hover:text-nier-text-light ${isOpen && 'text-nier-text-light'}`}>{label}</h3>
                <div className={`${isOpen ? 'rotate-180' : ''} transition-all duration-75 flex justify-center items-center`}>
                    <ion-icon 
                        name="caret-down-outline"
                        style={{ color: isOpen ? '#C4BEAC' : 'inherit' }}
                    ></ion-icon>
                </div>
            </div>
            <div className={`overflow-y-scroll ${isOpen ? 'h-30 border-1 pt-2' : 'h-0'} whitespace-pre-wrap px-3 transition-all duration 75 border-nier-150 bg-nier-100-lighter -mt-3`}>
                {content}
            </div>
        </div>
    )
}

export default TextDropdown;