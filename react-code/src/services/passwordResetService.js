import api, { ensureCsrfCookie } from './api';

const passwordResetService = {
  requestReset: async (email) => {
    await ensureCsrfCookie();
    const response = await api.post('/api/auth/password/reset/', { email });
    return response.data;
  },

  confirmReset: async (uid, token, newPassword1, newPassword2) => {
    await ensureCsrfCookie();
    const response = await api.post('/api/auth/password/reset/confirm/', {
      new_password1: newPassword1,
      new_password2: newPassword2,
      uid,
      token,
    });
    return response.data;
  },
};

export default passwordResetService;
