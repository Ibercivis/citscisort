import { Box, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { getUserDisplayName } from '../../utils/userDisplay';

const DashboardHeader = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ width: '100%', maxWidth: 1200 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Welcome back, {getUserDisplayName(user)}!
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Track your classification progress and explore statistics
      </Typography>
    </Box>
  );
};

export default DashboardHeader;
