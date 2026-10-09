import { Box, Typography, Tooltip } from '@mui/material';

const TopJournalsChart = ({ data }) => {
  const chartData = Object.entries(data)
    .map(([journal, count]) => ({ journal, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxCount = chartData[0]?.count || 1;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {chartData.map(({ journal, count }, i) => {
        const pct = (count / maxCount) * 100;
        return (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Name */}
            <Tooltip title={journal} placement="top-start" arrow>
              <Typography
                variant="caption"
                noWrap
                sx={{ width: 160, flexShrink: 0, color: 'text.secondary', cursor: 'default' }}
              >
                {journal}
              </Typography>
            </Tooltip>

            {/* Bar + count */}
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  height: 24,
                  width: `${pct}%`,
                  minWidth: 4,
                  bgcolor: 'secondary.main',
                  borderRadius: '0 4px 4px 0',
                  transition: 'width 0.4s ease',
                }}
              />
              <Typography variant="caption" fontWeight="bold" color="text.primary">
                {count}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default TopJournalsChart;
