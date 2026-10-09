import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '@mui/material';

const COLORS = ['#1976d2', '#0097a7', '#f9a825', '#e64a19', '#8e24aa', '#388e3c', '#d81b60', '#f57f17'];
const COLORS_DARK = ['#90caf9', '#80deea', '#ffe082', '#ffab91', '#ce93d8', '#a5d6a7', '#f48fb1', '#ffcc02'];

const MetaAspectsChart = ({ data }) => {
  const theme = useTheme();
  const colors = theme.palette.mode === 'dark' ? COLORS_DARK : COLORS;

  const chartData = Object.entries(data).map(([aspect, count]) => ({
    name: aspect.replace('meta_', '').replace(/_/g, ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    count,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: theme.palette.background.paper,
          padding: '10px',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '4px',
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: theme.palette.text.primary }}>{payload[0].payload.name}</p>
          <p style={{ margin: '4px 0 0 0', color: theme.palette.text.secondary }}>
            Count: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={100}
          interval={0}
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          axisLine={{ stroke: theme.palette.divider }}
          tickLine={{ stroke: theme.palette.divider }}
        />
        <YAxis
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          axisLine={{ stroke: theme.palette.divider }}
          tickLine={{ stroke: theme.palette.divider }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MetaAspectsChart;
