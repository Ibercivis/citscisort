import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  LinearProgress,
  CircularProgress,
  Avatar,
  Divider,
  Link,
  CssBaseline,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import SideMenu from '../components/dashboard/SideMenu';
import challengeService from '../services/challengeService';
import { TYPE_META } from '../constants/challengeTypes';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const fmt = (n) => (n ?? 0).toLocaleString();

const StatTile = ({ label, value, color }) => (
  <Box sx={{ flex: 1, minWidth: 90 }}>
    <Typography variant="h5" fontWeight="bold" color={color || 'text.primary'}>{value}</Typography>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
  </Box>
);

const ChallengeDetail = () => {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, lb] = await Promise.all([
        challengeService.get(challengeId),
        challengeService.leaderboard(challengeId, 10).catch(() => null),
      ]);
      setChallenge(c);
      setBoard(lb);
    } catch {
      setError('Could not load this challenge.');
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => { load(); }, [load]);

  // Join takes you straight into classifying that challenge.
  const handleJoin = async () => {
    if (!challenge) return;
    setBusy(true);
    try {
      await challengeService.join(challenge.id);
      navigate(`/classify?challenge=${challenge.id}`);
    } catch {
      setBusy(false); // toast shown by interceptor
    }
  };

  const handleLeave = async () => {
    if (!challenge) return;
    setBusy(true);
    setChallenge((c) => ({ ...c, is_participating: false }));
    try {
      await challengeService.leave(challenge.id);
    } catch {
      setChallenge((c) => ({ ...c, is_participating: true }));
    } finally {
      setBusy(false);
    }
  };

  const shell = (children) => (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <Box component="main" sx={{
          flexGrow: 1, minWidth: 0,
          height: { xs: 'auto', md: '100vh' }, minHeight: { xs: '100vh', md: 'unset' },
          overflow: 'auto', p: 3, pt: { xs: 7, md: 3 }, boxSizing: 'border-box',
        }}>
          {children}
        </Box>
      </Box>
    </>
  );

  if (loading) {
    return shell(
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !challenge) {
    return shell(
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>{error || 'Challenge not found.'}</Typography>
        <Button variant="outlined" size="small" onClick={load}>Retry</Button>
      </Box>
    );
  }

  const meta = TYPE_META[challenge.challenge_type] || TYPE_META.general;
  const Icon = meta.icon;
  const stats = challenge.stats || {};
  const pct = Math.round(stats.progress_pct || 0);
  const clfPct = Math.round(stats.classifications_pct || 0);
  const completed = stats.is_completed;
  const hasClf = stats.classifications_target != null;
  const clfLeft = hasClf ? Math.max(0, stats.classifications_target - (stats.classifications_done ?? 0)) : null;

  return shell(
    <Box sx={{ maxWidth: 820 }}>
      <Link component={RouterLink} to="/dashboard" underline="hover" variant="body2"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2, color: 'text.secondary' }}>
        <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to challenges
      </Link>

      {/* Header card */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ bgcolor: `${meta.color}.main`, borderRadius: 2, p: 1, display: 'flex' }}>
            <Icon sx={{ color: 'white', fontSize: 24 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight="bold">{challenge.title}</Typography>
            <Chip label={challenge.challenge_type_display || meta.label} size="small" variant="outlined" sx={{ mt: 0.5 }} />
          </Box>
          {completed && (
            <Chip label="Completed" color="success" icon={<CheckCircleIcon />} />
          )}
        </Box>

        {/* Abstracts progress (consensus) */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {fmt(stats.completed_abstracts)}/{fmt(stats.total_abstracts)} abstracts completed
          </Typography>
          <Typography variant="caption" fontWeight="bold">{pct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={pct}
          sx={{ height: 8, borderRadius: 4, mb: hasClf ? 1.5 : 2.5, bgcolor: 'action.disabledBackground',
            '& .MuiLinearProgress-bar': { borderRadius: 4 } }} />

        {/* Classifications progress (done · left) */}
        {hasClf && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {fmt(stats.classifications_done)} of {fmt(stats.classifications_target)} classifications · {fmt(clfLeft)} left
              </Typography>
              <Typography variant="caption" fontWeight="bold">{clfPct}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={clfPct}
              sx={{ height: 8, borderRadius: 4, mb: 2.5, bgcolor: 'action.disabledBackground',
                '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: 'success.main' } }} />
          </>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2.5 }}>
          <StatTile label="Abstracts left" value={fmt(stats.in_progress)} />
          {hasClf && (
            <StatTile label="Classifications left" value={fmt(clfLeft)} color="success.main" />
          )}
          {stats.my_contributions != null && (
            <StatTile label="Your classifications" value={fmt(stats.my_contributions)} color="secondary.main" />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {challenge.is_participating ? (
            <Button variant="outlined" color="inherit" disabled={busy} onClick={handleLeave}>
              Leave challenge
            </Button>
          ) : (
            <Button variant="text" color="primary" disabled={busy} onClick={handleJoin}>
              Join challenge
            </Button>
          )}
        </Box>
      </Paper>

      {/* Leaderboard */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TrophyIcon sx={{ color: 'warning.main', fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight="bold">Leaderboard</Typography>
          {board?.my_position != null && (
            <Chip size="small" variant="outlined" color="primary" sx={{ ml: 'auto' }}
              label={`You: #${board.my_position} · ${board.my_classifications ?? 0}`} />
          )}
        </Box>

        {!board?.results?.length ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No classifications yet — be the first on the board!
            </Typography>
          </Box>
        ) : (
          board.results.map((row) => {
            const isMe = board.my_position != null && row.rank === board.my_position;
            return (
              <Box key={row.rank} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
                borderBottom: '1px solid', borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
                bgcolor: isMe ? 'action.selected' : 'transparent',
              }}>
                <Typography variant="body2" fontWeight="bold" sx={{ width: 32, textAlign: 'center' }}>
                  {MEDAL[row.rank] || `#${row.rank}`}
                </Typography>
                <Avatar sx={{
                  width: 32, height: 32, fontSize: '0.8rem',
                  bgcolor: row.is_anonymous ? 'action.disabledBackground' : 'primary.main',
                  color: row.is_anonymous ? 'text.disabled' : 'white',
                }}>
                  {row.is_anonymous ? '?' : (row.display_name || '?')[0].toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap
                    color={row.is_anonymous ? 'text.secondary' : 'text.primary'}
                    fontWeight={isMe ? 'bold' : 'normal'}>
                    {row.display_name}{isMe && ' (you)'}
                  </Typography>
                  {row.institution && (
                    <Typography variant="caption" color="text.secondary" noWrap>{row.institution}</Typography>
                  )}
                </Box>
                <Chip size="small" variant="outlined" label={`${row.classifications}`} />
              </Box>
            );
          })
        )}
      </Paper>
    </Box>
  );
};

export default ChallengeDetail;
