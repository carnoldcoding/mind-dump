import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { useState, useEffect } from 'react';
import BackgroundAnimations from './BackgroundAnimations';
import type { BreakpointType } from '../../types';


const Layout = () => {
  const [breakpoint, setBreakpoint] = useState<BreakpointType>('desktop');

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

  return (
    <div id="nier-grid">
      {breakpoint === 'desktop' && 
        <BackgroundAnimations />
        }
        <div className="min-h-screen">
            <Navigation />
            <main className="max-w-6xl mx-auto px-4 py-8">
                <Outlet />
            </main>
        </div>
    </div>
  );
};

export default Layout;