import { useStageState } from '../../../context/BootSequenceContext';

/**
 * Content-free mirror of the nav bar's nier-dot-pattern border, fixed to the
 * bottom of the viewport. Wipes in alongside the nav's own border during the
 * 'borders' stage so the two read as one synchronized frame being drawn —
 * but right-to-left (nier-boot-border-wipe-reverse), opposite the top bar's
 * left-to-right direction. The -scale-y-100 flip is vertical-only, so it
 * doesn't affect which way the wipe reads.
 */
const BottomBar = () => {
  const { active, animating } = useStageState('borders');

  if (!active) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 w-screen z-50 -scale-y-100 ${animating ? 'nier-boot-border-wipe-reverse' : ''}`}
      aria-hidden="true"
    >
      <div className="nier-dot-pattern bg-nier-50 w-full" />
    </div>
  );
};

export default BottomBar;
