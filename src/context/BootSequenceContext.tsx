import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type BootStage = 'lines' | 'triangles' | 'borders' | 'nav' | 'header' | 'done';

const STAGE_ORDER: BootStage[] = ['lines', 'triangles', 'borders', 'nav', 'header', 'done'];

const STAGE_DURATIONS: Record<Exclude<BootStage, 'done'>, number> = {
  lines: 500,
  triangles: 700,
  borders: 500,
  nav: 600,
  header: 800,
};

export const stageIndex = (stage: BootStage) => STAGE_ORDER.indexOf(stage);

interface BootSequenceContextType {
  stage: BootStage;
  skip: () => void;
}

const BootSequenceContext = createContext<BootSequenceContextType | undefined>(undefined);

export const BootSequenceProvider = ({ children }: { children: ReactNode }) => {
  const [stage, setStage] = useState<BootStage>('lines');
  const timeoutIds = useRef<number[]>([]);

  const skip = () => {
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];
    setStage('done');
  };

  useEffect(() => {
    let elapsed = 0;
    STAGE_ORDER.slice(1).forEach((nextStage) => {
      const previousStage = STAGE_ORDER[stageIndex(nextStage) - 1];
      elapsed += STAGE_DURATIONS[previousStage as Exclude<BootStage, 'done'>];
      const id = window.setTimeout(() => setStage(nextStage), elapsed);
      timeoutIds.current.push(id);
    });

    return () => {
      timeoutIds.current.forEach(clearTimeout);
      timeoutIds.current = [];
    };
  }, []);

  useEffect(() => {
    if (stage === 'done') return;

    const handleSkip = () => skip();
    window.addEventListener('click', handleSkip);
    window.addEventListener('keydown', handleSkip);

    return () => {
      window.removeEventListener('click', handleSkip);
      window.removeEventListener('keydown', handleSkip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage === 'done']);

  return (
    <BootSequenceContext.Provider value={{ stage, skip }}>
      {children}
    </BootSequenceContext.Provider>
  );
};

export const useBootSequence = () => {
  const context = useContext(BootSequenceContext);
  if (!context) {
    throw new Error('useBootSequence must be used within BootSequenceProvider');
  }
  return context;
};

/**
 * Tri-state view of a single stage's lifecycle, relative to the shared boot stage:
 * - active:    stage has reached (or passed) `trigger` — content should be visible
 * - animating: active, but boot isn't finished yet — apply the running CSS animation
 * - settled:   boot is fully done — render the final resting state, no animation
 *   (this also covers skip(), which jumps straight to 'done' from any earlier stage)
 */
export const useStageState = (trigger: BootStage) => {
  const { stage } = useBootSequence();
  const settled = stage === 'done';
  const active = settled || stageIndex(stage) >= stageIndex(trigger);
  return { active, animating: active && !settled, settled };
};
