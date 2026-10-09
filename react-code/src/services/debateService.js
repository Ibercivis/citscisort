import api from './api';

const debateService = {
  // Get debates with pagination
  getDebates: async (page = 1) => {
    const response = await api.get(`/api/debates/?page=${page}`);
    return response.data;
  },

  // Get debate details with comments
  getDebateDetails: async (debateId) => {
    const response = await api.get(`/api/debates/${debateId}/`);
    return response.data;
  },

  // Add comment to debate
  addComment: async (debateId, text) => {
    const response = await api.post(`/api/debates/${debateId}/comments/`, {
      text: text,
    });
    return response.data;
  },

  // Share debate
  shareDebate: async (debateId, recipientEmail, message = '') => {
    const response = await api.post('/api/debates/share/', {
      debate_id: debateId,
      recipient_email: recipientEmail,
      message: message,
    });
    return response.data;
  },

  // Delete debate
  deleteDebate: async (debateId) => {
    const response = await api.delete(`/api/debates/${debateId}/`);
    return response.data;
  },
};

export default debateService;
