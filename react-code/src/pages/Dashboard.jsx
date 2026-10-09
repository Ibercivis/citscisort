import { CssBaseline, Box, alpha } from '@mui/material';
import SideMenu from '../components/dashboard/SideMenu';
import MainGrid from '../components/dashboard/MainGrid';

const Dashboard = () => {

  return (
    <>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        {/* Main content */}
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1, minWidth: 0,
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
              : alpha(theme.palette.background.default, 1),
            overflow: 'auto',
            minHeight: 'calc(100vh - 64px)',
            mt: 0,
          })}
        >
          <Box sx={{ p: 3, pt: { xs: 7, md: 3 } }}>
            <MainGrid />
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Dashboard;
