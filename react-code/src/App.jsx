import { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ColorModeContext } from './context/ColorModeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import LegalAcceptanceModal from './components/LegalAcceptanceModal';
import { setLegalRequiredHandler, setToastHandler } from './services/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import RequestPasswordReset from './pages/RequestPasswordReset';
import ConfirmPasswordReset from './pages/ConfirmPasswordReset';
import Dashboard from './pages/Dashboard';
import Classify from './pages/Classify';
import Stats from './pages/Stats';
import MyStats from './pages/MyStats';
import MySavedAbstracts from './pages/MySavedAbstracts';
import MyFollowedDebates from './pages/MyFollowedDebates';
import ActivityFeed from './pages/ActivityFeed';
import EmailConfirmation from './pages/EmailConfirmation';
import VerifyEmail from './pages/VerifyEmail';
import Debates from './pages/Debates';
import DebateDetail from './pages/DebateDetail';
import AbstractDetail from './pages/AbstractDetail';
import About from './pages/About';
import HallOfFame from './pages/HallOfFame';
import ChallengeDetail from './pages/ChallengeDetail';
import ProtectedRoute from './utils/ProtectedRoute';

const COLORS = {
  yellow:     '#FFE08D',
  teal:       '#8BD6BE',
  nearBlack:  '#171516',
  cream:      '#FEFBF6',
  offWhite:   '#F9F5F2',
};

const buildTheme = (mode) => createTheme({
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    h1: { fontFamily: '"Manrope", sans-serif', fontWeight: 800 },
    h2: { fontFamily: '"Manrope", sans-serif', fontWeight: 800 },
    h3: { fontFamily: '"Manrope", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Manrope", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Manrope", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Manrope", sans-serif', fontWeight: 600 },
  },
  palette: {
    mode,
    primary:   { main: mode === 'dark' ? COLORS.teal       : '#2A7A62',   contrastText: mode === 'dark' ? COLORS.nearBlack : '#fff' },
    secondary: { main: mode === 'dark' ? COLORS.yellow     : '#B8880A',   contrastText: COLORS.nearBlack },
    warning:   { main: COLORS.yellow, contrastText: COLORS.nearBlack },
    background: {
      default: mode === 'dark' ? '#1C1A1B'        : COLORS.cream,
      paper:   mode === 'dark' ? '#252223'        : COLORS.offWhite,
    },
    text: {
      primary:   mode === 'dark' ? '#F0EDE8' : COLORS.nearBlack,
      secondary: mode === 'dark' ? '#A89F98' : '#5C5450',
    },
    divider: mode === 'dark' ? '#3A3535' : '#E0D8D0',
  },
  components: {
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: '#E0D8D0',
          '&.Mui-active':    { color: '#FFE08D' },
          '&.Mui-completed': { color: '#FFE08D', '& path': { fill: '#171516' } },
        },
        text: { fill: '#171516', fontWeight: 700 },
      },
    },
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        'html, body': { margin: 0, padding: 0, overflowX: 'hidden' },
        '#root': { margin: 0, padding: 0 },
        'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active': {
          WebkitBoxShadow: `0 0 0px 1000px ${theme.palette.background.paper} inset !important`,
          WebkitTextFillColor: `${theme.palette.text.primary} !important`,
          caretColor: theme.palette.text.primary,
          transition: 'background-color 9999s ease-in-out 0s',
        },
      }),
    },
  },
});

const LegalGate = () => {
  const { needsLegalAcceptance, acceptLegal, logout, legalLoading, checkLegalStatus } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  setLegalRequiredHandler(checkLegalStatus);
  setToastHandler(showToast);

  const isExempt = location.pathname.startsWith('/about') ||
                   location.pathname.startsWith('/login') ||
                   location.pathname.startsWith('/register');

  const handleDecline = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <LegalAcceptanceModal
      open={needsLegalAcceptance && !isExempt}
      onAccept={acceptLegal}
      onDecline={handleDecline}
      loading={legalLoading}
    />
  );
};

function App() {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('colorMode');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const colorMode = useMemo(() => ({
    mode,
    toggleColorMode: () => {
      setMode((prev) => {
        const next = prev === 'light' ? 'dark' : 'light';
        localStorage.setItem('colorMode', next);
        return next;
      });
    },
  }), [mode]);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
          <AuthProvider>
            <Router>
              <LegalGate />
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={<RequestPasswordReset />} />
                  <Route path="/reset-password/:uid/:token" element={<ConfirmPasswordReset />} />
                  <Route path="/email-confirmation" element={<EmailConfirmation />} />
                  <Route path="/verify-email/:key" element={<VerifyEmail />} />
                  <Route
                    path="/dashboard"
                    element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                  />
                  <Route
                    path="/classify"
                    element={<ProtectedRoute><Classify /></ProtectedRoute>}
                  />
                  <Route
                    path="/stats"
                    element={<ProtectedRoute><Stats /></ProtectedRoute>}
                  />
                  <Route
                    path="/my-stats"
                    element={<ProtectedRoute><MyStats /></ProtectedRoute>}
                  />
                  <Route
                    path="/saved-abstracts"
                    element={<ProtectedRoute><MySavedAbstracts /></ProtectedRoute>}
                  />
                  <Route
                    path="/followed-debates"
                    element={<ProtectedRoute><MyFollowedDebates /></ProtectedRoute>}
                  />
                  <Route
                    path="/activity"
                    element={<ProtectedRoute><ActivityFeed /></ProtectedRoute>}
                  />
                  <Route
                    path="/debates"
                    element={<ProtectedRoute><Debates /></ProtectedRoute>}
                  />
                  <Route
                    path="/debates/:debateId"
                    element={<ProtectedRoute><DebateDetail /></ProtectedRoute>}
                  />
                  <Route
                    path="/abstracts/:abstractId"
                    element={<ProtectedRoute><AbstractDetail /></ProtectedRoute>}
                  />
                  <Route path="/about" element={<About />} />
                  <Route
                    path="/hall-of-fame"
                    element={<ProtectedRoute><HallOfFame /></ProtectedRoute>}
                  />
                  <Route
                    path="/challenges/:challengeId"
                    element={<ProtectedRoute><ChallengeDetail /></ProtectedRoute>}
                  />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
            </Router>
          </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
