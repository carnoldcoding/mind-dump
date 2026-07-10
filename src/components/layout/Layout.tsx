import { Outlet, ScrollRestoration } from 'react-router-dom';
import Navigation from './Navigation';
import NavigationMobile from './NavigationMobile';
import { useState, useEffect } from 'react';
import BackgroundAnimations from './BackgroundAnimations';
import CornerLines from './BootSequence/CornerLines';
import TriangleGrid from './BootSequence/TriangleGrid';
import BottomBar from './BootSequence/BottomBar';
import { BootSequenceProvider, useStageState } from '../../context/BootSequenceContext';
import type { BreakpointType } from '../../types';

const Layout = () => {
  return (
    <BootSequenceProvider>
      <LayoutContent />
    </BootSequenceProvider>
  );
};

// Split out from Layout so it can read the boot stage — a component can't
// consume a context it renders the Provider for.
const LayoutContent = () => {
  const [breakpoint, setBreakpoint] = useState<BreakpointType>('desktop');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Page content (the actual games/reviews/etc. panel) waits for the same
  // stage the header decode waits for, so the body doesn't render ahead of
  // the background/nav construction finishing.
  const { active: contentReady } = useStageState('header');

  const getBreakpoint = (width: number) : BreakpointType => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  useEffect(()=>{
    const handleResize = () => {
      const width = window.innerWidth;
      const newBreakpoint = getBreakpoint(width);
      setBreakpoint(newBreakpoint);
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  })

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
      <div id="nier-grid">
        <TriangleGrid />
        <CornerLines />
        {breakpoint === 'desktop' &&
          <BackgroundAnimations />
          }
        <BottomBar />
          <div className="min-h-screen">

            { breakpoint != 'desktop' ?
            <NavigationMobile
              isOpen={isSidebarOpen}
              onClose={toggleSidebar}
            />
            :
            <Navigation /> }

              <main className={`max-w-7xl mx-auto px-2 py-8 ${!contentReady ? 'invisible' : ''}`}>
                  <ScrollRestoration />
                  <Outlet />
              </main>
          </div>
      </div>
  );
};

export default Layout;