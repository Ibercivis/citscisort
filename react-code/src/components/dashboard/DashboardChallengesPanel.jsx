import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Tooltip,
  Skeleton,
  Button,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  TrackChanges as ChallengeIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckCircleIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { TYPE_META } from '../../constants/challengeTypes';
import challengeService from '../../services/challengeService';

const fmt = (n) => (n ?? 0).toLocaleString();

const TABS = [
  { value: 'my',           label: 'My challenges' },
  { value: 'keyword',      label: 'Keywords' },
  { value: 'journal',      label: 'Journals' },
  { value: 'wos_category', label: 'WoS Categories' },
];

const ProgressBlock = ({ label, caption, pct, barColor }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.25 }}>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
      <Typography variant="caption" fontWeight="bold" noWrap>{caption}</Typography>
    </Box>
    <LinearProgress variant="determinate" value={pct}
      sx={{ height: 5, borderRadius: 3, bgcolor: 'action.disabledBackground',
        '& .MuiLinearProgress-bar': { borderRadius: 3, ...(barColor ? { bgcolor: barColor } : {}) } }} />
  </Box>
);

const ChallengeCard = ({ challenge, participating, busy, onJoin, onLeave, onClassify, onOpen }) => {
  const meta = TYPE_META[challenge.challenge_type] || TYPE_META.general;
  const Icon = meta.icon;
  const s = challenge.stats || {};
  const aPct = Math.round(s.progress_pct || 0);
  const cPct = Math.round(s.classifications_pct || 0);
  const completed = s.is_completed;

  const hasClf = s.classifications_target != null;
  const cDone = s.classifications_done ?? 0;
  const cLeft = hasClf ? Math.max(0, s.classifications_target - cDone) : null;

  return (
    <Paper elevation={0} sx={{
      p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
      display: 'flex', flexDirection: 'column', gap: 1,
      transition: 'border-color 0.15s ease',
      '&:hover': { borderColor: `${meta.color}.main` },
    }}>
      {/* Header */}
      <Box onClick={onOpen} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ bgcolor: `${meta.color}.main`, borderRadius: 1, p: 0.4, display: 'flex', flexShrink: 0 }}>
          <Icon sx={{ color: 'white', fontSize: 15 }} />
        </Box>
        <Typography variant="body2" fontWeight="bold" noWrap sx={{ flex: 1 }}>{challenge.title}</Typography>
        {completed && (
          <Chip label="Completed" size="small" color="success" variant="outlined"
            sx={{ height: 18, fontSize: '0.6rem', flexShrink: 0 }} />
        )}
        {participating && (
          <Tooltip title="Joined" placement="top">
            <CheckCircleIcon sx={{ fontSize: 15, color: 'success.main', flexShrink: 0 }} />
          </Tooltip>
        )}
      </Box>

      {/* Abstracts progress */}
      <ProgressBlock
        label="Abstracts"
        caption={`${fmt(s.completed_abstracts)}/${fmt(s.total_abstracts)}`}
        pct={aPct}
      />

      {/* Classifications progress (done · left) */}
      <ProgressBlock
        label="Classifications"
        caption={hasClf ? `${fmt(cDone)} done · ${fmt(cLeft)} left` : '—'}
        pct={cPct}
        barColor="success.main"
      />

      {s.my_contributions != null && (
        <Typography variant="caption" color="secondary.main" fontWeight="bold">
          You: {fmt(s.my_contributions)}
        </Typography>
      )}

      {/* Actions — identical regardless of tab */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 'auto', pt: 0.5 }}>
        {participating ? (
          <>
            <Button fullWidth size="small" variant="contained"
              startIcon={<PlayIcon sx={{ fontSize: 16 }} />}
              disabled={completed} onClick={onClassify}>
              {completed ? 'Completed' : 'Classify'}
            </Button>
            <Button fullWidth size="small" variant="outlined" color="inherit"
              disabled={busy} onClick={onLeave}>
              Leave challenge
            </Button>
          </>
        ) : (
          <Button fullWidth size="small" variant="text" color="primary"
            disabled={busy || completed} onClick={onJoin}>
            Join challenge
          </Button>
        )}
      </Box>
    </Paper>
  );
};

