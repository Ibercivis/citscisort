import api from './api';

const profileService = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get('/api/profiles/me/');
    return response.data;
  },

  // Get list of countries
  getCountries: async () => {
    const response = await api.get('/api/profiles/countries/');
    return response.data;
  },

  // Get list of academic backgrounds
  getBackgrounds: async () => {
    const response = await api.get('/api/profiles/backgrounds/');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.patch('/api/profiles/update_profile/', profileData);
    return response.data;
  },
};

export default profileService;
