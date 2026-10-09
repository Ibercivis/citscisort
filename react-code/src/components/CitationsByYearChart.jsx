import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Box, useTheme } from '@mui/material';

const CitationsByYearChart = ({ data }) => {
  const theme = useTheme();

  const chartData = Object.entries(data)
    .filter(([year]) => parseInt(year) > 1900)
    .map(([year, v]) => ({
      year,
      papers: v.count,
      avgCitations: parseFloat(v.average.toFixed(1)),
    }))
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));

  const barColor  = theme.palette.primary.main;
  const lineColor = theme.palette.warning.main;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <Box sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: 1, p: 1.5, boxShadow: 2,
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: theme.palette.text.primary }}>{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ margin: '4px 0 0', color: p.color }}>
            {p.name === 'papers' ? 'Papers: ' : 'Avg citations: '}{p.value}
          </p>
        ))}
      </Box>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis
          dataKey="year"
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
          axisLine={{ stroke: theme.palette.divider }}
          tickLine={false}
          interval={2}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ color: theme.palette.text.secondary, fontSize: 12, paddingTop: 8 }}
          formatter={(v) => v === 'papers' ? 'Papers published' : 'Avg citations'}
        />
        <Bar yAxisId="left" dataKey="papers" fill={barColor} opacity={0.8} radius={[2, 2, 0, 0]} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="avgCitations"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default CitationsByYearChart;
