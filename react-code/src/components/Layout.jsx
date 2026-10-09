import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import Navbar from './Navbar';

const Layout = () => {
  const location = useLocation();
  
  const pagesWithNavbar = ['/email-confirmation'];
  const showNavbar = pagesWithNavbar.some(page => location.pathname.startsWith(page));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', m: 0, p: 0 }}>
      {showNavbar && <Navbar />}
      <Box component="main" sx={{ flexGrow: 1, m: 0, p: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
