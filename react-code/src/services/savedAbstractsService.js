import api from './api';

const savedAbstractsService = {
  // Save an abstract
  saveAbstract: async (abstractId, notes = '', tags = '') => {
    const response = await api.post('/api/saved-abstracts/', {
      abstract_id: abstractId,
      notes,
      tags,
    });
    return response.data;
  },

  // Get all saved abstracts with pagination
  getSavedAbstracts: async (page = 1) => {
    const response = await api.get(`/api/saved-abstracts/?page=${page}`);
    return response.data;
  },

  // Delete a saved abstract
  deleteSavedAbstract: async (id) => {
    const response = await api.delete(`/api/saved-abstracts/${id}/`);
    return response.data;
  },

  // Update a saved abstract
  updateSavedAbstract: async (id, notes = '', tags = '') => {
    const response = await api.patch(`/api/saved-abstracts/${id}/`, {
      notes,
      tags,
    });
    return response.data;
  },
};

export default savedAbstractsService;
