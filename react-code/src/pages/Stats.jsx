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
  LinearProgress,
  Chip,
  CssBaseline,
  alpha,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import KeywordCloud from '../components/KeywordCloud';
import PapersByYearChart from '../components/PapersByYearChart';
import CitationsByYearChart from '../components/CitationsByYearChart';
import CitationRangeChart from '../components/CitationRangeChart';
import TopJournalsChart from '../components/TopJournalsChart';
import CategoryDonutChart from '../components/CategoryDonutChart';
import MetaAspectsChart from '../components/MetaAspectsChart';
import CumulativeOverTimeChart from '../components/CumulativeOverTimeChart';
import WosCategoriesChart from '../components/WosCategoriesChart';
import SideMenu from '../components/dashboard/SideMenu';
import statsService from '../services/statsService';

const filterBadYears = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([y]) => parseInt(y) > 1900));

const Stats = () => {
  const [stats, setStats] = useState(null);
  const [abstractStats, setAbstractStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [overviewData, abstractData] = await Promise.all([
        statsService.getOverview(),
        statsService.getAbstractStats()
      ]);
      setStats(overviewData);
      setAbstractStats(abstractData);
    } catch (err) {
      setError('Error loading statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <CssBaseline />
        <Box sx={{ display: 'flex' }}>
          <SideMenu />
          <Box
            component="main"
            sx={{
              flexGrow: 1, minWidth: 0,
              mt: 0,
              p: 3,
            }}
          >
            <Container maxWidth="lg" sx={{ mt: 4 }}>
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
              </Box>
            </Container>
          </Box>
        </Box>
      </>
    );
  }

  if (error) {
    return (
      <>
        <CssBaseline />
        <Box sx={{ display: 'flex' }}>
          <SideMenu />
          <Box
            component="main"
            sx={{
              flexGrow: 1, minWidth: 0,
              mt: 0,
              p: 3,
            }}
          >
            <Container maxWidth="lg" sx={{ mt: 4 }}>
              <Alert severity="error">{error}</Alert>
            </Container>
          </Box>
        </Box>
      </>
    );
  }

  if (!stats) return null;

  const StatCard = ({ icon, title, value, subtitle, color = 'primary', completedValue, percentage }) => (
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
        <Box flex={1}>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </Box>
      {completedValue !== undefined && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body1" fontWeight="medium" color="success.main">
                {completedValue} completed
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="success.main">
                {percentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{ height: 8, borderRadius: 4 }}
              color="success"
            />
          </Box>
        </>
      )}
      {subtitle && !completedValue && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <Box
          component="main"
          sx={{
            flexGrow: 1, minWidth: 0,
            mt: 0,
            p: 3,
          }}
        >
          <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* PROJECT STATISTICS SECTION */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold">Project Statistics</Typography>
                <Typography variant="body2" color="text.secondary">Overview of classification progress and activity</Typography>
              </Box>
            </Box>

      <Grid container spacing={3} sx={{ mb: 6 }}>
        {/* Total Abstracts */}
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <Box sx={{ width: '100%' }}>
            <StatCard
              icon={<AssessmentIcon color="primary" />}
              title="Total Abstracts"
              value={stats.project.total_abstracts}
              completedValue={stats.project.completed_abstracts}
              percentage={stats.project.abstracts_percentage}
              color="primary"
            />
          </Box>
        </Grid>

        {/* Total Classifications */}
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <Box sx={{ width: '100%' }}>
            <StatCard
              icon={<TrendingUpIcon color="info" />}
              title="Total Classifications"
              value={stats.project.total_classifications_needed}
              completedValue={stats.project.completed_classifications}
              percentage={stats.project.classifications_percentage}
              color="info"
            />
          </Box>
        </Grid>

        {/* Cumulative Progress Over Time */}
        <Grid size={12} sx={{ display: 'flex' }}>
          <Paper elevation={2} sx={{ p: 3, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight="bold">
              Cumulative Progress Over Time
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
              Total classifications submitted by the community day by day. The steeper the curve, the faster the project is advancing.
            </Typography>
            {stats.progress.cumulative_over_time && stats.progress.cumulative_over_time.length > 0 ? (
              <CumulativeOverTimeChart data={stats.progress.cumulative_over_time} />
            ) : (
              <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No cumulative data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Abstracts by Classification Count */}
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <Paper elevation={2} sx={{ p: 3, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight="bold">
              Abstracts by Classification Count
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
              How many abstracts have received N independent classifications. Each abstract needs multiple votes to reach a reliable consensus.
            </Typography>
            {Object.entries(stats.progress.abstracts_by_classification_count).map(([count, abstracts]) => (
              abstracts > 0 && (
                <Box key={count} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {count} classification{count !== '1' ? 's' : ''}
                  </Typography>
                  <Chip label={abstracts} size="small" />
                </Box>
              )
            ))}
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                Avg. classifications per abstract:{' '}
                <strong>{stats.progress.average_classifications_per_abstract.toFixed(1)}</strong>
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <Paper elevation={2} sx={{ p: 3, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight="bold">
              Recent Activity
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
              Community participation in the last 24 hours and 7 days.
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Box>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {stats.activity.active_today}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Today
                  </Typography>
                </Box>
              </Grid>
              <Grid size={6}>
                <Box>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {stats.activity.active_this_week}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active This Week
                  </Typography>
                </Box>
              </Grid>
              <Grid size={6}>
                <Box>
                  <Typography variant="h5" color="success.main" fontWeight="bold">
                    {stats.activity.classifications_today}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Classifications Today
                  </Typography>
                </Box>
              </Grid>
              <Grid size={6}>
                <Box>
                  <Typography variant="h5" color="success.main" fontWeight="bold">
                    {stats.activity.classifications_this_week}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This Week
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Category Distribution */}
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <Paper elevation={2} sx={{ p: 3, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight="bold">
              Category Distribution
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
              How the community is distributing abstracts across main categories based on all classifications submitted so far.
            </Typography>
            {stats.distribution.by_main_category && Object.keys(stats.distribution.by_main_category).length > 0 ? (
              <CategoryDonutChart data={stats.distribution.by_main_category} />
            ) : (
              <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Dimensions */}
        {Object.keys(stats.distribution.by_meta_aspect).length > 0 && (
          <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
            <Paper elevation={2} sx={{ p: 3, width: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight="bold">
                Dimensions
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                Which dimensions (methods, validation, ethics…) appear most often in abstracts classified as Findings about Citizen Science.
              </Typography>
              <MetaAspectsChart data={stats.distribution.by_meta_aspect} />
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* ABSTRACT STATISTICS SECTION */}
      {abstractStats && (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Abstract Statistics
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Detailed insights from abstract metadata
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Single Column */}
            <Grid size={12}>
              {/* Overview */}
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Overview
                </Typography>
                <Box display="flex" flexDirection="column" gap={1.5}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Total Abstracts
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {abstractStats.overview.total_abstracts}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      With Citations
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {abstractStats.overview.with_citations}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      With Keywords
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {abstractStats.overview.with_keywords}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      With WoS Categories
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {abstractStats.overview.with_wos_categories}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      With Research Areas
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {abstractStats.overview.with_research_areas}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Citation Statistics */}
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Citation Statistics
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Citation counts (times cited) for papers in the dataset. Highly cited papers tend to be more influential within the field.
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Average
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {abstractStats.citation_stats.average}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Max
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {abstractStats.citation_stats.max}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Min
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {abstractStats.citation_stats.min}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  By Range
                </Typography>
                {Object.entries(abstractStats.by_citation_range).map(([range, count]) => (
                  <Box key={range} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      {range} citations
                    </Typography>
                    <Chip label={typeof count === 'object' ? count.count : count} size="small" />
                  </Box>
                ))}
              </Paper>

              {/* Papers by Year */}
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">Papers by Year</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Number of citizen science papers published each year in the dataset.
                </Typography>
                {abstractStats.by_year ? (
                  <PapersByYearChart data={filterBadYears(abstractStats.by_year)} />
                ) : (
                  <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No data available</Typography>
                  </Box>
                )}
              </Paper>

              {/* Citations & papers over time */}
              {abstractStats.citations_by_year && (
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">Papers & Average Citations by Year</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Bars show papers published each year; the line shows average citations received. Older papers accumulate more citations over time.
                  </Typography>
                  <CitationsByYearChart data={filterBadYears(abstractStats.citations_by_year)} />
                </Paper>
              )}

              {/* WoS Categories */}
              {abstractStats.by_wos_category && Object.keys(abstractStats.by_wos_category).length > 0 && (
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">Top 15 WoS Categories</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Web of Science subject categories most represented in the dataset.
                  </Typography>
                  <WosCategoriesChart data={abstractStats.by_wos_category} topN={15} />
                </Paper>
              )}

              {/* Research Areas */}
              {abstractStats.by_research_area && Object.keys(abstractStats.by_research_area).length > 0 && (
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">Top 15 Research Areas</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Broader research areas grouping the WoS categories above.
                  </Typography>
                  <WosCategoriesChart data={abstractStats.by_research_area} topN={15} />
                </Paper>
              )}

              {/* Keywords Cloud */}
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">Keywords Cloud</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Most frequent keywords from abstract metadata. Larger words appear in more papers.
                </Typography>
                <Box sx={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 1, p: 2 }}>
                  <KeywordCloud keywords={abstractStats.by_keyword} />
                </Box>
              </Paper>

              {/* Top Journals */}
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold">Top 20 Journals</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Journals with the most papers in the dataset.
                </Typography>
                {abstractStats.by_journal ? (
                  <TopJournalsChart data={abstractStats.by_journal} />
                ) : (
                  <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No data available</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
          </Container>
        </Box>
      </Box>
    </>
  );
};

export default Stats;
