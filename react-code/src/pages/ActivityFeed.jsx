import { useState, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Collapse,
  CssBaseline,
  Link,
} from '@mui/material';
import {
  Person as PersonIcon,
  EmojiEvents as TrophyIcon,
  Group as GroupIcon,
  AccessTime as TimeIcon,
  Forum as ForumIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { TransitionGroup } from 'react-transition-group';
import activityService from '../services/activityService';
import SideMenu from '../components/dashboard/SideMenu';
import { stripHtml } from '../utils/htmlTitle';

const ActivityFeed = () => {
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    loadActivityData();
    
    // Refresh feed every 30 seconds
    const feedInterval = setInterval(() => {
      loadActivityData();
    }, 30000);

    return () => {
      clearInterval(feedInterval);
    };
  }, []);

  const loadActivityData = async () => {
    try {
      const data = await activityService.getActivityFeed(50, 1440);
      setActivityData(data);
      setLastUpdate(new Date());
      
      // Scroll to top when new data arrives
      if (listRef.current && !loading) {
        listRef.current.scrollTop = 0;
      }
    } catch (err) {
      console.error('Error loading activity feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderActivityItem = (item, index) => {
    if (item.type === 'classification') {
      return (
        <ListItem key={index} sx={{ py: 2 }}>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <PersonIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box>
                <Typography variant="body2" component="span" fontWeight="bold">
                  {item.user_display_name}
                </Typography>
                <Typography variant="body2" component="span" color="text.secondary">
                  {' '}
                </Typography>
                <Link
                  component={RouterLink}
                  to={`/abstracts/${item.abstract_id}`}
                  underline="hover"
                  sx={{ fontWeight: 500 }}
                >
                  classified
                </Link>
                <Typography variant="body2" component="span" color="text.secondary">
                  {' '}
                </Typography>
                <Typography 
                  variant="body2" 
                  component="span"
                  sx={{ 
                    display: 'inline',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}
                >
                  "{stripHtml(item.abstract_title)}"
                </Typography>
              </Box>
            }
            secondary={
              <>
                <Chip label={item.category.replace(/_/g, ' ')} size="small" sx={{ mr: 1 }} />
                {item.time_ago}
              </>
            }
            secondaryTypographyProps={{ component: 'div' }}
          />
        </ListItem>
      );
    }

    if (item.type === 'debate') {
      return (
        <ListItem key={index} sx={{ py: 2 }}>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'info.main' }}>
              <ForumIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box>
                <Typography variant="body2" component="span" fontWeight="bold">
                  {item.user_display_name}
                </Typography>
                <Typography variant="body2" component="span" color="text.secondary">
                  {' '}started{' '}
                </Typography>
                <Link
                  component={RouterLink}
                  to={`/debates/${item.debate_id}`}
                  underline="hover"
                  sx={{ fontWeight: 500 }}
                >
                  a debate
                </Link>
                <Typography variant="body2" component="span" color="text.secondary">
                  {' '}on{' '}
                </Typography>
                <Typography 
                  variant="body2" 
                  component="span"
                  sx={{ 
                    display: 'inline',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}
                >
                  "{stripHtml(item.abstract_title)}"
                </Typography>
              </Box>
            }
            secondary={
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  {item.debate_text}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <CommentIcon fontSize="small" color="action" />
                  {item.comments_count} comment{item.comments_count !== 1 ? 's' : ''} • {item.time_ago}
                </Box>
              </>
            }
            secondaryTypographyProps={{ component: 'div' }}
          />
        </ListItem>
      );
    }

    if (item.type === 'milestone') {
      return (
        <ListItem key={index} sx={{ py: 2, bgcolor: 'warning.light', borderRadius: 1, mb: 1 }}>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'warning.main' }}>
              <TrophyIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box>
                <Typography variant="body2" component="span" fontWeight="bold">
                  {item.user_display_name}
                </Typography>
                <Typography variant="body2" component="span">
                  {' '}{item.message}
                </Typography>
              </Box>
            }
            secondary={
              <Typography variant="caption" color="text.secondary">
                {item.time_ago}
              </Typography>
            }
          />
        </ListItem>
      );
    }

    if (item.type === 'global_milestone') {
      return (
        <ListItem key={index} sx={{ py: 2, bgcolor: 'success.light', borderRadius: 1, mb: 1 }}>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'success.main' }}>
              <GroupIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography variant="body2" fontWeight="bold">
                🎉 {item.message}
              </Typography>
            }
            secondary={
              <Typography variant="caption" color="text.secondary">
                {item.time_ago}
              </Typography>
            }
          />
        </ListItem>
      );
    }

    return null;
  };

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            height: { xs: 'auto', md: '100vh' },
            minHeight: { xs: '100vh', md: 'unset' },
            overflow: 'hidden',
            p: 3,
            pt: { xs: 7, md: 3 },
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
            <Box>
              <Typography variant="h5" fontWeight="bold">Activity Feed</Typography>
              <Typography variant="body2" color="text.secondary">Live updates from the community</Typography>
            </Box>
            {lastUpdate && (
              <Chip
                label={`Updated ${lastUpdate.toLocaleTimeString()}`}
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>

          <Paper elevation={0} sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <TimeIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight="bold">Recent Activity</Typography>
            </Box>

            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
                <CircularProgress />
              </Box>
            ) : activityData && activityData.feed.length > 0 ? (
              <List ref={listRef} sx={{ flex: 1, overflow: 'auto' }}>
                <TransitionGroup>
                  {activityData.feed.map((item, index) => (
                    <Collapse key={`${item.type}-${index}-${item.time_ago}`}>
                      {renderActivityItem(item, index)}
                    </Collapse>
                  ))}
                </TransitionGroup>
              </List>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
                <Typography variant="body2" color="text.secondary">No recent activity</Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </>
  );
};

export default ActivityFeed;
