import api from './api';

const googleAuthService = {
  loginWithGoogle: async (tokenResponse) => {
    const payload = { access_token: tokenResponse, id_token: tokenResponse };

    // Fetch CSRF cookie before POST (Django sets csrftoken on any GET)
    await api.get('/api/auth/user/').catch(() => {});

    console.log('Sending to /api/auth/google/:', payload);
    const response = await api.post('/api/auth/google/', payload);
    const { key } = response.data;

    localStorage.setItem('token', key);

    // Fetch user + profile
    const userResponse = await api.get('/api/auth/user/');
    let completeUser = userResponse.data;

    try {
      const profileResponse = await api.get('/api/profiles/me/');
      completeUser = {
        ...userResponse.data,
        display_name: profileResponse.data.display_name,
        first_name: profileResponse.data.first_name,
        last_name: profileResponse.data.last_name,
      };
    } catch {
      // profile optional
    }

    localStorage.setItem('user', JSON.stringify(completeUser));
    return { key, user: completeUser };
  },
};

export default googleAuthService;
