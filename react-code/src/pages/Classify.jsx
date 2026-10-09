import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Link,
  CssBaseline,
  alpha,
  Fab,
} from '@mui/material';
import {
  Bookmark as BookmarkIcon,
  OpenInNew as OpenIcon,
  Share as ShareIcon,
  RocketLaunch as RocketLaunchIcon,
  HelpOutline as HelpIcon,
  TrackChanges as ChallengeIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Joyride, STATUS, EVENTS, ACTIONS } from 'react-joyride';

const TOUR_KEY = 'citscisort_classify_tour_done';

const getTourSteps = (isMobile) => [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to CitSci Sort!',
    content: 'Let us show you how to classify a scientific abstract. This should take less than a minute.',
    disableBeacon: true,
  },
  {
    target: isMobile ? 'body' : '#classify-abstract-panel',
    placement: isMobile ? 'center' : 'right',
    title: 'The abstract',
    content: 'Read the abstract carefully. It shows the title, authors, text, keywords and publication metadata.',
    disableBeacon: true,
  },
  {
    target: '#classify-cobete-btn',
    placement: 'top',
    title: 'Cobete mode',
    content: 'For experienced classifiers: hides descriptions and metadata so you can classify faster.',
    disableBeacon: true,
  },
  {
    target: isMobile ? 'body' : '#classify-form-panel',
    placement: isMobile ? 'center' : 'left',
    title: 'Classification form',
    content: 'Here you classify the abstract step by step.',
    disableBeacon: true,
  },
  {
    target: isMobile ? 'body' : '#classify-stepper',
    placement: isMobile ? 'center' : 'bottom',
    title: 'Steps',
    content: 'The form has up to 4 steps: main category, dimensions (if applicable), infrastructure & comments, and a final review.',
    disableBeacon: true,
  },
  {
    target: isMobile ? 'body' : '#classify-categories',
    placement: isMobile ? 'center' : 'top',
    title: 'Select a category',
    content: 'Tap a category to select it — you move to the next step automatically.',
    disableBeacon: true,
  },
];
import { useTheme, useMediaQuery } from '@mui/material';
import abstractService from '../services/abstractService';
import challengeService from '../services/challengeService';
import savedAbstractsService from '../services/savedAbstractsService';
import ClassificationForm from '../components/ClassificationForm';
import SideMenu from '../components/dashboard/SideMenu';
import { HtmlTitle } from '../utils/htmlTitle';

