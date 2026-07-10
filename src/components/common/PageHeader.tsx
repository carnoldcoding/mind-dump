import { useDecodeText } from "../../hooks/useDecodeText";
import { useBootSequence, stageIndex } from "../../context/BootSequenceContext";

const PageHeader = (props : {name: string}) => {
    const { stage } = useBootSequence();
    const readyForHeader = stageIndex(stage) >= stageIndex('header');
    const display = useDecodeText(props.name, readyForHeader);
    return (
        <div className="relative">
            <h1 className="text-5xl md:text-6xl text-nier-dark relative z-20 uppercase">{display}</h1>
            <span className="text-5xl md:text-6xl absolute left-1.5 top-1.5 text-nier-shadow/70 z-10 uppercase">{display}</span>
        </div>
    )
}

export default PageHeader;