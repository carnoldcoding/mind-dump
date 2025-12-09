import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import NavigationMobile from './NavigationMobile';
import { useState, useEffect } from 'react';
import BackgroundAnimations from './BackgroundAnimations';
import type { BreakpointType } from '../../types';


const Layout = () => {
  const [breakpoint, setBreakpoint] = useState<BreakpointType>('desktop');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      {breakpoint === 'desktop' && 
        <BackgroundAnimations />
        }
        <div className="min-h-screen">
        {breakpoint !== 'desktop' && (
          <button
            onClick={toggleSidebar}
            className="fixed top-4 right-4 z-50 text-nier-text-dark p-1 h-8 w-8 text-4xl flex items-center justify-center"
          >
            {isSidebarOpen ? '×' : '☰'}
          </button>
        )}

          { breakpoint != 'desktop' ? 
          <NavigationMobile 
            isOpen={isSidebarOpen}
            onClose={toggleSidebar}
          /> 
          : 
          <Navigation /> }
            <main className="max-w-7xl mx-auto px-4 py-8 ">
                <Outlet />
            </main>
        </div>
    </div>
  );
};

export default Layout;