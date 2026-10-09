import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Box, useTheme } from '@mui/material';

const WosCategoriesChart = ({ data, topN = 15 }) => {
  const theme = useTheme();

  const chartData = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({ name, count }))
    .reverse();

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <Box sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: 1, p: 1.5, boxShadow: 2, maxWidth: 220,
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: theme.palette.text.primary, fontSize: 12 }}>
          {payload[0].payload.name}
        </p>
        <p style={{ margin: '4px 0 0', color: theme.palette.primary.main }}>
          {payload[0].value} papers
        </p>
      </Box>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={topN * 28 + 20}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={200}
          tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.palette.action.hover }} />
        <Bar dataKey="count" fill={theme.palette.primary.main} opacity={0.85} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WosCategoriesChart;
