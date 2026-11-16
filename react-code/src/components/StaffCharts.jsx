import {
  BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Box, Typography, LinearProgress, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
} from '@mui/material';
import { fmtDay, sendMarkers } from './chartHelpers';


const useChartStyle = () => {
  const theme = useTheme();
  const axis = {
    tick: { fill: theme.palette.text.secondary, fontSize: 12 },
    axisLine: { stroke: theme.palette.divider },
    tickLine: false,
  };
  const tooltipBox = {
    backgroundColor: theme.palette.background.paper,
    padding: '8px 10px',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 4,
    color: theme.palette.text.primary,
    fontSize: 13,
  };
  const gap = { stroke: theme.palette.background.paper, strokeWidth: 2 };
  return { theme, axis, tooltipBox, gap };
};

const labelInterval = (n) => (n > 180 ? 29 : n > 45 ? 6 : n > 20 ? 2 : 0);

const Grid = ({ theme }) => (
  <CartesianGrid vertical={false} stroke={theme.palette.divider} strokeOpacity={0.6} />
);

// Classifications per day (bars) + 7-day trailing average (line). One axis.
export const ClassificationsPerDayChart = ({ series, sends }) => {
  const { theme, axis, tooltipBox, gap } = useChartStyle();
  const data = series.map((d, i) => {
    const win = series.slice(Math.max(0, i - 6), i + 1);
    return {
      date: d.date,
      label: fmtDay(d.date),
      classifications: d.classifications,
      avg7: Math.round((win.reduce((s, x) => s + x.classifications, 0) / win.length) * 10) / 10,
    };
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
        <Grid theme={theme} />
        <XAxis dataKey="label" interval={labelInterval(data.length)} {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip
          cursor={{ fill: theme.palette.action.hover }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload;
            return (
              <div style={tooltipBox}>
                <b>{fmtDay(r.date, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
                <div>{r.classifications} classifications</div>
                <div style={{ color: theme.palette.text.secondary }}>7-day average: {r.avg7}</div>
              </div>
            );
          }}
        />
        <Legend verticalAlign="top" height={32} formatter={(v) => (
          <span style={{ color: theme.palette.text.primary }}>{v === 'classifications' ? 'Classifications' : '7-day average'}</span>
        )} />
        <Bar dataKey="classifications" fill={theme.palette.primary.main} {...gap} maxBarSize={22} radius={[3, 3, 0, 0]} />
        <Line dataKey="avg7" type="monotone" stroke={theme.palette.secondary.main} strokeWidth={2} dot={false} />
        {sendMarkers(sends, theme)}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// New registrations per day (bars).
export const SignupsPerDayChart = ({ series }) => {
  const { theme, axis, tooltipBox, gap } = useChartStyle();
  const data = series.map((d) => ({ date: d.date, label: fmtDay(d.date), signups: d.signups }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <Grid theme={theme} />
        <XAxis dataKey="label" interval={labelInterval(data.length)} {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip
          cursor={{ fill: theme.palette.action.hover }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload;
            return (
              <div style={tooltipBox}>
                <b>{fmtDay(r.date, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
                <div>{r.signups} new {r.signups === 1 ? 'registration' : 'registrations'}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="signups" fill={theme.palette.primary.main} {...gap} maxBarSize={22} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Total registered users over time (line, its own axis — never combined with the bars above).
export const UsersTotalChart = ({ series }) => {
  const { theme, axis, tooltipBox } = useChartStyle();
  const data = series.map((d) => ({ date: d.date, label: fmtDay(d.date), users_total: d.users_total }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <Grid theme={theme} />
        <XAxis dataKey="label" interval={labelInterval(data.length)} {...axis} />
        <YAxis allowDecimals={false} domain={['dataMin - 2', 'dataMax + 2']} {...axis} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload;
            return (
              <div style={tooltipBox}>
                <b>{fmtDay(r.date, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
                <div>{r.users_total} registered users</div>
              </div>
            );
          }}
        />
        <Line dataKey="users_total" type="monotone" stroke={theme.palette.primary.main} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Abstracts by number of classifications received (columns).
export const ProgressHistogram = ({ histogram, required }) => {
  const { theme, axis, tooltipBox, gap } = useChartStyle();
  const data = histogram.map((h) => ({
    label: h.classifications >= required ? `${required}+ (done)` : String(h.classifications),
    abstracts: h.abstracts,
  })).filter((_, i) => i <= required);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <Grid theme={theme} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} />
        <Tooltip
          cursor={{ fill: theme.palette.action.hover }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload;
            return (
              <div style={tooltipBox}>
                <b>{r.abstracts.toLocaleString()}</b> abstracts with {r.label} classifications
              </div>
            );
          }}
        />
        <Bar dataKey="abstracts" fill={theme.palette.primary.main} {...gap} maxBarSize={56} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Headline numbers + overall progress bar.
export const ProgressSummary = ({ progress }) => {
  const done = progress.classifications_required - progress.classifications_remaining;
  const pct = progress.classifications_required
    ? (done / progress.classifications_required) * 100 : 0;
  const eta = progress.eta_days == null ? 'no recent activity'
    : progress.eta_days > 730 ? `~${(progress.eta_days / 365).toFixed(1)} years`
    : progress.eta_days > 60 ? `~${Math.round(progress.eta_days / 30)} months`
    : `~${progress.eta_days} days`;
  const Tile = ({ label, value, hint }) => (
    <Box sx={{ minWidth: 150 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight="bold" sx={{ lineHeight: 1.2 }}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Box>
  );
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 1.5 }}>
        <Tile label="Classifications remaining" value={progress.classifications_remaining.toLocaleString()}
          hint={`of ${progress.classifications_required.toLocaleString()} needed`} />
        <Tile label="Abstracts not finished" value={progress.abstracts_remaining.toLocaleString()}
          hint={`of ${progress.abstracts_total.toLocaleString()}`} />
        <Tile label="Current pace" value={`${progress.pace_per_day}/day`} hint={`average of the last ${progress.pace_window_days} days`} />
        <Tile label="Estimated time left" value={eta} hint={`at the ${progress.pace_window_days}-day pace`} />
      </Box>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 10, borderRadius: 1 }} />
      <Typography variant="caption" color="text.secondary">{pct.toFixed(1)}% of required classifications done</Typography>
    </Box>
  );
};

// Activation funnel as columns (vertical), with % of registered in the tooltip.
export const FunnelChart = ({ funnel }) => {
  const { theme, axis, tooltipBox, gap } = useChartStyle();
  const base = funnel[0]?.users || 1;
  const data = funnel.map((f) => ({ ...f, pct: Math.round((f.users / base) * 100) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <Grid theme={theme} />
        <XAxis dataKey="step" {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip
          cursor={{ fill: theme.palette.action.hover }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload;
            return (
              <div style={tooltipBox}>
                <b>{r.step}</b>
                <div>{r.users} people ({r.pct}% of registered)</div>
              </div>
            );
          }}
        />
        <Bar dataKey="users" fill={theme.palette.primary.main} {...gap} maxBarSize={64} radius={[3, 3, 0, 0]}
          label={{ position: 'top', fill: theme.palette.text.primary, fontSize: 12 }} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Each batch of emails and what its recipients did in the 7 days before / after.
export const EmailSendsTable = ({ sends, trackingSince }) => {
  if (!sends?.length) {
    return <Typography variant="body2" color="text.secondary">No emails sent yet.</Typography>;
  }
  const rows = [...sends].reverse();
  const pct = (n, total) => (total ? ` (${Math.round((n / total) * 100)}%)` : '');
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Sent on</TableCell>
            <TableCell>Email</TableCell>
            <TableCell align="right">Recipients</TableCell>
            <TableCell align="right">Classified, 7 days before</TableCell>
            <TableCell align="right">Classified, 7 days after</TableCell>
            <TableCell align="right">Classifications before / after</TableCell>
            <TableCell align="right">Opened the app after</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((s) => {
            const tracked = trackingSince && s.date >= trackingSince;
            return (
              <TableRow key={`${s.kind}-${s.date}-${s.label}`}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDay(s.date, { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                <TableCell>
                  {s.kind === 'newsletter' ? `Newsletter: ${s.label}` : s.label}
                  {!s.window_complete && (
                    <Typography variant="caption" color="text.secondary" component="div">
                      day {s.days_elapsed} of {s.window_days}, still counting
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">{s.sent}</TableCell>
                <TableCell align="right">{s.classified_before}{pct(s.classified_before, s.sent)}</TableCell>
                <TableCell align="right">{s.classified_after}{pct(s.classified_after, s.sent)}</TableCell>
                <TableCell align="right">{s.classifications_before} / {s.classifications_after}</TableCell>
                <TableCell align="right">{tracked ? `${s.active_after}${pct(s.active_after, s.sent)}` : 'not tracked yet'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
