import api from './api';

const hallOfFameService = {
  getLeaderboard: async (page = 1) => {
    const response = await api.get('/api/profiles/hall_of_fame/', { params: { page } });
    return response.data; // { count, next, previous, results }
  },
};

export default hallOfFameService;
