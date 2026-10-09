import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  CssBaseline,
  Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api, { ensureCsrfCookie } from '../services/api';

const VerifyEmail = () => {
  const { key } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const verifyEmail = async () => {
    setStatus('loading');
    try {
      await ensureCsrfCookie();
      await api.post('/api/auth/registration/verify-email/', { key });
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error.response?.data?.detail ||
        error.response?.data?.key?.[0] ||
        'Invalid or expired verification link. Please try again or contact support.'
      );
    }
  };

  useEffect(() => {
    if (key) {
      verifyEmail();
    } else {
      setStatus('error');
      setErrorMessage('No verification key provided.');
    }
  }, [key]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <>
      <CssBaseline />
      <Stack
        direction="column"
        component="main"
        sx={[
          {
            minHeight: '100vh',
            justifyContent: 'center',
            alignItems: 'center',
          },
          (theme) => ({
            backgroundImage:
              'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
            backgroundSize: 'cover',
            ...theme.applyStyles('dark', {
              backgroundImage:
                'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
            }),
          }),
        ]}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 450,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            m: 2,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            {status === 'loading' && (
              <>
                <CircularProgress size={60} sx={{ mb: 3 }} />
                <Typography variant="h5" gutterBottom>
                  Verifying Your Email...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please wait while we verify your email address.
                </Typography>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircleIcon
                  sx={{ fontSize: 60, color: 'success.main', mb: 2 }}
                />
                <Typography variant="h5" gutterBottom color="success.main">
                  Email Verified!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Your email has been verified. You can now sign in to your account.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleGoToLogin}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Go to Login
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <ErrorIcon
                  sx={{ fontSize: 60, color: 'error.main', mb: 2 }}
                />
                <Typography variant="h5" gutterBottom color="error.main">
                  Verification Failed
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {errorMessage}
                </Typography>
                <Button
                  variant="contained"
                  onClick={verifyEmail}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Try again
                </Button>
              </>
            )}
          </Box>
        </Paper>
      </Stack>
    </>
  );
};

export default VerifyEmail;
