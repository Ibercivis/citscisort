import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  FormGroup,
  TextField,
  Button,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme,
  Autocomplete,
  Switch,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import categoryService from '../services/categoryService';
import abstractService from '../services/abstractService';
import infrastructureService from '../services/infrastructureService';
import metaAspectSuggestionService from '../services/metaAspectSuggestionService';
import { getCategoryIcon } from '../constants/categoryIcons';

const getDescriptionParts = (aspect) => ({
  header: aspect.description_short || '',
  keywords: Array.isArray(aspect.keywords) ? aspect.keywords : [],
  disambiguation: aspect.disambiguation || '',
});

// Front-end display override for the three main categories, aligned with the
// About page terminology. Keyed on the current backend names; falls back to the
// backend value if it doesn't match (e.g. if the backend is renamed later).
const MAIN_CATEGORY_LABELS = {
  'Scientific Findings': 'Findings through Citizen Science',
  'Meta-research': 'Findings about Citizen Science',
  'Meta-Research': 'Findings about Citizen Science',
  'Not sure': "Not sure / Can't decide",
  'Not Sure': "Not sure / Can't decide",
};
const mainCategoryLabel = (name) => MAIN_CATEGORY_LABELS[name?.trim()] || name;

const ClassificationForm = ({ abstractId, onSuccess, kamikazeMode = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const formRef = useRef(null);
  
  const [categories, setCategories] = useState({ main: [], meta_aspects: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [startTime] = useState(Date.now());

  // Step state
  const [activeStep, setActiveStep] = useState(0);

  // Classifications state
  const [abstractClassifications, setAbstractClassifications] = useState(null);
  const [loadingClassifications, setLoadingClassifications] = useState(false);

  // Debate dialog state
  const [openDebateDialog, setOpenDebateDialog] = useState(false);
  const [debateText, setDebateText] = useState('');
  const [creatingDebate, setCreatingDebate] = useState(false);
  const [debateError, setDebateError] = useState('');
  const [debateSuccess, setDebateSuccess] = useState(false);

  // Form state
  const [mainCategory, setMainCategory] = useState('');
  const [metaAspects, setMetaAspects] = useState([]);
  const [mentionsInfrastructure, setMentionsInfrastructure] = useState(false);
  const [infrastructures, setInfrastructures] = useState([]);
  const [infraOptions, setInfraOptions] = useState([]);
  const [infraLoading, setInfraLoading] = useState(false);
  const [otherMetaAspects, setOtherMetaAspects] = useState([]);
  const [otherMetaOptions, setOtherMetaOptions] = useState([]);
  const [otherMetaLoading, setOtherMetaLoading] = useState(false);
  const [expandedMetaItems, setExpandedMetaItems] = useState(new Set());
  const [comments, setComments] = useState('');
  const [infraInputValue, setInfraInputValue] = useState('');
  const [otherMetaInputValue, setOtherMetaInputValue] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  // Scroll to top when step changes on mobile
  useEffect(() => {
    if (isMobile && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeStep, isMobile]);

  const loadCategories = async () => {
    try {
      const data = await categoryService.getClassificationFlow();
      const sortedMain = [...data.main].sort((a, b) => {
        if (a.code === 'main_meta_research') return -1;
        if (b.code === 'main_meta_research') return 1;
        return 0;
      });
      setCategories({ ...data, main: sortedMain });
    } catch (err) {
      setError('Error loading categories');
    } finally {
      setLoading(false);
    }
  };

  const handleMainCategoryChange = (event) => {
    const value = event.target.value;
    setMainCategory(value);
    if (value !== 'main_meta_research') {
      setMetaAspects([]);
      setOtherMetaAspects([]);
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleOtherMetaSearch = async (query) => {
    if (!query || query.length < 2) { setOtherMetaOptions([]); return; }
    setOtherMetaLoading(true);
    try {
      const results = await metaAspectSuggestionService.search(query);
      setOtherMetaOptions(Array.isArray(results) ? results : (results.results || []));
    } catch { setOtherMetaOptions([]); }
    finally { setOtherMetaLoading(false); }
  };

  const handleInfraSearch = async (query) => {
    if (!query || query.length < 2) { setInfraOptions([]); return; }
    setInfraLoading(true);
    try {
      const results = await infrastructureService.search(query);
      setInfraOptions(Array.isArray(results) ? results : (results.results || []));
    } catch { setInfraOptions([]); }
    finally { setInfraLoading(false); }
  };

  const handleMetaAspectToggle = (code) => {
    setMetaAspects((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  // Always 4 fixed steps; step 1 (Dimensions) is skipped when not applicable
  const ALL_STEPS = ['Main Category', 'Dimensions', 'Infrastructure & Comments', 'Review'];
  const isMetaStep = mainCategory === 'main_meta_research';

  // Map logical activeStep to step name, skipping Meta if not applicable
  const currentStepName = (() => {
    if (activeStep === 0) return 'Main Category';
    if (activeStep === 1) return isMetaStep ? 'Dimensions' : 'Infrastructure & Comments';
    if (activeStep === 2) return isMetaStep ? 'Infrastructure & Comments' : 'Review';
    return 'Review';
  })();

  // Visual stepper index (always 4 steps shown)
  const stepperActive = (() => {
    if (activeStep === 0) return 0;
    if (activeStep === 1) return isMetaStep ? 1 : 2;
    if (activeStep === 2) return isMetaStep ? 2 : 3;
    return 3;
  })();

  const handleNextStep = () => setActiveStep((prev) => prev + 1);
  const handleBackStep = () => setActiveStep((prev) => prev - 1);

  const isLastStep = isMetaStep ? activeStep === 3 : activeStep === 2;

  const canProceed = () => {
    if (currentStepName === 'Main Category') return mainCategory !== '';
    if (currentStepName === 'Dimensions') return metaAspects.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      const classification = {
        abstract: abstractId,
        main_classification: mainCategory,
        meta_aspects: metaAspects,
        other_meta_aspects: mainCategory === 'main_meta_research' ? otherMetaAspects : [],
        mentions_infrastructure: mentionsInfrastructure,
        infrastructures: mentionsInfrastructure ? infrastructures : [],
        comments: comments.trim(),
        time_spent_seconds: timeSpentSeconds,
      };

      await abstractService.submitClassification(classification);
      setSuccess('Classification submitted successfully!');
      setSubmitted(true);
      
      // Load abstract classifications
      loadAbstractClassifications();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || '';
      if (msg && (msg.toLowerCase().includes('already classified') || msg.toLowerCase().includes('ya clasificado'))) {
        if (onSuccess) onSuccess();
        return;
      }
      setError(msg || 'Error submitting classification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadAbstractClassifications = async () => {
    setLoadingClassifications(true);
    try {
      const data = await abstractService.getAbstractClassifications(abstractId);
      setAbstractClassifications(data);
    } catch (err) {
      console.error('Error loading abstract classifications:', err);
    } finally {
      setLoadingClassifications(false);
    }
  };

  const handleNext = () => {
    if (onSuccess) onSuccess();
  };

  const handleStartDebate = () => {
    setOpenDebateDialog(true);
    setDebateError('');
    setDebateSuccess(false);
    setDebateText('');
  };

  const handleCloseDebateDialog = () => {
    setOpenDebateDialog(false);
    setDebateText('');
    setDebateError('');
    setDebateSuccess(false);
  };

  const handleCreateDebate = async () => {
    if (!debateText.trim()) {
      setDebateError('Please enter a debate description');
      return;
    }

    setCreatingDebate(true);
    setDebateError('');

    try {
      await abstractService.createDebate(abstractId, debateText);
      setDebateSuccess(true);
      setDebateText('');
      // Auto-close after 2 seconds
      setTimeout(() => {
        setOpenDebateDialog(false);
        setDebateSuccess(false);
      }, 2000);
    } catch (err) {
      // Handle field-specific errors from backend
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Check for field-specific errors (e.g., {"text": ["Text too short..."]})
        if (errorData.text && Array.isArray(errorData.text)) {
          setDebateError(errorData.text.join(', '));
        } else if (errorData.detail) {
          setDebateError(errorData.detail);
        } else {
          setDebateError('Error creating debate. Please try again.');
        }
      } else {
        setDebateError('Error creating debate. Please try again.');
      }
    } finally {
      setCreatingDebate(false);
    }
  };

  if (loading) {
    return <Typography>Loading categories...</Typography>;
  }

  const renderStepContent = () => {
    switch (currentStepName) {
      case 'Main Category':
        return (
          <Box>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Select Main Category
            </Typography>
            {!kamikazeMode && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose the category that best describes this abstract
              </Typography>
            )}
            <Box id="classify-categories">
              {categories.main.map((category) => {
                const CatIcon = getCategoryIcon(category.icon);
                const isSelected = mainCategory === category.code;
                return (
                  <Box
                    key={category.id}
                    onClick={() => !submitted && handleMainCategoryChange({ target: { value: category.code } })}
                    sx={{
                      position: 'relative',
                      display: 'flex', alignItems: 'flex-start', gap: 1.5,
                      p: 1.5, mb: 1.5,
                      border: isSelected ? '2px solid' : '1px solid',
                      borderColor: isSelected ? 'text.primary' : 'divider',
                      borderRadius: 2,
                      bgcolor: isSelected ? 'action.selected' : 'background.paper',
                      cursor: submitted ? 'default' : 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': !submitted ? {
                        bgcolor: isSelected ? 'action.selected' : 'action.hover',
                        borderColor: 'text.primary',
                      } : {},
                    }}
                  >
                    {CatIcon && (
                      <CatIcon sx={{ mt: 0.2, color: 'text.secondary' }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={isSelected ? 'bold' : 'medium'}
                        color='text.primary'>
                        {mainCategoryLabel(category.name)}
                      </Typography>
                      {!kamikazeMode && (
                        <Typography variant="caption" color="text.secondary">
                          {category.description}
                        </Typography>
                      )}
                    </Box>
                    {isSelected && (
                      <Box sx={{
                        position: 'absolute', top: 8, right: 8,
                        width: 18, height: 18, borderRadius: '50%',
                        bgcolor: 'text.primary',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Typography sx={{ color: 'background.paper', fontSize: '0.65rem', lineHeight: 1 }}>✓</Typography>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        );

      case 'Dimensions':
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                Select Dimensions
              </Typography>
              {metaAspects.length > 0 && (
                <Chip
                  label={`${metaAspects.length} selected`}
                  size="small"
                  color="primary"
                />
              )}
            </Box>
            {!kamikazeMode && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select <strong>all dimensions that apply</strong> — multiple selections are expected
              </Typography>
            )}
            <FormGroup>
              {categories.meta_aspects.map((aspect) => {
                const parsed = getDescriptionParts(aspect);


                const descriptionBlock = !kamikazeMode && (
                  <Box sx={{ mt: 0.5 }}>
                    {parsed.header && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {parsed.header}
                      </Typography>
                    )}
                    {parsed.keywords.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {parsed.keywords.map(kw => (
                          <Chip key={kw} label={kw} size="small" variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20, color: 'text.secondary' }} />
                        ))}
                      </Box>
                    )}
                    {parsed.disambiguation && (
                      <Accordion elevation={0} onClick={(e) => e.stopPropagation()}
                        sx={{ mt: 0.5, '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: '0.9rem' }} />}
                          sx={{ p: 0, minHeight: 'unset !important', '& .MuiAccordionSummary-content': { m: '4px 0 !important' } }}>
                          <Typography variant="caption" color="primary" sx={{ fontStyle: 'italic' }}>
                            Disambiguation guide
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0, pt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {parsed.disambiguation}
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </Box>
                );

                const AspIcon = getCategoryIcon(aspect.icon);
                const isChecked = metaAspects.includes(aspect.code);

                return (
                  <Box key={aspect.id} sx={{ mb: 1.5 }}>
                    {isMobile ? (
                      <Accordion
                        elevation={0}
                        expanded={expandedMetaItems.has(aspect.code)}
                        onChange={(e, isExpanded) => {
                          setExpandedMetaItems(prev => {
                            const next = new Set(prev);
                            isExpanded ? next.add(aspect.code) : next.delete(aspect.code);
                            return next;
                          });
                        }}
                        sx={{
                          border: '2px solid',
                          borderColor: isChecked ? 'primary.main' : 'divider',
                          borderRadius: '8px !important',
                          bgcolor: isChecked ? 'primary.50' : 'background.paper',
                          '&:before': { display: 'none' },
                          transition: 'border-color 0.15s ease, background-color 0.15s ease',
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 } }}
                          onClick={(e) => {
                            // Only toggle selection when clicking on the label/icon area, not the expand button
                            if (!e.target.closest('.MuiAccordionSummary-expandIconWrapper') && !submitted) {
                              e.stopPropagation();
                              handleMetaAspectToggle(aspect.code);
                            }
                          }}
                        >
                          {AspIcon && <AspIcon fontSize="small" color={isChecked ? 'primary' : 'action'} />}
                          <Typography variant="body2" fontWeight={isChecked ? 'bold' : 'medium'}
                            color={isChecked ? 'primary.main' : 'text.primary'} sx={{ flex: 1 }}>
                            {aspect.name}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          {descriptionBlock}
                        </AccordionDetails>
                      </Accordion>
                    ) : (
                      <Box
                        onClick={() => !submitted && handleMetaAspectToggle(aspect.code)}
                        sx={{
                          position: 'relative',
                          display: 'flex', alignItems: 'flex-start', gap: 1.5,
                          p: 1.5,
                          border: isChecked ? '2px solid' : '1px solid',
                          borderColor: isChecked ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          bgcolor: isChecked ? 'rgba(25,118,210,0.08)' : 'background.paper',
                          cursor: submitted ? 'default' : 'pointer',
                          transition: 'all 0.15s ease',
                          '&:hover': !submitted ? {
                            bgcolor: isChecked ? 'rgba(25,118,210,0.13)' : 'rgba(0,0,0,0.03)',
                            borderColor: isChecked ? 'primary.main' : 'text.disabled',
                          } : {},
                        }}
                      >
                        {AspIcon && (
                          <AspIcon sx={{ mt: 0.2, color: isChecked ? 'primary.main' : 'text.secondary' }} />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={isChecked ? 'bold' : 'medium'}
                            color={isChecked ? 'primary.main' : 'text.primary'}>
                            {aspect.name}
                          </Typography>

                          {descriptionBlock}
                        </Box>
                        {isChecked && (
                          <Box sx={{
                            position: 'absolute', top: 8, right: 8,
                            width: 18, height: 18, borderRadius: '50%',
                            bgcolor: 'primary.main',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Typography sx={{ color: 'white', fontSize: '0.65rem', lineHeight: 1 }}>✓</Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </FormGroup>

            {/* Other meta aspects */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Other dimensions (specify)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Any additional dimension not listed above
              </Typography>
              <Autocomplete
                multiple
                freeSolo
                options={otherMetaOptions.map(o => typeof o === 'string' ? o : o.name)}
                value={otherMetaAspects}
                inputValue={otherMetaInputValue}
                loading={otherMetaLoading}
                disabled={submitted}
                onChange={(_, newValue) => {
                  setOtherMetaAspects(newValue);
                  setOtherMetaInputValue('');
                }}
                onInputChange={(_, value) => {
                  setOtherMetaInputValue(value);
                  handleOtherMetaSearch(value);
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={index} label={option} size="small" {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search or type an aspect…"
                    variant="outlined"
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {otherMetaLoading ? <CircularProgress size={16} /> : null}
                          {otherMetaInputValue.trim() && (
                            <IconButton size="small" color="primary"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const val = otherMetaInputValue.trim();
                                if (val && !otherMetaAspects.includes(val)) {
                                  setOtherMetaAspects((prev) => [...prev, val]);
                                }
                                setOtherMetaInputValue('');
                                setOtherMetaOptions([]);
                              }}>
                              <AddIcon fontSize="small" />
                            </IconButton>
                          )}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Box>
          </Box>
        );

      case 'Infrastructure & Comments':
        return (
          <Box>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Additional Information
            </Typography>

            {/* Infrastructure toggle */}
            <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={mentionsInfrastructure}
                    onChange={(e) => {
                      setMentionsInfrastructure(e.target.checked);
                      if (!e.target.checked) setInfrastructures([]);
                    }}
                    disabled={submitted}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      Does the paper mention infrastructure?
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Platforms, tools, apps, or technologies used in the project
                    </Typography>
                  </Box>
                }
              />

              {mentionsInfrastructure && (
                <Box sx={{ mt: 2 }}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={infraOptions}
                    getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.name}
                    value={infrastructures}
                    inputValue={infraInputValue}
                    loading={infraLoading}
                    disabled={submitted}
                    onChange={(_, newValue) => {
                      setInfrastructures(newValue.map(v => typeof v === 'string' ? v : v.name));
                      setInfraInputValue('');
                    }}
                    onInputChange={(_, value, reason) => {
                      setInfraInputValue(value);
                      handleInfraSearch(value);
                    }}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2">{option.name}</Typography>
                          {option.usage_count > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              used {option.usage_count}×
                            </Typography>
                          )}
                        </Box>
                        {option.is_verified && (
                          <Chip label="verified" size="small" color="success" variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 18 }} />
                        )}
                      </Box>
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip key={index} label={option} size="small" {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search or type a platform name…"
                        variant="outlined"
                        size="small"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {infraLoading ? <CircularProgress size={16} /> : null}
                              {infraInputValue.trim() && (
                                <IconButton size="small" color="primary"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const val = infraInputValue.trim();
                                    if (val && !infrastructures.includes(val)) {
                                      setInfrastructures((prev) => [...prev, val]);
                                    }
                                    setInfraInputValue('');
                                    setInfraOptions([]);
                                  }}>
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              )}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Type and press Enter or tap + to add
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Comments */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Comments (Optional)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Any additional observations about this abstract
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter any comments..."
                variant="outlined"
                disabled={submitted}
              />
            </Box>
          </Box>
        );

      case 'Review':
        return (
          <Box>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Review Your Classification
            </Typography>
            {!kamikazeMode && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Please review your selections before submitting
              </Typography>
            )}

            {/* Main Category */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Main Category
              </Typography>
              <Typography variant="body2">
                {mainCategoryLabel(categories.main.find(c => c.code === mainCategory)?.name)}
              </Typography>
            </Box>

            {/* Meta Aspects */}
            {mainCategory === 'main_meta_research' && metaAspects.length > 0 && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Dimensions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {metaAspects.map(code => {
                    const aspect = categories.meta_aspects.find(a => a.code === code);
                    return (
                      <Chip key={code} label={aspect?.name} size="small" />
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Other meta aspects */}
            {mainCategory === 'main_meta_research' && otherMetaAspects.length > 0 && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Other dimensions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {otherMetaAspects.map(name => (
                    <Chip key={name} label={name} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}

            {/* Infrastructure */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Infrastructure
              </Typography>
              {mentionsInfrastructure && infrastructures.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {infrastructures.map(name => (
                    <Chip key={name} label={name} size="small" />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {mentionsInfrastructure ? 'None specified' : 'Not mentioned in the paper'}
                </Typography>
              )}
            </Box>

            {/* Comments */}
            {comments.trim() && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Comments
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {comments}
                </Typography>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box ref={formRef} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Stepper */}
      <Box id="classify-stepper" sx={{ mb: 3 }}>
        {isMobile ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            {ALL_STEPS.map((label, index) => (
              <Box
                key={label}
                sx={{
                  width: 10, height: 10, borderRadius: '50%',
                  bgcolor: index <= stepperActive ? 'primary.main' : 'grey.300',
                  transition: 'background-color 0.2s ease',
                }}
              />
            ))}
          </Box>
        ) : (
          <Stepper activeStep={stepperActive} alternativeLabel>
            {ALL_STEPS.map((label, index) => {
              const isSkipped = label === 'Dimensions' && !isMetaStep && activeStep > 0;
              return (
                <Step key={label} completed={isSkipped ? false : stepperActive > index}>
                  <StepLabel
                    optional={!kamikazeMode && label === 'Dimensions' && !isMetaStep
                      ? <Typography variant="caption" color="text.disabled">if applicable</Typography>
                      : undefined}
                    sx={{
                      ...(isSkipped ? { '& .MuiStepLabel-label': { color: 'text.disabled' } } : {}),
                      ...(kamikazeMode ? { '& .MuiStepLabel-label': { display: 'none' } } : {}),
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              );
            })}
          </Stepper>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Abstract Classifications */}
      {submitted && abstractClassifications && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            What classifiers said about this paper
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Based on {abstractClassifications.total} classification{abstractClassifications.total !== 1 ? 's' : ''} — including yours
          </Typography>
          {loadingClassifications ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {abstractClassifications.by_category &&
                Object.entries(abstractClassifications.by_category).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${mainCategoryLabel(value.display_name)} · ${value.percentage.toFixed(0)}%`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))
              }
              {abstractClassifications.meta_aspects &&
                Object.entries(abstractClassifications.meta_aspects).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${value.display_name} · ${value.percentage.toFixed(0)}%`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                ))
              }
            </Box>
          )}
        </Box>
      )}

      {/* Step Content */}
      {!submitted && (
        <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 3 }}>
          {renderStepContent()}
        </Box>
      )}

      {/* Navigation Buttons */}
      {!submitted && (
        <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
          <Button
            onClick={handleBackStep}
            disabled={activeStep === 0}
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            Back
          </Button>
          <Box sx={{ flex: 1 }} />
          {isLastStep ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              sx={{ minWidth: 100 }}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNextStep}
              disabled={!canProceed()}
              sx={{ minWidth: 100 }}
            >
              Next
            </Button>
          )}
        </Box>
      )}

      {/* Submit/Next Button */}
      {submitted && (
        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleNext}
            color="success"
            fullWidth
            sx={{ mb: 3 }}
          >
            Next
          </Button>
          
          <Divider sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>
          
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Have something to debate about this paper with the community?
            </Typography>
            <Button
              variant="outlined"
              size="medium"
              onClick={handleStartDebate}
              color="primary"
            >
              Start a Debate
            </Button>
          </Box>
        </Box>
      )}

      {/* Debate Dialog */}
      <Dialog 
        open={openDebateDialog} 
        onClose={handleCloseDebateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Start Debate</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Explain what you want to debate about this abstract
          </Typography>

          {debateError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {debateError}
            </Alert>
          )}

          {debateSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Debate created successfully!
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Debate Description"
            multiline
            rows={4}
            fullWidth
            value={debateText}
            onChange={(e) => setDebateText(e.target.value)}
            placeholder="Describe the debate topic..."
            required
            disabled={debateSuccess}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDebateDialog}>
            {debateSuccess ? 'Close' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleCreateDebate} 
            variant="contained"
            disabled={creatingDebate || !debateText.trim() || debateSuccess}
          >
            {creatingDebate ? 'Creating...' : 'Create Debate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassificationForm;
