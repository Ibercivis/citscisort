import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Alert,
  Divider,
  CssBaseline,
  CircularProgress,
  alpha,
  TextField,
  MenuItem,
  Switch,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Public as PublicIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import accountService from '../services/accountService';
import profileService from '../services/profileService';
import SideMenu from '../components/dashboard/SideMenu';

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [deleteClassifications, setDeleteClassifications] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState([]);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    country: '',
    institution: '',
    is_profile_public: false,
    wants_in_acknowledgments: false,
    wants_paper_collaboration: false,
  });
  const [saving, setSaving] = useState(false);
  const [savingEmailPref, setSavingEmailPref] = useState(null);
  const [emailPrefError, setEmailPrefError] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    loadProfile();
    loadCountries();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await profileService.getProfile();
      setProfile(profileData);
      setEditForm({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        country: profileData.country || '',
        institution: profileData.institution || '',
        is_profile_public: profileData.is_profile_public || false,
        wants_in_acknowledgments: profileData.wants_in_acknowledgments || false,
        wants_paper_collaboration: profileData.wants_paper_collaboration || false,
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Error loading profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const data = await profileService.getCountries();
      setCountries(data.countries || []);
    } catch (err) {
      console.error('Error loading countries:', err);
    }
  };

  const handleEmailPrefChange = async (field, checked) => {
    setSavingEmailPref(field);
    setEmailPrefError('');
    try {
      const updatedProfile = await profileService.updateProfile({ [field]: checked });
      setProfile(updatedProfile);
    } catch (err) {
      console.error('Error updating email preference:', err);
      setEmailPrefError(
        err.response?.data?.detail ||
        'Error updating email preferences. Please try again.'
      );
    } finally {
      setSavingEmailPref(null);
    }
  };

  const handleOpenEditDialog = () => {
    setOpenEditDialog(true);
    setEditError('');
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditError('');
    // Reset form to current profile values
    setEditForm({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      country: profile?.country || '',
      institution: profile?.institution || '',
      is_profile_public: profile?.is_profile_public || false,
      wants_in_acknowledgments: profile?.wants_in_acknowledgments || false,
      wants_paper_collaboration: profile?.wants_paper_collaboration || false,
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setEditError('');

    try {
      const updatedProfile = await profileService.updateProfile(editForm);
      setProfile(prev => ({ ...prev, ...updatedProfile, ...editForm }));
      setOpenEditDialog(false);
      navigate(-1);
    } catch (err) {
      console.error('Error updating profile:', err);
      setEditError(
        err.response?.data?.detail ||
        'Error updating profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setDeleteClassifications(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');

    try {
      await accountService.deleteAccount(deleteClassifications);
      await logout();
      navigate('/login');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Error deleting account. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
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
          <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Account Settings
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Manage your account preferences and data
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Account Information */}
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      Account Information
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={handleOpenEditDialog}
                      size="small"
                    >
                      Edit Profile
                    </Button>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {profile?.email || user?.email}
                      </Typography>
                    </Box>
                    {(profile?.first_name || profile?.last_name) && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {[profile.first_name, profile.last_name].filter(Boolean).join(' ')}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Country
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {profile?.country_name || 'Not specified'}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Institution
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {profile?.institution || 'Not specified'}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Profile Visibility
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        {profile?.is_profile_public ? (
                          <>
                            <PublicIcon color="success" fontSize="small" />
                            <Typography variant="body1" fontWeight="medium" color="success.main">
                              Public
                            </Typography>
                          </>
                        ) : (
                          <>
                            <PublicIcon color="disabled" fontSize="small" />
                            <Typography variant="body1" fontWeight="medium" color="text.secondary">
                              Private
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Participation
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        Acknowledgments
                      </Typography>
                      <Typography variant="body2" fontWeight="medium" color={profile?.wants_in_acknowledgments ? 'success.main' : 'text.secondary'}>
                        {profile?.wants_in_acknowledgments ? 'Opted in' : 'No'}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        Paper collaboration
                      </Typography>
                      <Typography variant="body2" fontWeight="medium" color={profile?.wants_paper_collaboration ? 'success.main' : 'text.secondary'}>
                        {profile?.wants_paper_collaboration ? 'Opted in' : 'No'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
                {/* Email preferences */}
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Email preferences
                  </Typography>
                  {emailPrefError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {emailPrefError}
                    </Alert>
                  )}
                  {[
                    {
                      field: 'activity_emails_opt_in',
                      label: 'Reminder and milestone emails',
                      help: 'Occasional emails about your own activity: when you reach a milestone, or if you have been away for a while.',
                      checked: profile?.activity_emails_opt_in ?? true,
                    },
                    {
                      field: 'newsletter_opt_in',
                      label: 'Project newsletter',
                      help: 'News about the project and its results.',
                      checked: profile?.newsletter_opt_in ?? false,
                    },
                  ].map(({ field, label, help, checked }) => (
                    <FormControlLabel
                      key={field}
                      sx={{ display: 'flex', mb: 1 }}
                      control={
                        <Switch
                          checked={checked}
                          disabled={savingEmailPref !== null}
                          onChange={(e) => handleEmailPrefChange(field, e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {help}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </Paper>
              </>
            )}

            {/* Edit Profile Dialog */}
            <Dialog
              open={openEditDialog}
              onClose={handleCloseEditDialog}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogContent>
                {editError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {editError}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="First Name"
                  value={editForm.first_name}
                  onChange={(e) => handleEditFormChange('first_name', e.target.value)}
                  sx={{ mb: 2, mt: 1 }}
                  placeholder="Your first name"
                />

                <TextField
                  fullWidth
                  label="Last Name"
                  value={editForm.last_name}
                  onChange={(e) => handleEditFormChange('last_name', e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="Your last name"
                />

                <TextField
                  select
                  fullWidth
                  label="Country"
                  value={editForm.country}
                  onChange={(e) => handleEditFormChange('country', e.target.value)}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="">
                    <em>Not specified</em>
                  </MenuItem>
                  {countries.map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  label="Institution"
                  value={editForm.institution}
                  onChange={(e) => handleEditFormChange('institution', e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="Your institution or organization"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={editForm.is_profile_public}
                      onChange={(e) => handleEditFormChange('is_profile_public', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Make profile public
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Other users will be able to see your profile information
                      </Typography>
                    </Box>
                  }
                />

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Participation
                </Typography>

                <FormControlLabel
                  sx={{ mb: 1 }}
                  control={
                    <Switch
                      checked={editForm.wants_in_acknowledgments}
                      onChange={(e) => handleEditFormChange('wants_in_acknowledgments', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Appear in acknowledgments
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Your name may be included in the acknowledgments of publications and project reports derived from this platform
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={editForm.wants_paper_collaboration}
                      onChange={(e) => handleEditFormChange('wants_paper_collaboration', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Collaborate on a research paper
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Express interest in being contacted for potential co-authorship or collaboration on research papers derived from this data
                      </Typography>
                    </Box>
                  }
                />
              </DialogContent>
              <DialogActions sx={{ p: 3 }}>
                <Button onClick={handleCloseEditDialog} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  variant="contained"
                  disabled={saving}
                  startIcon={<EditIcon />}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Danger Zone */}
            <Paper elevation={2} sx={{ p: 3, border: 2, borderColor: 'error.main' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <WarningIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="bold" color="error">
                  Danger Zone
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" paragraph>
                Once you delete your account, there is no going back. Please be certain.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleOpenDialog}
                size="large"
              >
                Delete Account
              </Button>
            </Paper>

            {/* Confirmation Dialog */}
            <Dialog
              open={openDialog}
              onClose={handleCloseDialog}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>
                <Box display="flex" alignItems="center">
                  <WarningIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Delete Account
                  </Typography>
                </Box>
              </DialogTitle>
              <DialogContent>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Are you sure you want to delete your account?
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    This action cannot be undone. Your account will be permanently deleted.
                  </Typography>
                </Alert>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  What happens to your data?
                </Typography>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={deleteClassifications}
                      onChange={(e) => setDeleteClassifications(e.target.checked)}
                      color="error"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Delete all my classification data
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        If unchecked, your classifications will be preserved anonymously to support the project. 
                        Your personal information will be deleted in both cases.
                      </Typography>
                    </Box>
                  }
                />

                <Box sx={{ mt: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {deleteClassifications
                      ? "✗ All your classifications will be permanently deleted"
                      : "✓ Your classifications will remain in the database (anonymously)"}
                  </Typography>
                </Box>
              </DialogContent>
              <DialogActions sx={{ p: 3 }}>
                <Button onClick={handleCloseDialog} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  color="error"
                  variant="contained"
                  disabled={deleting}
                  startIcon={<DeleteIcon />}
                >
                  {deleting ? 'Deleting...' : 'Delete My Account'}
                </Button>
              </DialogActions>
            </Dialog>
          </Container>
        </Box>
      </Box>
    </>
  );
};

export default AccountSettings;
