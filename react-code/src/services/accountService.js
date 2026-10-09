import api from './api';

const accountService = {
  // Delete account
  deleteAccount: async (deleteClassifications = false) => {
    const response = await api.delete('/api/auth/delete-account/', {
      data: { 
        confirm: true,
        delete_classifications: deleteClassifications 
      }
    });
    return response.data;
  },
};

export default accountService;
