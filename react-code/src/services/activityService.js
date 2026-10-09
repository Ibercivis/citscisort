import api from './api';

const activityService = {
  // Get activity feed
  getActivityFeed: async (limit = 10, minutes = 1440) => {
    const response = await api.get(`/api/classifications/activity_feed/?limit=${limit}&minutes=${minutes}`);
    return response.data;
  },

  // Get pulse (real-time stats)
  getPulse: async () => {
    const response = await api.get('/api/classifications/pulse/');
    return response.data;
  },
};

export default activityService;
