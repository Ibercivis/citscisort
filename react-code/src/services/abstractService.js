import api from './api';

const abstractService = {
  // Get next abstract to classify.
  // challengeId (optional): scopes the queue to that challenge. Without it,
  // the global pool is used (= the "General" challenge).
  getNextToClassify: async (challengeId = null) => {
    const response = await api.get('/api/classifications/next_abstract/', {
      params: challengeId ? { challenge: challengeId } : {},
    });
    return response.data;
  },

  // Submit classification
  submitClassification: async (classification) => {
    const response = await api.post('/api/classifications/', classification);
    return response.data;
  },

  // Share abstract
  shareAbstract: async (abstractId, recipientEmail, message) => {
    const response = await api.post('/api/abstracts/share/', {
      abstract_id: abstractId,
      recipient_email: recipientEmail,
      message: message,
    });
    return response.data;
  },

  // Create debate
  createDebate: async (abstractId, text) => {
    const response = await api.post('/api/debates/', {
      abstract: abstractId,
      text: text,
    });
    return response.data;
  },

  // Get abstract classifications
  getAbstractClassifications: async (abstractId) => {
    const response = await api.get(`/api/classifications/abstract_classifications/?abstract_id=${abstractId}`);
    return response.data;
  },

  // Get abstract details
  getAbstractDetails: async (abstractId) => {
    const response = await api.get(`/api/abstracts/${abstractId}/`);
    return response.data;
  },
};

export default abstractService;
