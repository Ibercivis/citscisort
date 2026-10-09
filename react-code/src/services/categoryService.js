import api from './api';

const categoryService = {
  // Get classification flow categories
  getClassificationFlow: async () => {
    const response = await api.get('/api/categories/classification_flow/');
    return response.data;
  },
};

export default categoryService;
