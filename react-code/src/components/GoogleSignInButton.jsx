import { GoogleLogin } from '@react-oauth/google';
import { Divider, Typography, Box } from '@mui/material';

const GoogleSignInButton = ({ onSuccess, onError }) => (
  <>
    <Divider sx={{ my: 1 }}>
      <Typography variant="caption" color="text.secondary">or</Typography>
    </Divider>
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          console.log('Google credentialResponse:', credentialResponse);
          onSuccess(credentialResponse.credential);
        }}
        onError={onError || (() => console.error('Google login failed'))}
        useOneTap={false}
      />
    </Box>
  </>
);

export default GoogleSignInButton;
