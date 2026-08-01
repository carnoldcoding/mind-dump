import { useStageState } from '../../../context/BootSequenceContext';

/**
 * The page footer: a band along the bottom of the viewport, bordered along its
 * top edge by the same nier-dot-pattern line and strip the nav bar wears — a
 * mirror of it, and like it, holding no content of its own. Wipes in
 * alongside the nav's own border during the
 * 'borders' stage so the two read as one synchronized frame being drawn —
 * but right-to-left (nier-boot-border-wipe-reverse), opposite the top bar's
 * left-to-right direction. The -scale-y-100 flip is vertical-only, so it
 * doesn't affect which way the wipe reads.
 */
const BottomBar = () => {
  const { active, animating } = useStageState('borders');

  if (!active) return null;

  return (
    // bottom-0, not an offset: the bar's own reserved padding already holds
    // the line and the pattern strip, so lifting it off the viewport edge only
    // opened a gap of bare page background underneath it.
    <div
      className={`fixed bottom-0 left-0 w-screen z-50 -scale-y-100 ${animating ? 'nier-boot-border-wipe-reverse' : ''}`}
      aria-hidden="true"
    >
      {/* The class puts the line and pattern along the box's bottom edge and
          the -scale-y-100 above flips them to the top, so height given here
          becomes footer body hanging below them — the pattern reads as the
          footer's top border rather than as the whole footer. */}
      <div className="nier-dot-pattern bg-nier-50 w-full h-12" />
    </div>
  );
};

export default BottomBar;
