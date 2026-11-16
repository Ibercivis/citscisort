import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { sendMarkers } from './chartHelpers';
import { useTheme } from '@mui/material';

const MAX_NAMES = 8;

// Stacked bars on ONE axis (people per day): classified + visited only = active people.
const ActivityChart = ({ results, sends }) => {
  const theme = useTheme();
  const classifiedColor = theme.palette.primary.main;
  const visitedColor = theme.palette.secondary.main;

  const data = results.map((d) => {
    const classified = d.users.filter((u) => u.classifications > 0).length;
    return {
      date: d.date,
      label: new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      classified,
      visited: d.active_count - classified,
      total: d.active_count,
      users: d.users,
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const shown = row.users.slice(0, MAX_NAMES);
    return (
      <div style={{
        backgroundColor: theme.palette.background.paper,
        padding: '10px 12px',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 4,
        color: theme.palette.text.primary,
        maxWidth: 260,
      }}>
        <div style={{ fontWeight: 'bold' }}>
          {new Date(`${row.date}T12:00:00`).toLocaleDateString(undefined, {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </div>
        <div style={{ marginTop: 4 }}>{row.total} active · {row.classified} classified · {row.visited} visited only</div>
        {shown.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: theme.palette.text.secondary }}>
            {shown.map((u) => u.name).join(', ')}
            {row.users.length > MAX_NAMES ? ` +${row.users.length - MAX_NAMES} more` : ''}
          </div>
        )}
      </div>
    );
  };

  const axis = {
    tick: { fill: theme.palette.text.secondary, fontSize: 12 },
    axisLine: { stroke: theme.palette.divider },
    tickLine: false,
  };

  // Thin the x labels on long ranges so they never collide.
  const interval = data.length > 180 ? 29 : data.length > 45 ? 6 : data.length > 20 ? 2 : 0;
  const gap = { stroke: theme.palette.background.paper, strokeWidth: 2 };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={theme.palette.divider} strokeOpacity={0.6} />
        <XAxis dataKey="label" interval={interval} {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.palette.action.hover }} />
        <Legend
          verticalAlign="top"
          height={32}
          formatter={(v) => (
            <span style={{ color: theme.palette.text.primary }}>
              {v === 'classified' ? 'Classified' : 'Visited only'}
            </span>
          )}
        />
        <Bar dataKey="classified" stackId="a" fill={classifiedColor} {...gap} maxBarSize={22} />
        <Bar dataKey="visited" stackId="a" fill={visitedColor} {...gap} maxBarSize={22} radius={[3, 3, 0, 0]} />
        {sendMarkers(sends, theme)}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ActivityChart;
