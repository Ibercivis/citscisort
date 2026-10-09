import api from './api';

const challengeService = {
  // Catalog: 1 general + top-30 keywords + top-30 journals.
  // type (optional): 'general' | 'keyword' | 'journal'
  list: async (type) => {
    const response = await api.get('/api/challenges/', { params: type ? { type } : {} });
    return response.data; // array (not paginated)
  },

  // Detail of a single challenge (stats includes my_contributions)
  get: async (id) => {
    const response = await api.get(`/api/challenges/${id}/`);
    return response.data;
  },

  // Join (idempotent): 201 if new, 200 if already participating
  join: async (id) => {
    const response = await api.post(`/api/challenges/${id}/join/`);
    return response.data;
  },

  leave: async (id) => {
    const response = await api.post(`/api/challenges/${id}/leave/`);
    return response.data;
  },

  // My joined challenges with progress (each challenge.stats has my_contributions)
  my: async () => {
    const response = await api.get('/api/challenges/my/');
    return response.data; // [{ id, challenge, joined_at, last_activity_at }]
  },

  leaderboard: async (id, limit = 10) => {
    const response = await api.get(`/api/challenges/${id}/leaderboard/`, { params: { limit } });
    return response.data; // { challenge_id, results, my_position, my_classifications }
  },
};

export default challengeService;
