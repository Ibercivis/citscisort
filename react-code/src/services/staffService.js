import api from './api';

const staffService = {
  // Staff only: who was active each day. { days, tracking_since, timezone, results: [{date, active_count, users}] }
  getDailyActivity: async (days = 60) => {
    const response = await api.get('/api/staff/daily-activity/', { params: { days } });
    return response.data;
  },
  // Staff only: aggregated series, progress and funnel for the charts.
  getOverview: async (days = 60) => {
    const response = await api.get('/api/staff/overview/', { params: { days } });
    return response.data;
  },
};

export default staffService;
