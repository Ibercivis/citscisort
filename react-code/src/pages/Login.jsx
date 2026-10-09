import { useState, useEffect } from 'react';
import logo from '../assets/logo.png';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
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
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  // Get the page they were trying to access
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

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
      navigate(from, { replace: true });
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
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
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

          {/* Right Side - Login Form */}
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
              Sign In
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
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link component={RouterLink} to="/reset-password" variant="body2">
                  Forgot password?
                </Link>
                <Link component={RouterLink} to="/register" variant="body2">
                  Don't have an account? Sign up
                </Link>
              </Box>
              <GoogleSignInButton onSuccess={handleGoogleSuccess} />
            </Box>
          </Paper>
        </Stack>
      </Stack>
    </>
  );
};

export default Login;
