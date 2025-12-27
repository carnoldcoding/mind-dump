import { useState } from "react";

const TextDropdown = ({ label, content } : {label: string, content:string | null})=> {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const toggle = () => setIsOpen(!isOpen);

    return (
        <>
            <div onClick={toggle} className={`flex select-none justify-between p-1 px-2 cursor-pointer hover:bg-nier-dark hover:text-nier-text-light group w-full ${isOpen ? 'bg-nier-dark' : 'text-nier-dark bg-nier-150/80'}`}>
                <h3 className={`capitalize group-hover:text-nier-text-light ${isOpen && 'text-nier-text-light'}`}>{label}</h3>
                <div className={`${isOpen ? 'rotate-180 text-nier-text-light' : ''} transition-all duration 75`}>v</div>
            </div>
            <div className={`overflow-y-scroll ${isOpen ? 'h-30 border-1 pt-2' : 'h-0'} px-3 transition-all duration 75 border-nier-150 bg-nier-100-lighter -mt-3`}>
                {content}
            </div>
        </>
    )
}

export default TextDropdown;