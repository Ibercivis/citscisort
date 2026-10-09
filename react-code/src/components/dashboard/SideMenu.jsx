import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ColorModeContext } from '../../context/ColorModeContext';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  IconButton,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Popover,
  Typography,
  Button,
  Collapse,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  BarChart as BarChartIcon,
  Feed as FeedIcon,
  Forum as ForumIcon,
  Info as InfoIcon,
  EmojiEvents as TrophyIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  BookmarkBorder as BookmarkIcon,
  Menu as MenuIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { getUserDisplayName, getUserInitials } from '../../utils/userDisplay';
import notificationService from '../../services/notificationService';

const DRAWER_WIDTH = 240;
const DRAWER_MOBILE_WIDTH = 200;
const DRAWER_COLLAPSED_WIDTH = 64;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Classify', icon: <AssignmentIcon />, path: '/classify' },
  { text: 'Debates', icon: <ForumIcon />, path: '/debates' },
  { text: 'Activity Feed', icon: <FeedIcon />, path: '/activity' },
  { text: 'Statistics', icon: <BarChartIcon />, path: '/stats' },
  { text: 'Hall of Fame', icon: <TrophyIcon />, path: '/hall-of-fame' },
  { text: 'About', icon: <InfoIcon />, path: '/about' },
];

const SideMenu = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { mode, toggleColorMode } = useContext(ColorModeContext);

  // User menu
  const [userAnchor, setUserAnchor] = useState(null);

  // Notifications
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll only the count every 30s
  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {}
  };

  // Load full list only when panel is opened
  const loadNotifications = async () => {
    setNotifLoading(true);
    try {
      const data = await notificationService.getNotifications();
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setNotifications(list);
    } catch {}
    finally { setNotifLoading(false); }
  };

  const handleOpenNotif = (e) => {
    setNotifAnchor(e.currentTarget);
    loadNotifications();
  };

  const handleMarkAsRead = async (notification) => {
    setNotifAnchor(null);
    if (notification.debate_id) navigate(`/debates/${notification.debate_id}`);
    if (!notification.is_read) {
      try { await notificationService.markAsRead(notification.id); await refreshUnreadCount(); } catch {}
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  const handleLogout = () => {
    setUserAnchor(null);
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const currentWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  const drawerContent = (isMobileVariant = false) => {
    const c = isMobileVariant ? true : collapsed; // always collapsed on mobile

    const navItems = (
      <List sx={{ p: 1, flex: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <Tooltip title={c ? item.text : ''} placement="right" arrow>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 1,
                  justifyContent: c ? 'center' : 'flex-start',
                  px: c ? 1 : 2,
                  minWidth: 0,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': { backgroundColor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'white' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: c ? 'unset' : 40, color: location.pathname === item.path ? 'white' : 'inherit', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                <Collapse in={!c} orientation="horizontal" unmountOnExit>
                  <ListItemText primary={item.text} sx={{ whiteSpace: 'nowrap' }} />
                </Collapse>
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
    );

    const bottomBar = (
      <Box sx={{ p: 1 }}>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ display: 'flex', flexDirection: c ? 'column' : 'row', alignItems: 'center', gap: 0.5, justifyContent: c ? 'center' : 'flex-start', px: c ? 0 : 1 }}>
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'} placement="right" arrow>
            <IconButton size="small" onClick={toggleColorMode}>
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Notifications" placement="right" arrow>
            <IconButton size="small" onClick={handleOpenNotif}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title={getUserDisplayName(user)} placement="right" arrow>
            <IconButton size="small" onClick={(e) => setUserAnchor(e.currentTarget)}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                {getUserInitials(user)}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Collapse in={!c} orientation="horizontal" unmountOnExit>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, whiteSpace: 'nowrap' }}>
              {getUserDisplayName(user)}
            </Typography>
          </Collapse>
        </Box>
      </Box>
    );

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: c ? 'center' : 'space-between', px: 1, py: 1.5, minHeight: 52 }}>
          <Collapse in={!c} orientation="horizontal" unmountOnExit>
            <Typography variant="h6" fontWeight="bold" color="primary" sx={{ pl: 1, whiteSpace: 'nowrap' }}>
              CitSci Sort
            </Typography>
          </Collapse>
          {!isMobileVariant && (
            <IconButton size="small" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          )}
        </Box>
        <Divider />
        {navItems}
        {bottomBar}
      </Box>
    );
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <Box sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed', top: 10, left: 10, zIndex: 1300,
      }}>
        <IconButton
          onClick={() => setMobileOpen(true)}
          sx={{ bgcolor: 'background.paper', boxShadow: 2, borderRadius: 1 }}
          size="small"
        >
          <MenuIcon />
        </IconButton>
      </Box>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_COLLAPSED_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent(true)}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: currentWidth,
          flexShrink: 0,
          transition: 'width 0.2s ease',
          '& .MuiDrawer-paper': {
            width: currentWidth,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: 'width 0.2s ease',
          },
        }}
      >
        {drawerContent(false)}
      </Drawer>

      {/* Notifications popover */}
      <Popover
        open={Boolean(notifAnchor)}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: { width: 340, maxHeight: 400 } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
          {unreadCount > 0 && <Button size="small" onClick={handleMarkAllAsRead}>Mark all read</Button>}
        </Box>
        <List sx={{ p: 0, maxHeight: 320, overflow: 'auto' }}>
          {notifLoading ? (
            <ListItem sx={{ justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </ListItem>
          ) : notifications.length === 0 ? (
            <ListItem><Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>You're all caught up!</Typography></ListItem>
          ) : notifications.map((n) => (
            <ListItemButton key={n.id} onClick={() => handleMarkAsRead(n)}
              sx={{ bgcolor: n.is_read ? 'transparent' : 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
              <ListItemText
                primary={n.message}
                secondary={new Date(n.created_at).toLocaleString()}
                primaryTypographyProps={{ fontWeight: n.is_read ? 'normal' : 'bold', variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>
          ))}
        </List>
      </Popover>

      {/* User menu */}
      <Menu
        anchorEl={userAnchor}
        open={Boolean(userAnchor)}
        onClose={() => setUserAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ elevation: 3, sx: { minWidth: 200 } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">{getUserDisplayName(user)}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setUserAnchor(null); navigate('/saved-abstracts'); }}>
          <ListItemIcon><BookmarkIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Saved Abstracts</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setUserAnchor(null); navigate('/followed-debates'); }}>
          <ListItemIcon><BookmarkIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Followed Debates</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default SideMenu;
