import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Checkbox, FormControlLabel, Typography, Box, Link, Divider,
} from '@mui/material';
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '../config/legal';

const LegalAcceptanceModal = ({ open, onAccept, onDecline, loading }) => {
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  const canAccept = termsChecked && privacyChecked;

  const handleAccept = () => {
    if (canAccept) onAccept();
  };

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>
        Terms of Use & Privacy Policy
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Before continuing, please review and accept our Terms of Use and Privacy Policy
          (version {CURRENT_TERMS_VERSION}).
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={termsChecked}
                onChange={e => setTermsChecked(e.target.checked)}
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                I have read and accept the{' '}
                <Link component={RouterLink} to="/about?tab=terms" target="_blank" underline="hover">
                  Terms of Use
                </Link>
              </Typography>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={privacyChecked}
                onChange={e => setPrivacyChecked(e.target.checked)}
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                I have read and accept the{' '}
                <Link component={RouterLink} to="/about?tab=privacy" target="_blank" underline="hover">
                  Privacy Policy
                </Link>
              </Typography>
            }
          />
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button
          onClick={onDecline}
          disabled={loading}
          color="inherit"
          size="small"
          sx={{ color: 'text.disabled' }}
        >
          Decline & log out
        </Button>
        <Button
          variant="contained"
          onClick={handleAccept}
          disabled={!canAccept || loading}
        >
          {loading ? 'Saving…' : 'Accept & continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LegalAcceptanceModal;
