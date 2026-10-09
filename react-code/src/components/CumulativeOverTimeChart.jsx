import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '@mui/material';

const CumulativeOverTimeChart = ({ data }) => {
  const theme = useTheme();

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    classifications: item.classifications,
    completed_abstracts: item.completed_abstracts,
    fullDate: item.date,
  }));

  const color1 = theme.palette.primary.main;
  const color2 = theme.palette.success.main;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: theme.palette.background.paper,
          padding: '10px',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '4px',
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: theme.palette.text.primary }}>
            {new Date(payload[0].payload.fullDate).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p style={{ margin: '4px 0 0 0', color: color1 }}>
            Classifications: {payload[0].value}
          </p>
          <p style={{ margin: '4px 0 0 0', color: color2 }}>
            Completed Abstracts: {payload[1].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis
          dataKey="date"
          angle={-45}
          textAnchor="end"
          height={80}
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
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value) => {
            const label = value === 'classifications' ? 'Classifications' : 'Completed Abstracts';
            return <span style={{ color: theme.palette.text.primary }}>{label}</span>;
          }}
        />
        <Line
          type="monotone"
          dataKey="classifications"
          stroke={color1}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="completed_abstracts"
          stroke={color2}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default CumulativeOverTimeChart;
