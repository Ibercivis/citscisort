import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Alert,
  CssBaseline,
  alpha,
  Link,
} from '@mui/material';
import { OpenInNew as OpenIcon } from '@mui/icons-material';
import abstractService from '../services/abstractService';
import SideMenu from '../components/dashboard/SideMenu';
import { HtmlTitle } from '../utils/htmlTitle';

const AbstractDetail = () => {
  const { abstractId } = useParams();
  const navigate = useNavigate();
  const [abstract, setAbstract] = useState(null);
  const [classifications, setClassifications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAbstractData();
  }, [abstractId]);

  const loadAbstractData = async () => {
    try {
      setLoading(true);
      const [abstractData, classificationsData] = await Promise.all([
        abstractService.getAbstractDetails(abstractId),
        abstractService.getAbstractClassifications(abstractId),
      ]);
      setAbstract(abstractData);
      setClassifications(classificationsData);
      setError(null);
    } catch (err) {
      console.error('Error loading abstract:', err);
      if (err.response?.status === 404) {
        setError('Abstract not found');
      } else {
        setError('Error loading abstract details');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <CssBaseline enableColorScheme />
        <Box sx={{ display: 'flex' }}>
          <SideMenu />
          <Box
            component="main"
            sx={(theme) => ({
              flexGrow: 1, minWidth: 0,
              backgroundColor: theme.vars
                ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
                : alpha(theme.palette.background.default, 1),
              overflow: 'auto',
              minHeight: 'calc(100vh - 64px)',
              mt: 0,
              p: 3,
            })}
          >
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          </Box>
        </Box>
      </>
    );
  }

  if (error) {
    return (
      <>
        <CssBaseline enableColorScheme />
        <Box sx={{ display: 'flex' }}>
          <SideMenu />
          <Box
            component="main"
            sx={(theme) => ({
              flexGrow: 1, minWidth: 0,
              backgroundColor: theme.vars
                ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
                : alpha(theme.palette.background.default, 1),
              overflow: 'auto',
              minHeight: 'calc(100vh - 64px)',
              mt: 0,
              p: 3,
            })}
          >
            <Container maxWidth="lg">
              <Alert severity="error">{error}</Alert>
            </Container>
          </Box>
        </Box>
      </>
    );
  }

  return (
    <>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1, minWidth: 0,
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
              : alpha(theme.palette.background.default, 1),
            overflow: 'auto',
            minHeight: 'calc(100vh - 64px)',
            mt: 0,
            p: 3,
          })}
        >
          <Container maxWidth="lg" sx={{ mb: 4 }}>
            <Card>
              <CardHeader
                sx={{
                  bgcolor: 'action.selected',
                }}
                title={<HtmlTitle html={abstract.title} />}
                subheader={
                  <Box>
                    {abstract.authors && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        {Array.isArray(abstract.authors) ? (
                          abstract.authors.map((author, idx) => (
                            <Chip key={idx} label={author} size="small" variant="outlined" />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {abstract.authors}
                          </Typography>
                        )}
                      </Box>
                    )}
                    {abstract.journal && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {abstract.journal} • {abstract.year}
                      </Typography>
                    )}
                  </Box>
                }
              />

              <CardContent>
                {/* Abstract Text */}
                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                  {abstract.abstract_text}
                </Typography>

                {/* Classifications */}
                {classifications && classifications.total > 0 && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Classifications ({classifications.total})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {/* Main Categories */}
                      {classifications.by_category && 
                        Object.entries(classifications.by_category).map(([key, value]) => (
                          <Chip
                            key={key}
                            label={`${value.display_name} (${value.percentage.toFixed(0)}%)`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))
                      }
                      {/* Meta Aspects */}
                      {classifications.meta_aspects && 
                        Object.entries(classifications.meta_aspects).map(([key, value]) => (
                          <Chip
                            key={key}
                            label={`${value.display_name} (${value.percentage.toFixed(0)}%)`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        ))
                      }
                    </Box>
                  </Box>
                )}

                {/* Metadata */}
                {abstract.doi && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      DOI
                    </Typography>
                    <Link
                      href={`https://doi.org/${abstract.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}
                    >
                      {abstract.doi}
                      <OpenIcon fontSize="small" />
                    </Link>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Container>
        </Box>
      </Box>
    </>
  );
};

export default AbstractDetail;
