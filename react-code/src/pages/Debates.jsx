import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Collapse,
  Button,
  List,
  ListItem,
  ListItemText,
  TextField,
  CssBaseline,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Comment as CommentIcon,
  PushPin as PushPinIcon,
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import SideMenu from '../components/dashboard/SideMenu';
import { HtmlTitle } from '../utils/htmlTitle';
import debateService from '../services/debateService';
import followedDebatesService from '../services/followedDebatesService';
import { useAuth } from '../context/AuthContext';

const Debates = () => {
  const { user } = useAuth();
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [expandedDebates, setExpandedDebates] = useState({});
  const [debateDetails, setDebateDetails] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [showCommentForm, setShowCommentForm] = useState({});
  const [commentText, setCommentText] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  const [commentError, setCommentError] = useState({});

  // Share dialog state
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [shareDebateId, setShareDebateId] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sharingDebate, setSharingDebate] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);

  // Follow state for each debate
  const [followedDebates, setFollowedDebates] = useState({});
  const [loadingFollow, setLoadingFollow] = useState({});

  // Delete dialog state
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [debateToDelete, setDebateToDelete] = useState(null);

  const observer = useRef();
  const lastDebateRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadingMore, hasMore]
  );

  useEffect(() => {
    loadDebates();
  }, [page]);

  // Check follow status for debates
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (debates.length === 0) return;
      
      const followStatus = {};
      const loadingStatus = {};
      
      for (const debate of debates) {
        try {
          loadingStatus[debate.id] = true;
          const response = await followedDebatesService.checkFollowed(debate.id);
          followStatus[debate.id] = {
            isFollowing: response.is_followed,
            followedId: response.followed_id
          };
        } catch (error) {
          console.error(`Error checking follow status for debate ${debate.id}:`, error);
          followStatus[debate.id] = { isFollowing: false, followedId: null };
        } finally {
          loadingStatus[debate.id] = false;
        }
      }
      
      setFollowedDebates(followStatus);
      setLoadingFollow(loadingStatus);
    };

    if (debates.length > 0) {
      checkFollowStatus();
    }
  }, [debates]);

  const loadDebates = async () => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const data = await debateService.getDebates(page);
      
      if (page === 1) {
        setDebates(data.results);
      } else {
        setDebates((prev) => [...prev, ...data.results]);
      }

      setHasMore(data.next !== null);
    } catch (err) {
      setError('Error loading debates. Please try again.');
      console.error('Error loading debates:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExpandComments = async (debateId) => {
    const isExpanded = expandedDebates[debateId];
    
    if (!isExpanded && !debateDetails[debateId]) {
      // Load comments if not already loaded
      setLoadingComments({ ...loadingComments, [debateId]: true });
      try {
        const data = await debateService.getDebateDetails(debateId);
        setDebateDetails({ ...debateDetails, [debateId]: data });
      } catch (err) {
        console.error('Error loading debate details:', err);
      } finally {
        setLoadingComments({ ...loadingComments, [debateId]: false });
      }
    }

    setExpandedDebates({ ...expandedDebates, [debateId]: !isExpanded });
  };

  const handleToggleCommentForm = (debateId) => {
    setShowCommentForm({ ...showCommentForm, [debateId]: !showCommentForm[debateId] });
    setCommentError({ ...commentError, [debateId]: '' });
  };

  const handleCommentChange = (debateId, value) => {
    setCommentText({ ...commentText, [debateId]: value });
  };

  const handleSubmitComment = async (debateId) => {
    const text = commentText[debateId]?.trim();
    if (!text) return;

    setSubmittingComment({ ...submittingComment, [debateId]: true });
    setCommentError({ ...commentError, [debateId]: '' });

    try {
      const newComment = await debateService.addComment(debateId, text);
      
      // Update debate details with new comment
      const currentDetails = debateDetails[debateId];
      if (currentDetails) {
        setDebateDetails({
          ...debateDetails,
          [debateId]: {
            ...currentDetails,
            comments: [...(currentDetails.comments || []), newComment],
          },
        });
      }

      // Update comment count in debates list
      setDebates(debates.map(debate => 
        debate.id === debateId 
          ? { ...debate, comments_count: debate.comments_count + 1 }
          : debate
      ));

      // Reset form
      setCommentText({ ...commentText, [debateId]: '' });
      setShowCommentForm({ ...showCommentForm, [debateId]: false });
    } catch (err) {
      // Handle field-specific errors from backend
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.text && Array.isArray(errorData.text)) {
          setCommentError({ ...commentError, [debateId]: errorData.text.join(', ') });
        } else if (errorData.detail) {
          setCommentError({ ...commentError, [debateId]: errorData.detail });
        } else {
          setCommentError({ ...commentError, [debateId]: 'Error submitting comment. Please try again.' });
        }
      } else {
        setCommentError({ ...commentError, [debateId]: 'Error submitting comment. Please try again.' });
      }
    } finally {
      setSubmittingComment({ ...submittingComment, [debateId]: false });
    }
  };

  const handleOpenShareDialog = (debateId) => {
    setShareDebateId(debateId);
    setOpenShareDialog(true);
    setShareError('');
    setShareSuccess(false);
  };

  const handleCloseShareDialog = () => {
    setOpenShareDialog(false);
    setShareDebateId(null);
    setShareEmail('');
    setShareMessage('');
    setShareError('');
    setShareSuccess(false);
  };

  const handleShareDebate = async () => {
    if (!shareEmail.trim()) {
      setShareError('Please enter an email address');
      return;
    }

    setSharingDebate(true);
    setShareError('');

    try {
      await debateService.shareDebate(shareDebateId, shareEmail.trim(), shareMessage.trim());
      setShareSuccess(true);
      setTimeout(() => {
        handleCloseShareDialog();
      }, 2000);
    } catch (err) {
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.recipient_email && Array.isArray(errorData.recipient_email)) {
          setShareError(errorData.recipient_email.join(', '));
        } else if (errorData.detail) {
          setShareError(errorData.detail);
        } else {
          setShareError('Error sharing debate. Please try again.');
        }
      } else {
        setShareError('Error sharing debate. Please try again.');
      }
    } finally {
      setSharingDebate(false);
    }
  };

  const handleToggleFollow = async (debateId) => {
    const currentStatus = followedDebates[debateId] || { isFollowing: false, followedId: null };
    
    setLoadingFollow(prev => ({ ...prev, [debateId]: true }));

    try {
      if (currentStatus.isFollowing) {
        // Unfollow
        await followedDebatesService.unfollowDebate(currentStatus.followedId);
        setFollowedDebates(prev => ({
          ...prev,
          [debateId]: { isFollowing: false, followedId: null }
        }));
      } else {
        // Follow
        const response = await followedDebatesService.followDebate(debateId);
        setFollowedDebates(prev => ({
          ...prev,
          [debateId]: { isFollowing: true, followedId: response.id }
        }));
      }
    } catch (err) {
      console.error('Error toggling follow status:', err);
    } finally {
      setLoadingFollow(prev => ({ ...prev, [debateId]: false }));
    }
  };

  const handleOpenDeleteDialog = (debateId) => {
    setDebateToDelete(debateId);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDebateToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!debateToDelete) return;
    
    try {
      await debateService.deleteDebate(debateToDelete);
      // Remove debate from list
      setDebates(prev => prev.filter(debate => debate.id !== debateToDelete));
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Error deleting debate:', err);
      setError('Error deleting debate. Please try again.');
    }
  };

  const canDeleteDebate = (debate) => {
    if (!debate || !user) return false;
    const commentsCount = debate.comments_count || 0;
    // Compare using email since username is no longer used
    return debate.initiator_email === user.email && commentsCount === 0;
  };

  if (loading && page === 1) {
    return (
      <>
        <CssBaseline enableColorScheme />
        <Box sx={{ display: 'flex' }}>
          <SideMenu />
          <Box
            component="main"
            sx={{
              flexGrow: 1, minWidth: 0,
              overflow: 'auto',
              minHeight: 'calc(100vh - 64px)',
              p: 3,
            }}
          >
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          </Box>
        </Box>
      </>
    );
  }

  return (
    <>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <Box
          component="main"
          sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}
        >
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold">Debates</Typography>
                <Typography variant="body2" color="text.secondary">Classify an abstract to start a debate</Typography>
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {debates.length === 0 && !loading ? (
              <Alert severity="info">No debates found.</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {debates.map((debate, index) => (
              <Card
                key={debate.id}
                ref={index === debates.length - 1 ? lastDebateRef : null}
                sx={{
                  '&:hover': {
                    boxShadow: 3,
                  },
                }}
              >
                <CardHeader
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" component="div">
                        <HtmlTitle html={debate.abstract_title} />
                      </Typography>
                      {debate.is_pinned && (
                        <PushPinIcon color="primary" fontSize="small" />
                      )}
                      {debate.is_closed && (
                        <Chip label="Closed" size="small" color="error" />
                      )}
                    </Box>
                  }
                  subheader={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        by <strong>{debate.initiator_display_name}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(debate.created_at)}
                      </Typography>
                    </Box>
                  }
                  action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant={followedDebates[debate.id]?.isFollowing ? "contained" : "outlined"}
                        size="small"
                        startIcon={<BookmarkIcon />}
                        onClick={() => handleToggleFollow(debate.id)}
                        disabled={loadingFollow[debate.id]}
                      >
                        {followedDebates[debate.id]?.isFollowing ? 'Unfollow' : 'Follow'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ShareIcon />}
                        onClick={() => handleOpenShareDialog(debate.id)}
                      >
                        Share
                      </Button>
                      {canDeleteDebate(debate) && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleOpenDeleteDialog(debate.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </Box>
                  }
                />
                <CardContent>
                  {/* Abstract */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Abstract:</strong>
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {debate.abstract_text}
                  </Typography>

                  {/* DOI */}
                  {debate.abstract_doi && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        DOI
                      </Typography>
                      <Link
                        href={`https://doi.org/${debate.abstract_doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}
                      >
                        {debate.abstract_doi}
                        <OpenIcon fontSize="small" />
                      </Link>
                    </Box>
                  )}

                  {/* Abstract Classifications */}
                  {debate.abstract_classifications && debate.abstract_classifications.total > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Classifications ({debate.abstract_classifications.total}):</strong>
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {/* Main Categories */}
                        {debate.abstract_classifications.by_category && 
                          Object.entries(debate.abstract_classifications.by_category).map(([key, value]) => (
                            <Chip
                              key={key}
                              label={`${value.display_name} (${value.percentage.toFixed(0)}%)`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))
                        }
                        {/* Meta Aspects */}
                        {debate.abstract_classifications.meta_aspects && 
                          Object.entries(debate.abstract_classifications.meta_aspects).map(([key, value]) => (
                            <Chip
                              key={key}
                              label={`${value.display_name} (${value.percentage.toFixed(0)}%)`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          ))
                        }
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Debate Text */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Debate:</strong>
                  </Typography>
                  <Typography variant="body1">
                    {debate.text}
                  </Typography>

                  {/* Stats */}
                  <Box sx={{ display: 'flex', gap: 3, mt: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <VisibilityIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {debate.views_count} views
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CommentIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {debate.comments_count} comments
                      </Typography>
                    </Box>
                  </Box>

                  {/* Comments Section */}
                  <Button
                    onClick={() => handleExpandComments(debate.id)}
                    endIcon={
                      <ExpandMoreIcon
                        sx={{
                          transform: expandedDebates[debate.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s',
                        }}
                      />
                    }
                    sx={{ mb: 1 }}
                  >
                    {expandedDebates[debate.id] ? 'Hide Comments' : 'Show Comments'}
                  </Button>

                  <Collapse in={expandedDebates[debate.id]} timeout="auto" unmountOnExit>
                    {loadingComments[debate.id] ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : debateDetails[debate.id]?.comments?.length > 0 ? (
                      <List sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
                        {debateDetails[debate.id].comments.map((comment) => (
                          <ListItem key={comment.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {comment.user_display_name || comment.author_display_name || comment.author_email || 'Anonymous'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(comment.created_at)}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Typography variant="body2" color="text.primary">
                                  {comment.text}
                                </Typography>
                              }
                            />
                            <Divider sx={{ width: '100%', mt: 1 }} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No comments yet
                      </Typography>
                    )}

                    {/* Add Comment Section */}
                    <Box sx={{ mt: 2 }}>
                      {!showCommentForm[debate.id] ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => handleToggleCommentForm(debate.id)}
                          >
                            Add Comment
                          </Button>
                        </Box>
                      ) : (
                        <Box>
                          {commentError[debate.id] && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                              {commentError[debate.id]}
                            </Alert>
                          )}
                          
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Write your comment..."
                            value={commentText[debate.id] || ''}
                            onChange={(e) => handleCommentChange(debate.id, e.target.value)}
                            sx={{ mb: 1 }}
                            disabled={submittingComment[debate.id]}
                          />
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button 
                              variant="outlined"
                              onClick={() => handleToggleCommentForm(debate.id)}
                              disabled={submittingComment[debate.id]}
                            >
                              Cancel
                            </Button>
                            <Button 
                              variant="contained"
                              color="primary"
                              onClick={() => handleSubmitComment(debate.id)}
                              disabled={!commentText[debate.id]?.trim() || submittingComment[debate.id]}
                            >
                              {submittingComment[debate.id] ? 'Submitting...' : 'Submit'}
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            ))}

            {loadingMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress />
              </Box>
            )}

            {!hasMore && debates.length > 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                No more debates to load
              </Typography>
            )}
          </Box>
        )}
          </Box>
        </Box>
      </Box>

      {/* Share Dialog */}
      <Dialog open={openShareDialog} onClose={handleCloseShareDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Share Debate</DialogTitle>
        <DialogContent>
          {shareSuccess ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              Debate shared successfully!
            </Alert>
          ) : (
            <>
              {shareError && (
                <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                  {shareError}
                </Alert>
              )}
              <TextField
                autoFocus
                margin="dense"
                label="Recipient Email"
                type="email"
                fullWidth
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                required
                disabled={sharingDebate}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Message (Optional)"
                multiline
                rows={3}
                fullWidth
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                disabled={sharingDebate}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareDialog} disabled={sharingDebate}>
            {shareSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!shareSuccess && (
            <Button onClick={handleShareDebate} variant="contained" disabled={sharingDebate}>
              {sharingDebate ? 'Sharing...' : 'Share'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Debate</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this debate? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Debates;
