interface ButtonProps{
    handleClick: any,
    label: string,
    type: string
}
export const Button = ({handleClick, label, type} : ButtonProps) => {
    let jsx;
    if(type === "primary"){
        jsx = <button className="capitalize px-4 h-full py-2 border border-b-gray-950 rounded-sm cursor-pointer flex items-center
        bg-nier-text-dark text-nier-100-lighter text-nowrap hover:bg-nier-text-dark/90"
            {...(handleClick && { onClick: handleClick })}>
            {label}
        </button>
    }else{
        jsx = <button className="capitalize px-4 h-full py-2 border border-b-gray-950 rounded-sm cursor-pointer flex items-center
        hover:bg-nier-text-dark hover:text-nier-100-lighter text-nowrap"
            {...(handleClick && { onClick: handleClick })}>
            {label}
        </button>
    }
    return jsx;
}