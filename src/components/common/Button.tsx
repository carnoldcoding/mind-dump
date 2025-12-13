export const Button = ({handleClick, label} : {handleClick : ()=> void, label: string}) => {
    return (
        <button className="capitalize px-4 py-2 border border-b-gray-950 rounded-sm cursor-pointer flex items-center
        hover:bg-nier-text-dark hover:text-nier-100-lighter"
            {...(handleClick && { onClick: handleClick })}>
            {label}
        </button>
    )
}