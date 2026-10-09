import api, { ensureCsrfCookie } from './api';

const authService = {
  // Login
  login: async (email, password) => {
    await ensureCsrfCookie();
    console.log('Starting login...');
    const response = await api.post('/api/auth/login/', {
      email,
      password,
    });
    console.log('Login response:', response.data);
    
    if (response.data.key) {
      localStorage.setItem('token', response.data.key);
      console.log('Token saved:', response.data.key);
      
      // Get user info after login
      try {
        console.log('Fetching user data...');
        const userResponse = await api.get('/api/auth/user/');
        console.log('User data response:', userResponse.data);
        
        if (userResponse.data) {
          // Also fetch profile to get display_name, first_name, last_name
          try {
            console.log('Fetching profile data...');
            const profileResponse = await api.get('/api/profiles/me/');
            console.log('Profile data response:', profileResponse.data);
            
            // Merge profile data into user object
            const completeUser = {
              ...userResponse.data,
              display_name: profileResponse.data.display_name,
              first_name: profileResponse.data.first_name,
              last_name: profileResponse.data.last_name,
            };
            
            localStorage.setItem('user', JSON.stringify(completeUser));
            console.log('Complete user saved to localStorage');
            return { key: response.data.key, user: completeUser };
          } catch (profileError) {
            console.error('Error fetching profile data:', profileError);
            // If profile fetch fails, still save basic user data
            localStorage.setItem('user', JSON.stringify(userResponse.data));
            console.log('User saved to localStorage (without profile data)');
            return { key: response.data.key, user: userResponse.data };
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        console.error('Error response:', error.response?.data);
      }
    }
    return response.data;
  },

  // Register
  register: async (email, password1, password2, first_name = '', last_name = '') => {
    await ensureCsrfCookie();
    const data = {
      email,
      password1,
      password2,
    };
    
    // Only include names if provided
    if (first_name) data.first_name = first_name;
    if (last_name) data.last_name = last_name;
    
    const response = await api.post('/api/auth/registration/', data);
    // Don't save token/user automatically - wait for email verification
    // if (response.data.key) {
    //   localStorage.setItem('token', response.data.key);
    //   localStorage.setItem('user', JSON.stringify(response.data.user));
    // }
    return response.data;
  },

  // Logout - token-based auth, clearing localStorage is sufficient
  logout: async () => {
    api.post('/api/auth/logout/').catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      return null;
    }
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      localStorage.removeItem('user');
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
};

export default authService;
