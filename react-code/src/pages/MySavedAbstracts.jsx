import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Pagination,
  Divider,
  Collapse,
  Link,
  CssBaseline,
  alpha,
  Grid,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  OpenInNew as OpenIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import savedAbstractsService from '../services/savedAbstractsService';
import abstractService from '../services/abstractService';
import SideMenu from '../components/dashboard/SideMenu';
import { HtmlTitle } from '../utils/htmlTitle';

const MySavedAbstracts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedAbstract, setSelectedAbstract] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editFormData, setEditFormData] = useState({ notes: '', tags: '' });
  const [shareFormData, setShareFormData] = useState({ email: '', message: '' });
  const [updating, setUpdating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    loadSavedAbstracts();
  }, [page]);

  const loadSavedAbstracts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await savedAbstractsService.getSavedAbstracts(page);
      setData(response);
    } catch (err) {
      setError('Error loading saved abstracts');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleOpenDeleteDialog = (abstract) => {
    setSelectedAbstract(abstract);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedAbstract(null);
  };

  const handleOpenEditDialog = (abstract) => {
    setSelectedAbstract(abstract);
    setEditFormData({
      notes: abstract.notes || '',
      tags: abstract.tags || '',
    });
    setEditDialogOpen(true);
    setUpdateError('');
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedAbstract(null);
    setEditFormData({ notes: '', tags: '' });
    setUpdateError('');
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateError('');
    
    try {
      await savedAbstractsService.updateSavedAbstract(
        selectedAbstract.id,
        editFormData.notes,
        editFormData.tags
      );
      handleCloseEditDialog();
      loadSavedAbstracts();
    } catch (err) {
      setUpdateError('Error updating saved abstract');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await savedAbstractsService.deleteSavedAbstract(selectedAbstract.id);
      handleCloseDeleteDialog();
      loadSavedAbstracts();
    } catch (err) {
      setError('Error deleting saved abstract');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenShareDialog = (abstract) => {
    setSelectedAbstract(abstract);
    setShareDialogOpen(true);
    setShareError('');
    setShareSuccess(false);
    setShareFormData({ email: '', message: '' });
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setSelectedAbstract(null);
    setShareFormData({ email: '', message: '' });
    setShareError('');
    setShareSuccess(false);
  };

  const handleShare = async () => {
    if (!shareFormData.email) {
      setShareError('Please enter a recipient email address');
      return;
    }

    setSharing(true);
    setShareError('');
    
    try {
      // The abstract ID might be in different fields depending on API response
      const abstractId = selectedAbstract.abstract?.id || selectedAbstract.abstract_id || selectedAbstract.abstract;
      
      if (!abstractId) {
        setShareError('Abstract ID not found');
        setSharing(false);
        return;
      }
      
      await abstractService.shareAbstract(
        abstractId,
        shareFormData.email,
        shareFormData.message
      );
      setShareSuccess(true);
      setTimeout(() => {
        handleCloseShareDialog();
      }, 1500);
    } catch (err) {
      console.error('Error sharing abstract:', err);
      setShareError(
        err.response?.data?.detail ||
        'Error sharing abstract. Please try again.'
      );
    } finally {
      setSharing(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  if (error) {
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
              <Alert severity="error">{error}</Alert>
            </Container>
          </Box>
        </Box>
      </>
    );
  }

  const totalPages = data ? Math.ceil(data.count / 10) : 0;

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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              My Saved Abstracts
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {data?.count || 0} saved abstract{data?.count !== 1 ? 's' : ''}
            </Typography>
          </Box>

      {!data || data.results.length === 0 ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            You haven't saved any abstracts yet.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Save abstracts while classifying to keep track of interesting papers.
          </Typography>
        </Paper>
      ) : (
        <>
          {data.results.map((item) => (
            <Paper 
              key={item.id} 
              elevation={2} 
              sx={{ 
                mb: 3,
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {/* Header with actions */}
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: 'action.selected', 
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <Box flex={1}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5, color: 'text.primary' }}>
                    <HtmlTitle html={item.abstract_title} />
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                    {item.abstract_year && (
                      <Chip 
                        label={item.abstract_year} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Saved {formatDate(item.saved_at)}
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ShareIcon />}
                    onClick={() => handleOpenShareDialog(item)}
                  >
                    Share
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenEditDialog(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleOpenDeleteDialog(item)}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>

              {/* Content */}
              <Box sx={{ p: 3 }}>
                {/* Journal and DOI */}
                {(item.abstract_journal || item.abstract_doi) && (
                  <Box sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Grid container spacing={2}>
                      {item.abstract_journal && (
                        <Grid size={{ xs: 12, md: item.abstract_doi ? 6 : 12 }}>
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            JOURNAL
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {item.abstract_journal}
                          </Typography>
                        </Grid>
                      )}
                      {item.abstract_doi && (
                        <Grid size={{ xs: 12, md: item.abstract_journal ? 6 : 12 }}>
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            DOI
                          </Typography>
                          <Link
                            href={`https://doi.org/${item.abstract_doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="body2"
                            sx={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 0.5,
                              fontWeight: 'medium',
                            }}
                          >
                            {item.abstract_doi}
                            <OpenIcon fontSize="small" />
                          </Link>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {/* Notes */}
                {item.notes && (
                  <Box 
                    sx={{ 
                      mb: 2, 
                      p: 2, 
                      bgcolor: 'info.lighter',
                      borderRadius: 1,
                      borderLeft: 3,
                      borderColor: 'info.main',
                    }}
                  >
                    <Typography variant="caption" color="info.dark" display="block" gutterBottom fontWeight="bold">
                      MY NOTES
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {item.notes}
                    </Typography>
                  </Box>
                )}

                {/* Tags */}
                {item.tags && typeof item.tags === 'string' && item.tags.trim() && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      TAGS
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {item.tags.split(/[,;]/).map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag.trim()}
                          size="small"
                          color="primary"
                          variant="filled"
                          sx={{ borderRadius: 1, fontWeight: 'medium' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* View Abstract Button */}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => handleToggleExpand(item.id)}
                    endIcon={expandedId === item.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  >
                    {expandedId === item.id ? 'Hide Abstract' : 'View Abstract'}
                  </Button>
                </Box>

                {/* Abstract Text (Collapsible) */}
                <Collapse in={expandedId === item.id} timeout="auto">
                  <Box 
                    sx={{ 
                      mt: 2, 
                      pt: 2, 
                      borderTop: 1, 
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      p: 2,
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom fontWeight="bold">
                      ABSTRACT
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        textAlign: 'justify', 
                        lineHeight: 1.8,
                        color: 'text.primary',
                        mb: 3,
                      }}
                    >
                      {item.abstract_text || 'Abstract text not available.'}
                    </Typography>

                    {/* DOI */}
                    {item.abstract_doi && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          DOI
                        </Typography>
                        <Link
                          href={`https://doi.org/${item.abstract_doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="body2"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}
                        >
                          {item.abstract_doi}
                          <OpenIcon fontSize="small" />
                        </Link>
                      </Box>
                    )}

                    {/* Keywords */}
                    {item.abstract_keywords && typeof item.abstract_keywords === 'string' && item.abstract_keywords.trim() && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom fontWeight="bold">
                          KEYWORDS
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {item.abstract_keywords.split(/[;,]/).map((keyword, index) => (
                            <Chip
                              key={index}
                              label={keyword.trim()}
                              size="small"
                              variant="outlined"
                              sx={{ borderRadius: 1 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* WoS Categories */}
                    {item.abstract_wos_categories && typeof item.abstract_wos_categories === 'string' && item.abstract_wos_categories.trim() && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom fontWeight="bold">
                          WOS CATEGORIES
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {item.abstract_wos_categories.split(/[;,]/).map((category, index) => (
                            <Chip
                              key={index}
                              label={category.trim()}
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ borderRadius: 1 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Research Areas */}
                    {item.abstract_research_areas && typeof item.abstract_research_areas === 'string' && item.abstract_research_areas.trim() && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom fontWeight="bold">
                          RESEARCH AREAS
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {item.abstract_research_areas.split(/[;,]/).map((area, index) => (
                            <Chip
                              key={index}
                              label={area.trim()}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ borderRadius: 1 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Box>
            </Paper>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Saved Abstract</DialogTitle>
        <DialogContent>
          {updateError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {updateError}
            </Alert>
          )}
          {selectedAbstract && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                <HtmlTitle html={selectedAbstract.abstract_title} />
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={4}
            value={editFormData.notes}
            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
            placeholder="Add any personal notes about this abstract..."
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Tags"
            value={editFormData.tags}
            onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
            placeholder="e.g., interesting, follow-up, methodology"
            helperText="Separate tags with commas or semicolons"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={updating}
            startIcon={<EditIcon />}
          >
            {updating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Saved Abstract</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete this saved abstract?
          </Typography>
          {selectedAbstract && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                <HtmlTitle html={selectedAbstract.abstract_title} />
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={<DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Abstract Dialog */}
      <Dialog open={shareDialogOpen} onClose={handleCloseShareDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Share Abstract</DialogTitle>
        <DialogContent>
          {shareSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Abstract shared successfully!
            </Alert>
          )}
          {shareError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {shareError}
            </Alert>
          )}
          {selectedAbstract && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                <HtmlTitle html={selectedAbstract.abstract_title} />
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" paragraph>
            Share this abstract with a colleague via email.
          </Typography>
          <TextField
            fullWidth
            label="Recipient Email"
            type="email"
            value={shareFormData.email}
            onChange={(e) => setShareFormData({ ...shareFormData, email: e.target.value })}
            placeholder="colleague@example.com"
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            fullWidth
            label="Message (optional)"
            multiline
            rows={4}
            value={shareFormData.message}
            onChange={(e) => setShareFormData({ ...shareFormData, message: e.target.value })}
            placeholder="Add a personal message..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareDialog} disabled={sharing}>
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            variant="contained" 
            disabled={sharing || shareSuccess}
            startIcon={<ShareIcon />}
          >
            {sharing ? 'Sharing...' : 'Share'}
          </Button>
        </DialogActions>
      </Dialog>
          </Container>
        </Box>
      </Box>
    </>
  );
};

export default MySavedAbstracts;
