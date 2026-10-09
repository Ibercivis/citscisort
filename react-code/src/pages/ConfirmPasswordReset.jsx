import { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Link,
  Stack,
  CssBaseline,
} from '@mui/material';
import passwordResetService from '../services/passwordResetService';

const ConfirmPasswordReset = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword1: '',
    newPassword2: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await passwordResetService.confirmReset(
        uid,
        token,
        formData.newPassword1,
        formData.newPassword2
      );
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const errorData = err.response?.data || {};
      // Handle different error formats
      if (errorData.new_password1) {
        setError(Array.isArray(errorData.new_password1) 
          ? errorData.new_password1[0] 
          : errorData.new_password1);
      } else if (errorData.new_password2) {
        setError(Array.isArray(errorData.new_password2) 
          ? errorData.new_password2[0] 
          : errorData.new_password2);
      } else if (errorData.token) {
        setError('Invalid or expired reset link. Please request a new one.');
      } else if (errorData.detail) {
        setError(errorData.detail);
      } else {
        setError('Error resetting password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CssBaseline enableColorScheme />
      <Stack
        direction="column"
        component="main"
        sx={[
          {
            justifyContent: 'center',
            height: '100vh',
            minHeight: '100%',
          },
          (theme) => ({
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              zIndex: -1,
              inset: 0,
              backgroundImage:
                'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
              backgroundRepeat: 'no-repeat',
              ...theme.applyStyles('dark', {
                backgroundImage:
                  'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
              }),
            },
          }),
        ]}
      >
        <Stack
          direction={{ xs: 'column-reverse', md: 'row' }}
          sx={{
            justifyContent: 'center',
            gap: { xs: 6, sm: 12 },
            p: { xs: 2, sm: 4 },
            m: 'auto',
            maxWidth: 1200,
          }}
        >
          {/* Left Side - Project Description */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              maxWidth: 500,
            }}
          >
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              CitSci Sort
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.8 }}>
              Classifying Citizen Science Research
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Enter your new password below. Make sure it's secure and memorable.
            </Typography>
          </Box>

          {/* Right Side - Confirm Password Reset Form */}
          <Paper
            elevation={3}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              minWidth: { xs: 300, sm: 400 },
              maxWidth: 450,
            }}
          >
            <Typography component="h1" variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
              Set New Password
            </Typography>

            {success ? (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Password reset successful! Redirecting to login...
                </Alert>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Link component={RouterLink} to="/login" variant="body2">
                    Go to Sign In
                  </Link>
                </Box>
              </>
            ) : (
              <>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="newPassword1"
                    label="New Password"
                    type="password"
                    id="newPassword1"
                    autoComplete="new-password"
                    autoFocus
                    value={formData.newPassword1}
                    onChange={handleChange}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="newPassword2"
                    label="Confirm New Password"
                    type="password"
                    id="newPassword2"
                    autoComplete="new-password"
                    value={formData.newPassword2}
                    onChange={handleChange}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={loading}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                  <Box sx={{ textAlign: 'center' }}>
                    <Link component={RouterLink} to="/login" variant="body2">
                      Back to Sign In
                    </Link>
                  </Box>
                </Box>
              </>
            )}
          </Paper>
        </Stack>
      </Stack>
    </>
  );
};

export default ConfirmPasswordReset;
