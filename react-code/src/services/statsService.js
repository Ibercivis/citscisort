import api from './api';

const statsService = {
  // Get overview statistics
  getOverview: async () => {
    const response = await api.get('/api/stats/overview/');
    return response.data;
  },

  // Get user's personal statistics
  getMyStats: async () => {
    const response = await api.get('/api/stats/me/');
    return response.data;
  },

  // Get abstract statistics
  getAbstractStats: async () => {
    const response = await api.get('/api/stats/abstracts/');
    return response.data;
  },
};

export default statsService;
