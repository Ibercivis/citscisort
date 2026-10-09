import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Timer as TimerIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import statsService from '../services/statsService';

const MyStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await statsService.getMyStats();
      setStats(data);
    } catch (err) {
      setError('Error loading your statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === 0) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!stats?.overview) return null;

  const StatCard = ({ icon, title, value, subtitle, color = 'primary' }) => (
    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
      <Box display="flex" alignItems="center" mb={2}>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: 2,
            p: 1.5,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </Box>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            My Statistics
          </Typography>
          {stats.overview.is_gold_user && (
            <Chip
              icon={<TrophyIcon />}
              label="Gold User"
              color="warning"
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          Your classification activity and performance
        </Typography>
      </Box>

      {/* Main Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4, justifyContent: 'center' }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<TrendingUpIcon color="primary" />}
            title="Total Classifications"
            value={stats.overview.total_classifications}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<TrendingUpIcon color="success" />}
            title="Today"
            value={stats.overview.classifications_today}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<TimerIcon color="info" />}
            title="Average Time"
            value={formatTime(stats.overview.average_time_seconds)}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<SpeedIcon color="secondary" />}
            title="Fastest Time"
            value={formatTime(stats.overview.fastest_time_seconds)}
            color="secondary"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Recent Activity
            </Typography>
            <Grid container spacing={2}>
              <Grid size={4}>
                <Box>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {stats.overview.classifications_today}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Today
                  </Typography>
                </Box>
              </Grid>
              <Grid size={4}>
                <Box>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {stats.overview.classifications_this_week}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This Week
                  </Typography>
                </Box>
              </Grid>
              <Grid size={4}>
                <Box>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {stats.overview.classifications_this_month}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This Month
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* My Classifications */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              My Classifications
            </Typography>
            
            {Object.keys(stats.my_classifications.by_main_category).length > 0 ? (
              <>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                  By Category
                </Typography>
                {Object.entries(stats.my_classifications.by_main_category).map(([category, count]) => (
                  <Box key={category} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {category.replace(/_/g, ' ')}
                    </Typography>
                    <Chip label={count} size="small" />
                  </Box>
                ))}

                {Object.keys(stats.my_classifications.by_meta_aspect).length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Dimensions
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {Object.entries(stats.my_classifications.by_meta_aspect).map(([aspect, count]) => (
                        <Chip
                          key={aspect}
                          label={`${aspect.replace('meta_', '').replace(/_/g, ' ')}: ${count}`}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No classifications yet. Start classifying to see your stats!
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Community Comparison */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Community Comparison
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              {stats.comparison.note}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Your Total</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stats.comparison.my_total}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Community Average</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stats.comparison.community_average}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Community Median</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stats.comparison.community_median}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Your Percentile
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <LinearProgress
                    variant="determinate"
                    value={stats.comparison.my_percentile}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    {stats.comparison.my_percentile}%
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Average Time per Classification
              </Typography>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Your Time</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatTime(stats.comparison.my_average_time)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Community Average</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatTime(stats.comparison.community_average_time)}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Activity Timeline - Last 7 Days */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Activity Timeline (Last 7 Days)
            </Typography>
            {stats.activity_timeline.last_7_days.map((day) => (
              <Box key={day.date} sx={{ mb: 1 }}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {day.count}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={day.count > 0 ? Math.min((day.count / Math.max(...stats.activity_timeline.last_7_days.map(d => d.count))) * 100, 100) : 0}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MyStats;
