import { useState, useEffect } from 'react';
import logo from '../assets/logo.png';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Link,
  Stack,
  CssBaseline,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

const Register = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password1: '',
    password2: '',
  });
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      await loginWithGoogle(tokenResponse);
      navigate('/dashboard');
    } catch {
      // handled by global toast
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData.email, formData.password1, formData.password2);
      navigate('/email-confirmation', { state: { email: formData.email } });
    } catch {
      // handled by global toast
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
            minHeight: '100vh',
          },
          (theme) => ({
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              zIndex: -1,
              inset: 0,
              backgroundColor: theme.palette.background.default,
              backgroundImage: `radial-gradient(ellipse at 60% 40%, ${theme.palette.primary.main}22 0%, transparent 70%)`,
              backgroundRepeat: 'no-repeat',
            },
          }),
        ]}
      >
        <Stack
          direction={{ xs: 'column-reverse', md: 'row' }}
          sx={{
            justifyContent: 'center',
            gap: { xs: 4, sm: 12 },
            p: { xs: 3, sm: 4 },
            py: { xs: 5, sm: 4 },
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
            <Box component="img" src={logo} alt="CitSci Sort" sx={{ maxHeight: 120, maxWidth: 400, width: 'auto', height: 'auto', mb: 2, display: 'block', objectFit: 'contain', alignSelf: 'flex-start' }} />
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.8 }}>
              Classifying Citizen Science Research
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8, opacity: 0.9 }}>
              Classify scientific abstracts and contribute to mapping the global landscape
              of citizen science research. Every decision you make adds to a collective
              picture of how citizen science shapes academic literature.
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8, opacity: 0.9 }}>
              Be part of a growing community of researchers and volunteers working together
              to build the most comprehensive database of citizen science publications
              to date.
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Button component={RouterLink} to="/about" variant="outlined" size="small">
                Learn more
              </Button>
            </Box>
          </Box>

          {/* Right Side - Register Form */}
          <Paper
            elevation={3}
            sx={{
              p: 4,
              width: '100%',
              maxWidth: 450,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography component="h1" variant="h5" align="center" gutterBottom>
              Sign Up
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password1"
                label="Password"
                type="password"
                id="password1"
                value={formData.password1}
                onChange={handleChange}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password2"
                label="Confirm Password"
                type="password"
                id="password2"
                value={formData.password2}
                onChange={handleChange}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 2 }}>
                <FormControlLabel
                  control={<Checkbox size="small" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />}
                  label={
                    <Typography variant="body2">
                      I accept the{' '}
                      <Link component={RouterLink} to="/about?tab=terms" target="_blank" underline="hover">Terms of Use</Link>
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={<Checkbox size="small" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} />}
                  label={
                    <Typography variant="body2">
                      I accept the{' '}
                      <Link component={RouterLink} to="/about?tab=privacy" target="_blank" underline="hover">Privacy Policy</Link>
                    </Typography>
                  }
                />
              </Box>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 2 }}
                disabled={loading || !termsAccepted || !privacyAccepted}
              >
                {loading ? 'Signing up...' : 'Sign Up'}
              </Button>
              <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link component={RouterLink} to="/login" variant="body2">
                  Already have an account? Sign in
                </Link>
              </Box>
              <GoogleSignInButton onSuccess={handleGoogleSuccess} label="Sign up with Google" />
            </Box>
          </Paper>
        </Stack>
      </Stack>
    </>
  );
};

export default Register;
