import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Pagination,
  Divider,
  CssBaseline,
  alpha,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import followedDebatesService from '../services/followedDebatesService';
import SideMenu from '../components/dashboard/SideMenu';
import { HtmlTitle } from '../utils/htmlTitle';

const MyFollowedDebates = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDebate, setSelectedDebate] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadFollowedDebates();
  }, [page]);

  const loadFollowedDebates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await followedDebatesService.getFollowedDebates(page);
      setData(response);
    } catch (err) {
      console.error('Error loading followed debates:', err);
      setError('Error loading followed debates');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleOpenDeleteDialog = (debate) => {
    setSelectedDebate(debate);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedDebate(null);
  };

  const handleDeleteDebate = async () => {
    if (!selectedDebate) return;

    setDeleting(true);
    try {
      await followedDebatesService.unfollowDebate(selectedDebate.id);
      handleCloseDeleteDialog();
      loadFollowedDebates();
    } catch (err) {
      setError('Error unfollowing debate');
    } finally {
      setDeleting(false);
    }
  };

  const handleViewDebate = (debateId) => {
    navigate(`/debates/${debateId}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
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
            p: 3,
          })}
        >
          <Box sx={{ maxWidth: 'lg', mx: 'auto', mb: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                My Followed Debates
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {data?.count === 1 ? '1 followed debate' : `${data?.count || 0} followed debates`}
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : !data?.results || data.results.length === 0 ? (
              <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  You haven't followed any debates yet.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Follow debates to keep track of interesting discussions.
                </Typography>
              </Paper>
            ) : (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {data.results.map((item) => (
                    <Paper
                      key={item.id}
                      sx={{
                        p: 3,
                        position: 'relative',
                        '&:hover': {
                          boxShadow: 3,
                        },
                      }}
                    >
                      {/* Actions */}
                      <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewDebate(item.debate_id)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleOpenDeleteDialog(item)}
                        >
                          Unfollow
                        </Button>
                      </Box>

                      {/* Debate Title */}
                      <Typography variant="h6" sx={{ mb: 1, pr: 12 }}>
                        <HtmlTitle html={item.debate_abstract_title} />
                      </Typography>

                      {/* Debate Info */}
                      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" color="text.secondary">
                          by <strong>{item.debate_initiator?.username || 'Unknown'}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • Followed on {formatDate(item.followed_at)}
                        </Typography>
                        {item.debate_is_closed && (
                          <Chip label="Closed" size="small" color="error" />
                        )}
                      </Box>

                      {/* Debate Text Preview */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {item.debate_text}
                      </Typography>

                      {/* Debate Stats */}
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {item.debate_comments_count} comment{item.debate_comments_count !== 1 ? 's' : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          • Created {formatDate(item.debate_created_at)}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>

                {/* Pagination */}
                {data.total_pages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination
                      count={data.total_pages}
                      page={page}
                      onChange={handlePageChange}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Unfollow Debate</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to unfollow this debate?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteDebate} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Unfollowing...' : 'Unfollow'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MyFollowedDebates;
