const PageHeader = (props : {name: string}) => {
    return (
        <div className="relative">
            <h1 className="text-5xl md:text-6xl text-nier-dark relative z-20 uppercase">{props.name}</h1>
            <span className="text-5xl md:text-6xl absolute left-1.5 top-1.5 text-nier-shadow/70 z-10 uppercase">{props.name}</span>
        </div>
    )
}

export default PageHeader;