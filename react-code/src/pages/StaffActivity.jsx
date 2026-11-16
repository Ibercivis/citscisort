import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, CssBaseline,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import SideMenu from '../components/dashboard/SideMenu';
import { useAuth } from '../context/AuthContext';
import ActivityChart from '../components/ActivityChart';
import {
  ClassificationsPerDayChart, SignupsPerDayChart, UsersTotalChart,
  ProgressHistogram, ProgressSummary, FunnelChart, EmailSendsTable,
} from '../components/StaffCharts';
import staffService from '../services/staffService';

const RANGES = [
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
  { days: 60, label: '60 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: 'Last year' },
];

const Section = ({ title, subtitle, children }) => (
  <Paper variant="outlined" sx={{ maxWidth: 900, mb: 2, p: 2, pb: 1.5 }}>
    <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
    {subtitle && <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>{subtitle}</Typography>}
    {children}
  </Paper>
);

const StaffActivity = () => {
  const { isStaff, loading: authLoading } = useAuth();
  const [days, setDays] = useState(60);
  const [data, setData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([staffService.getDailyActivity(days), staffService.getOverview(days)])
      .then(([d, o]) => { if (!cancelled) { setData(d); setOverview(o); } })
      .catch(() => { if (!cancelled) setError('Could not load the activity data.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days, isStaff]);

  if (!authLoading && !isStaff) return <Navigate to="/dashboard" replace />;

  // Only sends inside the visible range get a marker on the charts.
  const firstDay = overview?.series?.[0]?.date;
  const sendsInRange = (overview?.email_sends || []).filter((s) => firstDay && s.date >= firstDay);

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <Box
          component="main"
          sx={{
            flexGrow: 1, minWidth: 0,
            height: { xs: 'auto', md: '100vh' }, minHeight: { xs: '100vh', md: 'unset' },
            overflow: 'auto', p: 3, pt: { xs: 7, md: 3 }, boxSizing: 'border-box',
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" fontWeight="bold">Daily activity</Typography>
            <Typography variant="body2" color="text.secondary">
              Staff only. People who used the platform each day
              {data?.timezone ? ` (${data.timezone})` : ''}. Filled chips also classified that day (number = classifications).
            </Typography>
          </Box>

          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <ToggleButtonGroup size="small" exclusive value={days} onChange={(_, v) => v && setDays(v)}>
              {RANGES.map((r) => <ToggleButton key={r.days} value={r.days}>{r.label}</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>

          {data && (
            <Alert severity="info" sx={{ mb: 2, maxWidth: 900 }}>
              {data.tracking_since
                ? `Logging started on ${data.tracking_since}. Days before that have no data (they show 0), which does not mean nobody came.`
                : 'Logging has just started; no data yet.'}
            </Alert>
          )}

          {loading && <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}
          {error && <Alert severity="error" sx={{ maxWidth: 900 }}>{error}</Alert>}

          {!loading && !error && data && overview && (
            <>
              <Section title="Work remaining" subtitle="Regular abstracts (gold standard excluded) that still need classifications.">
                <ProgressSummary progress={overview.progress} />
                <Typography variant="caption" color="text.secondary">Abstracts by number of classifications received</Typography>
                <ProgressHistogram histogram={overview.progress.histogram} required={5} />
              </Section>

              <Section title="Classifications per day" subtitle="Valid, non-training classifications. Dashed lines mark the days we sent emails (number = emails sent).">
                <ClassificationsPerDayChart series={overview.series} sends={sendsInRange} />
              </Section>

              <Section title="People active per day" subtitle="Hover a bar to see who was here. Classified = also did at least one task that day.">
                <ActivityChart results={data.results} sends={sendsInRange} />
              </Section>

              <Section
                title="Emails sent and what happened after"
                subtitle="What the recipients of each send did in the 7 days before and after it (the send day counts as 'after'). There is no control group, so this shows what happened, not what the email caused."
              >
                <EmailSendsTable sends={overview.email_sends} trackingSince={overview.activity_tracking_since} />
              </Section>

              <Section title="New registrations per day">
                <SignupsPerDayChart series={overview.series} />
              </Section>

              <Section title="Registered users (total)">
                <UsersTotalChart series={overview.series} />
              </Section>

              <Section title="Activation funnel" subtitle="All time. How far registered people get.">
                <FunnelChart funnel={overview.funnel} />
              </Section>
            </>
          )}
        </Box>
      </Box>
    </>
  );
};

export default StaffActivity;
