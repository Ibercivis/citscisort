import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
  Button,
  Skeleton,
  CssBaseline,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  WorkspacePremium as MedalIcon,
} from '@mui/icons-material';
import SideMenu from '../components/dashboard/SideMenu';
import hallOfFameService from '../services/hallOfFameService';

const PAGE_SIZE = 20;

const MEDAL = {
  1: { emoji: '🥇', bg: '#FFD70018' },
  2: { emoji: '🥈', bg: '#C0C0C018' },
  3: { emoji: '🥉', bg: '#CD7F3218' },
};

const COUNTRY_FLAG = (code) =>
  code
    ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : null;

const RankDisplay = ({ rank }) =>
  MEDAL[rank] ? (
    <Typography variant="h5" sx={{ width: 36, textAlign: 'center', lineHeight: 1 }}>
      {MEDAL[rank].emoji}
    </Typography>
  ) : (
    <Typography variant="body2" color="text.secondary" fontWeight="bold"
      sx={{ width: 36, textAlign: 'center' }}>
      #{rank}
    </Typography>
  );

const RowSkeleton = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5 }}>
    <Skeleton variant="text" width={36} height={24} />
    <Skeleton variant="circular" width={40} height={40} />
    <Box sx={{ flex: 1 }}>
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="text" width="25%" />
    </Box>
    <Skeleton variant="rounded" width={80} height={24} />
  </Box>
);

const HallOfFame = () => {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(null);
  const [myPosition, setMyPosition] = useState(undefined); // undefined = not yet loaded
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(async (pageNum, append = false) => {
    try {
      const data = await hallOfFameService.getLeaderboard(pageNum);
      setRows((prev) => append ? [...prev, ...data.results] : data.results);
      setHasMore(!!data.next);
      setTotalCount(data.count);
      if (!append) setMyPosition(data.my_position ?? null);
    } catch {
      setError('Could not load the leaderboard. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchPage(1, false); }, [fetchPage]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    fetchPage(next, true);
  };

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            height: { xs: 'auto', md: '100vh' },
            minHeight: { xs: '100vh', md: 'unset' },
            overflow: 'auto',
            p: 3,
            pt: { xs: 7, md: 3 },
            boxSizing: 'border-box',
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">Hall of Fame</Typography>
            <Typography variant="body2" color="text.secondary">
              Top contributors ranked by points and classifications
            </Typography>
          </Box>

          {myPosition != null && totalCount != null && (
            <Box sx={{ mb: 2, maxWidth: 720 }}>
              <Chip
                icon={<TrophyIcon />}
                label={`Your position: #${myPosition} of ${totalCount}`}
                color="primary"
                variant="outlined"
              />
            </Box>
          )}

          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', maxWidth: 720 }}>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Box key={i}>
                  <RowSkeleton />
                  {i < 7 && <Divider />}
                </Box>
              ))
            ) : error ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>{error}</Typography>
                <Button variant="outlined" size="small"
                  onClick={() => { setLoading(true); setError(null); fetchPage(1, false); }}>
                  Retry
                </Button>
              </Box>
            ) : rows.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <MedalIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">No entries yet. Be the first!</Typography>
              </Box>
            ) : (
              <>
                {rows.map((entry, i) => {
                  const rank = i + 1;
                  const flag = COUNTRY_FLAG(entry.country);
                  const initials = entry.is_anonymous
                    ? '?'
                    : (entry.display_name ?? '?')[0].toUpperCase();

                  return (
                    <Box key={entry.id}>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5,
                        bgcolor: MEDAL[rank]?.bg ?? 'transparent',
                      }}>
                        <RankDisplay rank={rank} />

                        <Avatar sx={{
                          bgcolor: entry.is_anonymous ? 'action.disabledBackground' : 'primary.main',
                          color: entry.is_anonymous ? 'text.disabled' : 'white',
                          width: 40, height: 40, fontSize: '0.9rem',
                        }}>
                          {initials}
                        </Avatar>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Typography variant="body2"
                              fontWeight={rank <= 3 ? 'bold' : 'normal'}
                              color={entry.is_anonymous ? 'text.secondary' : 'text.primary'}
                              noWrap>
                              {entry.display_name}
                            </Typography>
                            {flag && (
                              <Tooltip title={entry.country_name ?? entry.country} placement="top">
                                <Typography component="span" sx={{ fontSize: 16, lineHeight: 1, cursor: 'default' }}>
                                  {flag}
                                </Typography>
                              </Tooltip>
                            )}
                          </Box>
                          {entry.institution && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {entry.institution}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
                          <Chip
                            label={
                              entry.delta_last_day > 0
                                ? `${entry.total_classifications} classifications (+${entry.delta_last_day})`
                                : `${entry.total_classifications} classifications`
                            }
                            size="small"
                            color={rank === 1 ? 'warning' : 'default'}
                            variant={rank <= 3 ? 'filled' : 'outlined'}
                          />
                          {entry.points > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {entry.points} pts · Lvl {entry.level}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {i < rows.length - 1 && <Divider />}
                    </Box>
                  );
                })}

                {hasMore && (
                  <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button
                      variant="text"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      startIcon={loadingMore ? <CircularProgress size={16} /> : null}
                    >
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </>
  );
};

export default HallOfFame;
