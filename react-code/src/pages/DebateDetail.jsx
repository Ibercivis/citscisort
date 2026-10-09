import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  TextField,
  CssBaseline,
  alpha,
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

const DebateDetail = () => {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Share dialog state
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sharingDebate, setSharingDebate] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);

  // Follow debate state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followedId, setFollowedId] = useState(null);
  const [loadingFollow, setLoadingFollow] = useState(false);

  // Delete dialog state
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  useEffect(() => {
    loadDebate();
    checkIfFollowing();
  }, [debateId]);

  const loadDebate = async () => {
    try {
      setLoading(true);
      const data = await debateService.getDebateDetails(debateId);
      setDebate(data);
    } catch (err) {
      setError('Error loading debate. Please try again.');
      console.error('Error loading debate:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFollowing = async () => {
    try {
      const response = await followedDebatesService.checkFollowed(debateId);
      setIsFollowing(response.is_followed);
      setFollowedId(response.followed_id);
    } catch (err) {
      console.error('Error checking follow status:', err);
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

  const handleToggleCommentForm = () => {
    setShowCommentForm(!showCommentForm);
    setCommentError('');
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text) return;

    setSubmittingComment(true);
    setCommentError('');

    try {
      await debateService.addComment(debateId, text);
      
      // Reload debate to get updated comments with all fields
      await loadDebate();

      // Reset form
      setCommentText('');
      setShowCommentForm(false);
    } catch (err) {
      // Handle field-specific errors from backend
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.text && Array.isArray(errorData.text)) {
          setCommentError(errorData.text.join(', '));
        } else if (errorData.detail) {
          setCommentError(errorData.detail);
        } else {
          setCommentError('Error submitting comment. Please try again.');
        }
      } else {
        setCommentError('Error submitting comment. Please try again.');
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleOpenShareDialog = () => {
    setOpenShareDialog(true);
    setShareError('');
    setShareSuccess(false);
  };

  const handleCloseShareDialog = () => {
    setOpenShareDialog(false);
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
      await debateService.shareDebate(debateId, shareEmail.trim(), shareMessage.trim());
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

  const handleToggleFollow = async () => {
    setLoadingFollow(true);
    try {
      if (isFollowing) {
        // Unfollow
        await followedDebatesService.unfollowDebate(followedId);
        setIsFollowing(false);
        setFollowedId(null);
      } else {
        // Follow
        const response = await followedDebatesService.followDebate(debateId);
        setIsFollowing(true);
        setFollowedId(response.id);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      setError(isFollowing ? 'Error unfollowing debate' : 'Error following debate');
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await debateService.deleteDebate(debateId);
      navigate('/debates');
    } catch (err) {
      console.error('Error deleting debate:', err);
      setError('Error deleting debate. Please try again.');
      handleCloseDeleteDialog();
    }
  };

  const canDeleteDebate = () => {
    if (!debate || !user) {
      console.log('canDeleteDebate: missing debate or user', { debate: !!debate, user: !!user });
      return false;
    }
    
    const commentsCount = debate.comments?.length || debate.comments_count || 0;
    // Compare using email since username is no longer used
    const isInitiator = debate.initiator_email === user.email;
    
    console.log('canDeleteDebate check:', {
      initiatorEmail: debate.initiator_email,
      currentUserEmail: user.email,
      isInitiator,
      commentsCount,
      canDelete: isInitiator && commentsCount === 0
    });
    
    // User can delete if they are the initiator and there are no comments
    return isInitiator && commentsCount === 0;
  };

  if (loading) {
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
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          </Box>
        </Box>
      </>
    );
  }

  if (error || !debate) {
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
            <Container maxWidth="lg">
              <Alert severity="error">{error || 'Debate not found'}</Alert>
            </Container>
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
          <Container maxWidth="lg" sx={{ mb: 4 }}>
            <Card>
              <CardHeader
                sx={{
                  bgcolor: 'action.selected',
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
                      variant={isFollowing ? "contained" : "outlined"}
                      size="small"
                      startIcon={<BookmarkIcon />}
                      onClick={handleToggleFollow}
                      disabled={loadingFollow}
                    >
                      {loadingFollow ? '...' : (isFollowing ? 'Unfollow' : 'Follow')}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ShareIcon />}
                      onClick={handleOpenShareDialog}
                    >
                      Share
                    </Button>
                    {canDeleteDebate() && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleOpenDeleteDialog}
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

                <Divider sx={{ my: 2 }} />

                {/* Comments Section */}
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Comments
                </Typography>

                {debate.comments && debate.comments.length > 0 ? (
                  <List sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1, mb: 2 }}>
                    {debate.comments.map((comment) => (
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
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
                    No comments yet
                  </Typography>
                )}

                {/* Add Comment Section */}
                <Box>
                  {!showCommentForm ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Button 
                        variant="contained" 
                        color="primary"
                        onClick={handleToggleCommentForm}
                      >
                        Add Comment
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      {commentError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {commentError}
                        </Alert>
                      )}
                      
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Write your comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        sx={{ mb: 1 }}
                        disabled={submittingComment}
                      />
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button 
                          variant="outlined"
                          onClick={handleToggleCommentForm}
                          disabled={submittingComment}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="contained"
                          color="primary"
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim() || submittingComment}
                        >
                          {submittingComment ? 'Submitting...' : 'Submit'}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </Box>

      {/* Share Dialog */}
      <Dialog open={openShareDialog} onClose={handleCloseShareDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Share Debate</DialogTitle>
        <DialogContent>
          {shareSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Debate shared successfully!
            </Alert>
          )}
          {shareError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {shareError}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="Recipient Email"
            type="email"
            fullWidth
            variant="outlined"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            disabled={sharingDebate || shareSuccess}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Message (Optional)"
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={shareMessage}
            onChange={(e) => setShareMessage(e.target.value)}
            disabled={sharingDebate || shareSuccess}
            placeholder="Add a personal message..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareDialog} disabled={sharingDebate}>
            Cancel
          </Button>
          <Button 
            onClick={handleShareDebate} 
            variant="contained" 
            disabled={sharingDebate || shareSuccess || !shareEmail.trim()}
          >
            {sharingDebate ? 'Sharing...' : 'Share'}
          </Button>
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

export default DebateDetail;
