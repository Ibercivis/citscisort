import api from './api';

const followedDebatesService = {
  // Follow a debate
  followDebate: async (debateId) => {
    const response = await api.post('/api/followed-debates/', {
      debate_id: debateId,
    });
    return response.data;
  },

  // Get all followed debates with pagination
  getFollowedDebates: async (page = 1) => {
    const response = await api.get(`/api/followed-debates/?page=${page}`);
    return response.data;
  },

  // Get followed debate detail
  getFollowedDebateDetail: async (id) => {
    const response = await api.get(`/api/followed-debates/${id}/`);
    return response.data;
  },

  // Delete a followed debate (unfollow)
  unfollowDebate: async (debateId) => {
    const response = await api.delete(`/api/followed-debates/${debateId}/`);
    return response.data;
  },

  // Check if debate is followed
  checkFollowed: async (debateId) => {
    const response = await api.get(`/api/followed-debates/check_followed/?debate_id=${debateId}`);
    return response.data;
  },
};

export default followedDebatesService;
