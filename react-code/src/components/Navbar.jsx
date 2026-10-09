import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  AccountCircle,
  BarChart,
  Settings,
  Logout,
  ArrowDropDown,
  Bookmark,
  Timeline,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getUserDisplayName } from '../utils/userDisplay';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    handleClose();
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
          >
            CitSci Sort
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isAuthenticated ? (
              <>
                <Button 
                  color="inherit" 
                  onClick={() => navigate('/classify')}
                  sx={{ mr: 1 }}
                >
                  Classify
                </Button>
                <Button 
                  color="inherit" 
                  onClick={() => navigate('/stats')}
                  sx={{ mr: 1 }}
                >
                  Stats
                </Button>
                <Button 
                  color="inherit" 
                  onClick={() => navigate('/activity')}
                  sx={{ mr: 1 }}
                >
                  Activity
                </Button>
                <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <IconButton
                    size="large"
                    onClick={handleMenu}
                    color="inherit"
                    sx={{ ml: 1 }}
                  >
                    <AccountCircle />
                  </IconButton>
                  <Box 
                    sx={{ 
                      display: { xs: 'none', sm: 'flex' },
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={handleMenu}
                  >
                    <Typography variant="body1" sx={{ ml: 1 }}>
                      {getUserDisplayName(user)}
                    </Typography>
                    <ArrowDropDown />
                  </Box>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    <MenuItem onClick={() => handleMenuClick('/my-stats')}>
                      <BarChart sx={{ mr: 1 }} fontSize="small" />
                      My Stats
                    </MenuItem>
                    <MenuItem onClick={() => handleMenuClick('/saved-abstracts')}>
                      <Bookmark sx={{ mr: 1 }} fontSize="small" />
                      Saved Abstracts
                    </MenuItem>
                    <MenuItem onClick={() => handleMenuClick('/account')}>
                      <Settings sx={{ mr: 1 }} fontSize="small" />
                      Account
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout}>
                      <Logout sx={{ mr: 1 }} fontSize="small" />
                      Logout
                    </MenuItem>
                  </Menu>
                </Box>
              </>
            ) : (
              // Only show Login button if not on login, register, password reset, email-confirmation or verify-email pages
              location.pathname !== '/login' && 
              location.pathname !== '/register' && 
              !location.pathname.startsWith('/reset-password') &&
              location.pathname !== '/email-confirmation' &&
              !location.pathname.startsWith('/verify-email') && (
                <Button color="inherit" onClick={handleLogin}>
                  Login
                </Button>
              )
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