const Classify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const challengeId = searchParams.get('challenge');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinRequired, setJoinRequired] = useState(false);
  const [joining, setJoining] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [saveFormData, setSaveFormData] = useState({ notes: '', tags: '' });
  const [shareFormData, setShareFormData] = useState({ email: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [shareError, setShareError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [kamikazeMode, setKamikazeMode] = useState(false);
  const [tourRun, setTourRun] = useState(false);
  const [tourKey, setTourKey] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) setTourRun(true);
  }, []);

  const handleTourEvent = (event) => {
    const { type, action, status } = event;
    if (type === EVENTS.TOUR_START) {
      localStorage.setItem(TOUR_KEY, '1');
    }
    if (
      type === EVENTS.TOUR_END ||
      action === ACTIONS.CLOSE ||
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED
    ) {
      setTourRun(false);
    }
  };

  const startTour = () => {
    localStorage.removeItem(TOUR_KEY);
    setTourKey(k => k + 1);
    setTourRun(true);
  };

  useEffect(() => {
    loadNextAbstract();
  }, [challengeId]);

  const loadNextAbstract = async () => {
    setLoading(true);
    setError('');
    setJoinRequired(false);
    try {
      const response = await abstractService.getNextToClassify(challengeId);
      setData(response);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.code === 'challenge_join_required') {
        setJoinRequired(true);
      } else {
        setError(
          err.response?.data?.detail ||
          'Error loading abstract. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinAndContinue = async () => {
    if (!challengeId) return;
    setJoining(true);
    try {
      await challengeService.join(challengeId);
      await loadNextAbstract();
    } catch {
      // error toast handled by the api interceptor
    } finally {
      setJoining(false);
    }
  };

  const handleOpenSaveDialog = () => {
    setOpenSaveDialog(true);
    setSaveError('');
    setSaveSuccess(false);
    setSaveFormData({ notes: '', tags: '' });
  };

  const handleCloseSaveDialog = () => {
    setOpenSaveDialog(false);
    setSaveFormData({ notes: '', tags: '' });
    setSaveError('');
    setSaveSuccess(false);
  };

  const handleSaveAbstract = async () => {
    setSaving(true);
    setSaveError('');
    
    try {
      await savedAbstractsService.saveAbstract(
        data.abstract.id,
        saveFormData.notes,
        saveFormData.tags
      );
      setSaveSuccess(true);
      setTimeout(() => {
        handleCloseSaveDialog();
      }, 1500);
    } catch (err) {
      setSaveError(
        err.response?.data?.detail ||
        'Error saving abstract. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenShareDialog = () => {
    setOpenShareDialog(true);
    setShareError('');
    setShareSuccess(false);
    setShareFormData({ email: '', message: '' });
  };

  const handleCloseShareDialog = () => {
    setOpenShareDialog(false);
    setShareFormData({ email: '', message: '' });
    setShareError('');
    setShareSuccess(false);
  };

  const handleShareAbstract = async () => {
    if (!shareFormData.email) {
      setShareError('Please enter a recipient email address');
      return;
    }

    setSharing(true);
    setShareError('');
    
    try {
      await abstractService.shareAbstract(
        data.abstract.id,
        shareFormData.email,
        shareFormData.message
      );
      setShareSuccess(true);
      setTimeout(() => {
        handleCloseShareDialog();
      }, 1500);
    } catch (err) {
      setShareError(
        err.response?.data?.detail ||
        'Error sharing abstract. Please try again.'
      );
    } finally {
      setSharing(false);
    }
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
            })}
          >
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
              <CircularProgress />
            </Box>
          </Box>
        </Box>
      </>
    );
  }

  if (joinRequired) {
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
            })}
          >
            <Container maxWidth="sm" sx={{ mt: { xs: 8, md: 12 } }}>
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <ChallengeIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Join this challenge to classify
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  This challenge's queue is for participants. Join it and we'll bring you the next abstract.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button variant="contained" startIcon={<ChallengeIcon />} disabled={joining}
                    onClick={handleJoinAndContinue}>
                    {joining ? 'Joining…' : 'Join & continue'}
                  </Button>
                  <Button variant="outlined" onClick={() => navigate('/dashboard')}>
                    Back to challenges
                  </Button>
                </Box>
              </Paper>
            </Container>
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
            })}
          >
            <Container maxWidth="xl" sx={{ mt: 4 }}>
              <Alert severity="error">{error}</Alert>
            </Container>
          </Box>
        </Box>
      </>
    );
  }

  if (data?.completed) {
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
            })}
          >
            <Container maxWidth="sm" sx={{ mt: { xs: 8, md: 12 } }}>
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <CheckCircleIcon sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Nothing left to classify here
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {data.message ||
                    (data.challenge
                      ? `You've classified everything available in "${data.challenge.title}".`
                      : 'There are no more abstracts available right now.')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button variant="contained" startIcon={<ChallengeIcon />} onClick={() => navigate('/dashboard')}>
                    Back to challenges
                  </Button>
                </Box>
              </Paper>
            </Container>
          </Box>
        </Box>
      </>
    );
  }

  if (!data || !data.abstract) {
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
            })}
          >
            <Container maxWidth="xl" sx={{ mt: 4 }}>
              <Alert severity="info">No abstracts available to classify.</Alert>
            </Container>
          </Box>
        </Box>
      </>
    );
  }

  const { abstract, is_training, progress, challenge } = data;

  return (
    <>
      <Joyride
        key={tourKey}
        steps={getTourSteps(isMobile)}
        run={tourRun}
        continuous
        showSkipButton
        showProgress
        onEvent={handleTourEvent}
        styles={{
          options: { zIndex: 10000, primaryColor: '#1976d2' },
          tooltip: { borderRadius: 8 },
        }}
        locale={{ back: 'Back', close: 'Close', last: 'Done', next: 'Next', skip: 'Skip tour' }}
      />
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
            height: '100vh',
            overflow: 'hidden',
            p: 3,
            boxSizing: 'border-box',
          })}
        >
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            width: '100%',
            gap: 3,
            height: '100%',
          }}>
            {/* Left side - Abstract Information */}
            <Box sx={{ 
              flex: 1, 
              minWidth: { lg: 500 },
              height: { xs: '50%', lg: '100%' },
              overflow: { xs: 'auto', lg: 'auto' },
              display: 'flex',
              flexDirection: 'column',
              borderBottom: { xs: '2px solid #e0e0e0', lg: 'none' },
              paddingBottom: { xs: 2, lg: 0 },
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '4px',
              },
            }}>
          <Paper id="classify-abstract-panel" elevation={3} sx={{ p: 3, height: { xs: 'auto', lg: 'auto' }, display: 'flex', flexDirection: 'column' }}>
            {/* Title + controls */}
            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="flex-start" gap={1}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                  <HtmlTitle html={abstract.title} />
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mt={1}>
                {!kamikazeMode && (
                  <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                    {challenge && (
                      <Chip
                        component={RouterLink}
                        to={`/challenges/${challenge.id}`}
                        clickable
                        icon={<ChallengeIcon sx={{ fontSize: 14 }} />}
                        label={`Challenge: ${challenge.title}`}
                        size="small"
                        color="secondary"
                      />
                    )}
                    <Chip label={`This abstract: ${progress.current}/${progress.required}`} size="small" color="success" variant="outlined" />
                    {is_training && <Chip label="Training Mode" color="warning" size="small" />}
                  </Box>
                )}
                <Box display="flex" gap={1} flexShrink={0} sx={{ ml: 'auto' }}>
                  {kamikazeMode ? (
                    <>
                      <Tooltip title="Share"><IconButton size="small" onClick={handleOpenShareDialog}><ShareIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Save"><IconButton size="small" onClick={handleOpenSaveDialog}><BookmarkIcon fontSize="small" /></IconButton></Tooltip>
                    </>
                  ) : (
                    <>
                      <Button variant="outlined" size="small" startIcon={<ShareIcon />} onClick={handleOpenShareDialog}>Share</Button>
                      <Button variant="outlined" size="small" startIcon={<BookmarkIcon />} onClick={handleOpenSaveDialog}>Save</Button>
                    </>
                  )}
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {!kamikazeMode && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary" gutterBottom>Authors</Typography>
                <Typography variant="body1">{abstract.authors}</Typography>
              </Box>
            )}

            {/* Abstract Text — always visible */}
            <Box sx={{ mb: 3 }}>
              {!kamikazeMode && (
                <Typography variant="overline" color="text.secondary" gutterBottom>Abstract</Typography>
              )}
              <Typography variant="body1" sx={{ textAlign: 'justify', lineHeight: 1.8 }}>
                {abstract.abstract_text}
              </Typography>
            </Box>

            {/* Keywords */}
            {abstract.keywords && (
              <Box sx={{ mb: 3 }}>
                {!kamikazeMode && (
                  <Typography variant="overline" color="text.secondary" gutterBottom>Keywords</Typography>
                )}
                <Box display="flex" gap={1} flexWrap="wrap" mt={kamikazeMode ? 0 : 1}>
                  {abstract.keywords.split(';').map((kw, i) => (
                    <Chip key={i} label={kw.trim()} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}

            {/* Metadata */}
            {!kamikazeMode && <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">
                    Journal
                  </Typography>
                  <Typography variant="body2">
                    {abstract.journal || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">
                    Year
                  </Typography>
                  <Typography variant="body2">
                    {abstract.publication_year || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">
                    Times Cited
                  </Typography>
                  <Typography variant="body2">
                    {abstract.times_cited || 0}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">
                    WoS Categories
                  </Typography>
                  <Typography variant="body2">
                    {abstract.wos_categories || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">
                    Research Areas
                  </Typography>
                  <Typography variant="body2">
                    {abstract.research_areas || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">
                    Affiliations
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {abstract.affiliations || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">
                    DOI
                  </Typography>
                  {abstract.doi ? (
                    <Link
                      href={`https://doi.org/${abstract.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}
                    >
                      {abstract.doi}
                      <OpenIcon fontSize="small" />
                    </Link>
                  ) : (
                    <Typography variant="body2">
                      N/A
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>}
          </Paper>
        </Box>

        {/* Right side - Classification Form */}
        <Box sx={{ 
          flex: 1, 
          minWidth: { lg: 500 },
          height: { xs: '50%', lg: '100%' },
          overflow: { xs: 'auto', lg: 'auto' },
          display: 'flex',
          flexDirection: 'column',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          },
        }}>
          <Paper id="classify-form-panel" elevation={3} sx={{ p: 3, height: { xs: 'auto', lg: 'auto' }, display: 'flex', flexDirection: 'column' }}>
            <ClassificationForm
              abstractId={abstract.id}
              onSuccess={loadNextAbstract}
              kamikazeMode={kamikazeMode}
            />
          </Paper>
        </Box>
          </Box>
        </Box>
      </Box>

      {/* FAB buttons */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 1.5, zIndex: 1200 }}>
        <Tooltip title="Show tour" placement="left">
          <Fab id="classify-help-btn" size="small" onClick={startTour} sx={{ bgcolor: 'background.paper', color: 'text.secondary', boxShadow: 2 }}>
            <HelpIcon fontSize="small" />
          </Fab>
        </Tooltip>
        <Tooltip title={kamikazeMode ? 'Exit Cobete mode' : 'Cobete mode'} placement="left">
          <Fab id="classify-cobete-btn" size="small" onClick={() => setKamikazeMode(k => !k)}
            sx={{ bgcolor: kamikazeMode ? 'warning.main' : 'background.paper', color: kamikazeMode ? 'white' : 'text.secondary', boxShadow: 2 }}>
            <RocketLaunchIcon fontSize="small" />
          </Fab>
        </Tooltip>
      </Box>

      {/* Save Abstract Dialog */}
      <Dialog open={openSaveDialog} onClose={handleCloseSaveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Save Abstract</DialogTitle>
        <DialogContent>
          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Abstract saved successfully!
            </Alert>
          )}
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" paragraph>
            Save this abstract for later reference. You can add notes and tags to help organize your saved abstracts.
          </Typography>
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={4}
            value={saveFormData.notes}
            onChange={(e) => setSaveFormData({ ...saveFormData, notes: e.target.value })}
            placeholder="Add any personal notes about this abstract..."
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Tags"
            value={saveFormData.tags}
            onChange={(e) => setSaveFormData({ ...saveFormData, tags: e.target.value })}
            placeholder="e.g., interesting, follow-up, methodology"
            helperText="Separate tags with commas or semicolons"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveDialog} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAbstract} 
            variant="contained" 
            disabled={saving || saveSuccess}
            startIcon={<BookmarkIcon />}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Abstract Dialog */}
      <Dialog open={openShareDialog} onClose={handleCloseShareDialog} maxWidth="sm" fullWidth>
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
            onClick={handleShareAbstract} 
            variant="contained" 
            disabled={sharing || shareSuccess}
            startIcon={<ShareIcon />}
          >
            {sharing ? 'Sharing...' : 'Share'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Classify;
