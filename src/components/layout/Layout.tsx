import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

const Layout = () => {
  return (
    <div id="nier-grid">
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