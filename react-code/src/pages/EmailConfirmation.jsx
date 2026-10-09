import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  CssBaseline,
  Stack,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EmailIcon from '@mui/icons-material/Email';

const EmailConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'your email';

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
            <Typography component="h1" variant="h5" gutterBottom>
              Account Created!
            </Typography>

            <Box sx={{ my: 3 }}>
              <EmailIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Verify Your Email
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We've sent a confirmation email to:
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="primary" sx={{ mb: 2 }}>
                {email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please check your inbox and click the verification link to activate your account.
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              fullWidth
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Box>
        </Paper>
      </Stack>
    </>
  );
};

export default EmailConfirmation;