const DashboardChallengesPanel = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('my');
  const [data, setData] = useState(null); // null = loading
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState(null);

  // Lazy-load the active tab (refetch on tab change or forced reload)
  useEffect(() => {
    let active = true;
    setData(null);
    const req = tab === 'my' ? challengeService.my() : challengeService.list(tab);
    req
      .then((d) => { if (active) setData(Array.isArray(d) ? d : []); })
      .catch(() => { if (active) setData([]); });
    return () => { active = false; };
  }, [tab, reloadKey]);

  // Normalize: /my/ may return [{ id, challenge }] (nested) or [challenge] (flat).
  const rows = (data || [])
    .map((entry) => {
      if (tab === 'my') {
        const ch = entry?.challenge ?? entry;
        return ch ? { key: entry.id ?? ch.id, challenge: ch, participating: true } : null;
      }
      return { key: entry.id, challenge: entry, participating: entry.is_participating };
    })
    .filter(Boolean);

  // Keywords / Journals: biggest lenses first (by number of abstracts).
  if (tab !== 'my') {
    rows.sort((a, b) => (b.challenge.stats?.total_abstracts ?? 0) - (a.challenge.stats?.total_abstracts ?? 0));
  }

  const handleLeave = async (challenge) => {
    setBusyId(challenge.id);
    setData((cur) => {
      if (!cur) return cur;
      if (tab === 'my') return cur.filter((it) => (it?.challenge ?? it)?.id !== challenge.id);
      return cur.map((ch) => ch.id === challenge.id ? { ...ch, is_participating: false } : ch);
    });
    try {
      await challengeService.leave(challenge.id);
    } catch {
      setReloadKey((k) => k + 1); // revert (toast shown by interceptor)
    } finally {
      setBusyId(null);
    }
  };

  // Join takes you straight into classifying that challenge.
  const handleJoin = async (challenge) => {
    setBusyId(challenge.id);
    try {
      await challengeService.join(challenge.id);
      navigate(`/classify?challenge=${challenge.id}`);
    } catch {
      setBusyId(null); // toast shown by interceptor
    }
  };

  const emptyText = tab === 'my'
    ? "You haven't joined any challenges yet — join one from Keywords or Journals."
    : 'No challenges available here.';

  return (
    <Paper elevation={0} sx={{
      flex: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: { xs: 360, md: 0 },
    }}>
      <Box sx={{ px: 2, pt: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
        <ChallengeIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography variant="subtitle2" fontWeight="bold">Challenges</Typography>
        <Tooltip
          arrow
          placement="right"
          slotProps={{ tooltip: { sx: { maxWidth: 280 } } }}
          title={
            <Box sx={{ p: 0.25 }}>
              <Typography variant="caption" component="p" sx={{ mb: 0.75 }}>
                A challenge is a <strong>lens over the same article corpus</strong> — filtered by keyword, journal
                or WoS category (General = the whole corpus). No article is duplicated.
              </Typography>
              <Typography variant="caption" component="p">
                Classifying an article counts toward <strong>every</strong> challenge it belongs to.
                <strong> Join</strong> a challenge to classify within its own queue.
              </Typography>
            </Box>
          }
        >
          <HelpIcon sx={{ fontSize: 15, color: 'text.disabled', cursor: 'help' }} />
        </Tooltip>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
        sx={{ minHeight: 40, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
          '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontSize: '0.8rem', minWidth: 'auto' } }}>
        {TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {data === null ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={170} />)}
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{
            height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center', gap: 1, py: 4, px: 2,
          }}>
            <ChallengeIcon sx={{ fontSize: 36, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">{emptyText}</Typography>
          </Box>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(210px, 1fr))' },
            gap: 1.5,
          }}>
            {rows.map(({ key, challenge, participating }) => (
              <ChallengeCard
                key={key}
                challenge={challenge}
                participating={participating}
                busy={busyId === challenge.id}
                onJoin={() => handleJoin(challenge)}
                onLeave={() => handleLeave(challenge)}
                onClassify={() => navigate(`/classify?challenge=${challenge.id}`)}
                onOpen={() => navigate(`/challenges/${challenge.id}`)}
              />
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default DashboardChallengesPanel;
