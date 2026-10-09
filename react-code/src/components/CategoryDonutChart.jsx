import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTheme } from '@mui/material';

const COLORS = ['#1976d2', '#0097a7', '#f9a825', '#e64a19', '#8e24aa', '#388e3c'];
const COLORS_DARK = ['#90caf9', '#80deea', '#ffe082', '#ffab91', '#ce93d8', '#a5d6a7'];

const CategoryDonutChart = ({ data }) => {
  const theme = useTheme();
  const colors = theme.palette.mode === 'dark' ? COLORS_DARK : COLORS;

  const chartData = Object.entries(data).map(([category, info]) => ({
    name: category.replace(/_/g, ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    value: info.count,
    percentage: info.percentage,
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
          <p style={{ margin: 0, fontWeight: 'bold', color: theme.palette.text.primary }}>{payload[0].name}</p>
          <p style={{ margin: '4px 0 0 0', color: theme.palette.text.secondary }}>
            Count: {payload[0].value}
          </p>
          <p style={{ margin: '4px 0 0 0', color: theme.palette.text.secondary }}>
            Percentage: {payload[0].payload.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ percentage }) => `${percentage}%`}
          outerRadius={120}
          innerRadius={70}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span style={{ color: theme.palette.text.secondary }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryDonutChart;
