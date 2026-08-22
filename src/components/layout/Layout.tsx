import { Outlet, useLocation } from 'react-router';
import Navigation from './Navigation';
import NavigationMobile from './NavigationMobile';
import { useState, useEffect, useRef } from 'react';
import BackgroundAnimations from './BackgroundAnimations';
import CornerLines from './BootSequence/CornerLines';
import TriangleGrid from './BootSequence/TriangleGrid';
import BottomBar from './BootSequence/BottomBar';
import { BootSequenceProvider, useStageState } from '../../context/BootSequenceContext';
import { SearchModal } from '../search/SearchModal';
import { useMotionDevChords } from '../../hooks/useMotionDevChords';
import type { BreakpointType } from '../../types';

const Layout = () => {
  return (
    <BootSequenceProvider>
      <LayoutContent />
    </BootSequenceProvider>
  );
};

const getBreakpoint = (width: number): BreakpointType => {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Split out from Layout so it can read the boot stage — a component can't
// consume a context it renders the Provider for.
const LayoutContent = () => {
  // Read the width synchronously for the first render, not a 'desktop'
  // constant corrected by an effect afterwards. The boot timeline binds its
  // targets at build time, and GSAP resolves selectors then — so if the wrong
  // nav is mounted on the first frame, the real one is bound too late to ever
  // animate. This also removes the flash of desktop nav a phone used to paint
  // before the effect switched it. See docs/adr/0007-gsap-timelines-own-motion.
  const [breakpoint, setBreakpoint] = useState<BreakpointType>(() =>
    getBreakpoint(typeof window === 'undefined' ? 1024 : window.innerWidth),
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Page content (the actual games/reviews/etc. panel) waits for the same
  // stage the header decode waits for, so the body doesn't render ahead of
  // the background/nav construction finishing.
  const { active: contentReady } = useStageState('header');

  // The one scroll container (see index/custom.css #app-scroll). The document
  // no longer scrolls, so react-router's window-based ScrollRestoration has
  // nothing to act on — resetting this container to the top on navigation is
  // what "each page opens at its top" means now.
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    // Method guarded too, not just the ref: jsdom gives an element no
    // scrollTo, so the test shell would throw without it.
    scrollRef.current?.scrollTo?.({ top: 0 });
  }, [pathname]);

  // Mounted by the shell, like SearchModal, so the chords work on every page.
  useMotionDevChords();

  useEffect(() => {
    const handleResize = () => setBreakpoint(getBreakpoint(window.innerWidth));

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
      <div id="nier-grid">
        <TriangleGrid />
        <CornerLines />
        {breakpoint === 'desktop' &&
          <BackgroundAnimations />
          }
        <BottomBar />
          {/* dvh, not vh: on iOS Safari 100vh is the viewport with the
              toolbars retracted, so vh here left the document taller than
              what's actually visible even with nothing to scroll to. */}
          <div id="app-scroll" ref={scrollRef}>

            { breakpoint != 'desktop' ?
            <NavigationMobile
              isOpen={isSidebarOpen}
              onClose={toggleSidebar}
            />
            :
            <Navigation /> }

              {/* pt tightened on mobile: the fixed bar is already cleared by
                  the nav's own spacer, so the extra top padding only wanted to
                  be the small breath desktop needs, not a quarter of a phone
                  screen. */}
              <main className={`max-w-7xl mx-auto px-2 pt-2 md:pt-8 nier-page-bottom ${!contentReady ? 'invisible' : ''}`}>
                  <Outlet />
              </main>
          </div>
          {/* Reachable from every page, so it is mounted by the shell rather
              than by any one of them. It renders nothing until opened. */}
          <SearchModal />
      </div>
  );
};

export default Layout;