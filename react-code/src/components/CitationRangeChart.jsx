import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Box, useTheme } from '@mui/material';

const COLORS = ['#1976d2', '#42a5f5', '#64b5f6', '#90caf9', '#ffb74d', '#ff9800'];
const COLORS_DARK = ['#90caf9', '#64b5f6', '#42a5f5', '#bbdefb', '#ffe082', '#ffcc02'];

const CitationRangeChart = ({ data }) => {
  const theme = useTheme();
  const colors = theme.palette.mode === 'dark' ? COLORS_DARK : COLORS;

  const rangeOrder = ['0', '1-5', '6-10', '11-50', '51-100', '100+'];
  const chartData = rangeOrder
    .filter(range => data[range])
    .map(range => ({
      name: range === '0' ? 'No citations' : range === '100+' ? '100+ citations' : `${range} citations`,
      value: data[range],
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 1.5,
          boxShadow: 2,
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: theme.palette.text.primary }}>{payload[0].name}</p>
          <p style={{ margin: '4px 0 0 0', color: payload[0].fill }}>
            Papers: {payload[0].value}
          </p>
        </Box>
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
          label={({ value }) => `${value}`}
          outerRadius={100}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CitationRangeChart;
