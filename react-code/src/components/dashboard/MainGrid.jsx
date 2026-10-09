import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Checkbox,
  Autocomplete,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Timer as TimerIcon,
  Speed as SpeedIcon,
  EmojiEvents as TrophyIcon,
  BarChart as BarChartIcon,
  Forum as ForumIcon,
  Feed as FeedIcon,
  ChevronRight as ChevronRightIcon,
  Edit as EditIcon,
  Public as PublicIcon,
  PublicOff as PublicOffIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  School as SchoolIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { getUserDisplayName, getUserInitials } from '../../utils/userDisplay';
import statsService from '../../services/statsService';
import profileService from '../../services/profileService';
import accountService from '../../services/accountService';
import DashboardChallengesPanel from './DashboardChallengesPanel';

const formatTime = (seconds) => {
  if (!seconds) return 'N/A';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

const QUICK_LINKS = [
  { icon: BarChartIcon, label: 'Statistics',   sub: 'Explore project data',      path: '/stats',    colorKey: 'primary' },
  { icon: ForumIcon,   label: 'Debates',        sub: 'Discuss classifications',   path: '/debates',  colorKey: 'secondary' },
  { icon: FeedIcon,    label: 'Activity',       sub: 'Full community feed',       path: '/activity', colorKey: 'info' },
];

const MainGrid = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [stats, setStats]     = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);

  // Edit dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '', last_name: '', country: '', institution: '', background: '',
    is_profile_public: false, wants_in_acknowledgments: false, wants_paper_collaboration: false,
    activity_emails_opt_in: true, newsletter_opt_in: false,
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Newsletter consent prompt (explicit opt-in; "No, thanks" is remembered per browser)
  const NEWSLETTER_DISMISSED_KEY = 'citscisort.newsletterPromptDismissed';
  const [newsletterDismissed, setNewsletterDismissed] = useState(() => {
    try { return localStorage.getItem(NEWSLETTER_DISMISSED_KEY) === '1'; } catch { return false; }
  });
  const [newsletterSaving, setNewsletterSaving] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  // Delete dialog
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteClassifications, setDeleteClassifications] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    Promise.all([
      statsService.getMyStats().catch(() => null),
      profileService.getProfile().catch(() => null),
      profileService.getCountries().catch(() => null),
      profileService.getBackgrounds().catch(() => null),
    ]).then(([statsData, profileData, countriesData, backgroundsData]) => {
      setStats(statsData);
      setProfile(profileData);
      setCountries(countriesData?.countries || []);
      setBackgrounds(backgroundsData?.backgrounds || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleOpenEdit = () => {
    setEditForm({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      country: profile?.country || '',
      institution: profile?.institution || '',
      background: profile?.background || '',
      is_profile_public: profile?.is_profile_public || false,
      wants_in_acknowledgments: profile?.wants_in_acknowledgments || false,
      wants_paper_collaboration: profile?.wants_paper_collaboration || false,
      activity_emails_opt_in: profile?.activity_emails_opt_in ?? true,
      newsletter_opt_in: profile?.newsletter_opt_in ?? false,
    });
    setEditError('');
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setEditError('');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setEditError('');
    try {
      const updatedProfile = await profileService.updateProfile(editForm);
      setProfile(prev => ({ ...prev, ...updatedProfile, ...editForm }));
      setOpenEdit(false);
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNewsletterYes = async () => {
    setNewsletterSaving(true);
    setNewsletterError('');
    try {
      const updatedProfile = await profileService.updateProfile({ newsletter_opt_in: true });
      setProfile(prev => ({ ...prev, ...updatedProfile, newsletter_opt_in: true }));
    } catch (err) {
      setNewsletterError(err.response?.data?.detail || 'Could not subscribe. Please try again.');
    } finally {
      setNewsletterSaving(false);
    }
  };

  const handleNewsletterNo = () => {
    try { localStorage.setItem(NEWSLETTER_DISMISSED_KEY, '1'); } catch { /* ignore */ }
    setNewsletterDismissed(true);
  };

  const handleOpenDelete = () => {
    setDeleteError('');
    setDeleteClassifications(false);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setDeleteError('');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await accountService.deleteAccount(deleteClassifications);
      await logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Error deleting account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  const kpis = [
    { icon: <TrendingUpIcon sx={{ fontSize: 16 }} />, label: 'Total',   value: stats?.overview.total_classifications || 0,            color: theme.palette.primary.main },
    { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, label: 'Today',  value: stats?.overview.classifications_today || 0,            color: theme.palette.success.main },
    { icon: <TimerIcon sx={{ fontSize: 16 }} />,       label: 'Avg',    value: formatTime(stats?.overview.average_time_seconds),      color: theme.palette.info.main },
    { icon: <SpeedIcon sx={{ fontSize: 16 }} />,       label: 'Fastest',value: formatTime(stats?.overview.fastest_time_seconds),      color: theme.palette.secondary.main },
  ];

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, height: { xs: 'auto', md: 'calc(100vh - 96px)' }, alignItems: 'stretch' }}>

        {/* ── LEFT column ─────────────────────────────────────── */}
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Profile card */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            {(() => {
              const profileName = profile
                ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
                : '';
              const displayName = profileName || getUserDisplayName(user);
              const email = user?.email || profile?.email;

              const details = [
                ...(profileName ? [{ icon: <EmailIcon sx={{ fontSize: 12 }} />, value: email }] : []),
                { icon: <BusinessIcon sx={{ fontSize: 12 }} />, value: profile?.institution || '—' },
                { icon: <LocationIcon sx={{ fontSize: 12 }} />, value: profile?.country_name || '—' },
                ...(profile?.background_display ? [{ icon: <SchoolIcon sx={{ fontSize: 12 }} />, value: profile.background_display }] : []),
                {
                  icon: profile?.is_profile_public
                    ? <PublicIcon sx={{ fontSize: 12 }} />
                    : <PublicOffIcon sx={{ fontSize: 12 }} />,
                  value: profile?.is_profile_public ? 'Public profile' : 'Anonymous',
                  color: profile?.is_profile_public ? 'success.main' : 'text.secondary',
                },
              ];

              return (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '0.95rem', flexShrink: 0 }}>
                      {getUserInitials(user)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight="bold" noWrap>
                        {displayName}
                      </Typography>
                      {!profileName && (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                          No name set
                        </Typography>
                      )}
                    </Box>
                    <Tooltip title="Edit profile" placement="top">
                      <IconButton size="small" onClick={handleOpenEdit} sx={{ flexShrink: 0 }}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, mb: 1.5 }}>
                    {details.map(({ icon, value, color }, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ color: color || 'text.disabled', display: 'flex', flexShrink: 0 }}>{icon}</Box>
                        <Typography variant="caption" color={color || 'text.secondary'} noWrap>{value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              );
            })()}

            {/* Participation */}
            <Divider sx={{ mb: 1.25 }} />
            <Typography variant="caption" color="text.secondary" fontWeight="medium"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
              Participation
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, mb: 2 }}>
              {[
                { key: 'wants_in_acknowledgments',  label: 'Acknowledgments' },
                { key: 'wants_paper_collaboration', label: 'Paper collaboration' },
              ].map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CheckCircleIcon sx={{ fontSize: 13, color: profile?.[key] ? 'success.main' : 'action.disabled' }} />
                  <Typography variant="caption" color={profile?.[key] ? 'text.primary' : 'text.disabled'}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* CTA */}
            <Button fullWidth variant="contained" startIcon={<AssignmentIcon />}
              onClick={() => navigate('/classify')}>
              Start Classifying
            </Button>
          </Paper>

          {/* Newsletter consent prompt */}
          {profile && !profile.newsletter_opt_in && !newsletterDismissed && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'secondary.main' }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <EmailIcon sx={{ fontSize: 18 }} color="secondary" />
                <Typography variant="subtitle2" fontWeight="bold">Project newsletter?</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Would you like to receive occasional news about the project and its results? You can change this any time in Edit profile.
              </Typography>
              {newsletterError && <Alert severity="error" sx={{ mb: 1 }}>{newsletterError}</Alert>}
              <Box display="flex" gap={1}>
                <Button size="small" variant="contained" disabled={newsletterSaving} onClick={handleNewsletterYes}>
                  Yes, subscribe me
                </Button>
                <Button size="small" disabled={newsletterSaving} onClick={handleNewsletterNo}>
                  No, thanks
                </Button>
              </Box>
            </Paper>
          )}

          {/* KPIs */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="medium"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Your stats
            </Typography>
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {kpis.map(({ icon, label, value, color }) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ color, display: 'flex' }}>{icon}</Box>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{label}</Typography>
                  <Typography variant="body2" fontWeight="bold" color="text.primary">{value}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Ranking */}
          {stats?.comparison?.my_percentile != null && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrophyIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight="bold">
                  Top {100 - stats.comparison.my_percentile}% classifier
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.comparison.my_percentile}
                sx={{
                  height: 5, borderRadius: 3, bgcolor: 'action.disabledBackground',
                  '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: 'success.main' },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Better than {stats.comparison.my_percentile}% of classifiers
              </Typography>
            </Paper>
          )}
        </Box>

        {/* ── RIGHT column ───────────────────────────────────── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

          {/* Quick links */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {QUICK_LINKS.map(({ icon: Icon, label, sub, path, colorKey }) => {
              const color = theme.palette[colorKey]?.main || theme.palette.primary.main;
              return (
                <Paper
                  key={path}
                  elevation={0}
                  onClick={() => navigate(path)}
                  sx={{
                    flex: 1, p: 1.5, borderRadius: 2,
                    border: '1px solid', borderColor: 'divider',
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                    '&:hover': { borderColor: color },
                    '&:hover .ql-icon': { transform: 'scale(1.08)' },
                  }}
                >
                  <Box className="ql-icon" sx={{
                    bgcolor: color, borderRadius: 1.5, p: 0.75,
                    display: 'flex', flexShrink: 0, transition: 'transform 0.15s ease',
                  }}>
                    <Icon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="bold">{label}</Typography>
                    <Typography variant="caption" color="text.secondary">{sub}</Typography>
                  </Box>
                  <ChevronRightIcon sx={{ color: 'text.disabled', fontSize: 18, ml: 'auto', flexShrink: 0 }} />
                </Paper>
              );
            })}
          </Box>

          {/* My Challenges */}
          <DashboardChallengesPanel />
        </Box>
      </Box>

      {/* ── Edit Profile Dialog ──────────────────────────────── */}
      <Dialog open={openEdit} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}

          <TextField fullWidth label="First Name" value={editForm.first_name}
            onChange={(e) => setEditForm(p => ({ ...p, first_name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }} placeholder="Your first name" />

          <TextField fullWidth label="Last Name" value={editForm.last_name}
            onChange={(e) => setEditForm(p => ({ ...p, last_name: e.target.value }))}
            sx={{ mb: 2 }} placeholder="Your last name" />

          <Autocomplete
            options={countries}
            getOptionLabel={(c) => (typeof c === 'string' ? c : c.name)}
            isOptionEqualToValue={(option, value) => option.code === (value?.code ?? value)}
            value={countries.find(c => c.code === editForm.country) || null}
            onChange={(_, newValue) => setEditForm(p => ({ ...p, country: newValue?.code || '' }))}
            renderInput={(params) => <TextField {...params} label="Country" placeholder="Search country…" />}
            sx={{ mb: 2 }}
          />

          <TextField fullWidth label="Institution" value={editForm.institution}
            onChange={(e) => setEditForm(p => ({ ...p, institution: e.target.value }))}
            sx={{ mb: 2 }} placeholder="Your institution or organization" />

          <TextField
            select fullWidth label="Academic background" value={editForm.background}
            onChange={(e) => setEditForm(p => ({ ...p, background: e.target.value }))}
            sx={{ mb: 2 }}
          >
            <MenuItem value=""><em>Not specified</em></MenuItem>
            {backgrounds.map((b) => (
              <MenuItem key={b.code} value={b.code}>{b.name}</MenuItem>
            ))}
          </TextField>

          <FormControlLabel
            control={
              <Switch checked={editForm.is_profile_public}
                onChange={(e) => setEditForm(p => ({ ...p, is_profile_public: e.target.checked }))}
                color="primary" />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight="medium">Make profile public</Typography>
                <Typography variant="caption" color="text.secondary">
                  Other users will be able to see your profile information
                </Typography>
              </Box>
            }
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Participation</Typography>

          <FormControlLabel sx={{ mb: 1 }}
            control={
              <Switch checked={editForm.wants_in_acknowledgments}
                onChange={(e) => setEditForm(p => ({ ...p, wants_in_acknowledgments: e.target.checked }))}
                color="primary" />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight="medium">Include my name in acknowledgments</Typography>
                <Typography variant="caption" color="text.secondary">
                  Your name will be credited in the public dataset release and in any scientific publications derived from this project
                </Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch checked={editForm.wants_paper_collaboration}
                onChange={(e) => setEditForm(p => ({ ...p, wants_paper_collaboration: e.target.checked }))}
                color="primary" />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight="medium">I'm interested in co-authoring the research paper</Typography>
                <Typography variant="caption" color="text.secondary">
                  Let the research team know you're open to being contacted about co-authorship on the scientific publication
                </Typography>
              </Box>
            }
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Emails</Typography>

          {[
            {
              field: 'activity_emails_opt_in',
              label: 'Reminder and milestone emails',
              help: 'Occasional emails about your own activity: when you reach a milestone, or if you have been away for a while',
            },
            {
              field: 'newsletter_opt_in',
              label: 'Project newsletter',
              help: 'News about the project and its results',
            },
          ].map(({ field, label, help }) => (
            <FormControlLabel
              key={field}
              sx={{ display: 'flex' }}
              control={
                <Switch checked={editForm[field]}
                  onChange={(e) => setEditForm(p => ({ ...p, [field]: e.target.checked }))}
                  color="primary" />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight="medium">{label}</Typography>
                  <Typography variant="caption" color="text.secondary">{help}</Typography>
                </Box>
              }
            />
          ))}

          <Divider sx={{ my: 2 }} />

          {/* Danger zone inside edit dialog */}
          <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <WarningIcon color="error" sx={{ fontSize: 16 }} />
              <Typography variant="caption" fontWeight="bold" color="error">Danger Zone</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Permanently delete your account and all associated data.
            </Typography>
            <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />}
              onClick={handleOpenDelete}>
              Delete Account
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseEdit} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveProfile} variant="contained" disabled={saving} startIcon={<EditIcon />}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Account Confirmation Dialog ──────────────── */}
      <Dialog open={openDelete} onClose={handleCloseDelete} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="error" />
            <Typography variant="h6" fontWeight="bold">Delete Account</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">Are you sure you want to delete your account?</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              This action cannot be undone. Your account will be permanently deleted.
            </Typography>
          </Alert>

          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}

          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>What happens to your data?</Typography>
          <FormControlLabel
            control={
              <Checkbox checked={deleteClassifications}
                onChange={(e) => setDeleteClassifications(e.target.checked)}
                color="error" />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight="medium">Delete all my classification data</Typography>
                <Typography variant="caption" color="text.secondary">
                  If unchecked, your classifications are preserved anonymously to support the project.
                  Your personal information is deleted in both cases.
                </Typography>
              </Box>
            }
          />
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.selected', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {deleteClassifications
                ? '✗ All your classifications will be permanently deleted'
                : '✓ Your classifications will remain in the database (anonymously)'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDelete} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained" disabled={deleting}
            startIcon={<DeleteIcon />}>
            {deleting ? 'Deleting…' : 'Delete My Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MainGrid;
