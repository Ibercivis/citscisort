import axios from 'axios';

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

export async function ensureCsrfCookie() {
  if (getCsrfToken()) return;
  await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/csrf/`, { withCredentials: true }).catch(() => {
    // Fallback: try login GET endpoint which also sets the cookie
    return axios.get(`${import.meta.env.VITE_API_URL}/api/auth/login/`, { withCredentials: true }).catch(() => {});
  });
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let onLegalRequired = null;
export const setLegalRequiredHandler = (fn) => { onLegalRequired = fn; };

let onToast = null;
export const setToastHandler = (fn) => { onToast = fn; };

const extractMessage = (error) => {
  const data = error.response?.data;
  if (!data) return error.message || 'An unexpected error occurred';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.non_field_errors) return Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const val = data[firstKey];
    return `${firstKey}: ${Array.isArray(val) ? val[0] : val}`;
  }
  return 'An unexpected error occurred';
};

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (hadToken) window.location.href = '/login';
    }
    const code = error.response?.data?.code;
    if (error.response?.status === 403 && code === 'legal_acceptance_required') {
      onLegalRequired?.();
    } else if (error.response?.status === 403 && code === 'challenge_join_required') {
      // Handled inline by the Classify page (join prompt); no generic toast.
    } else {
      onToast?.(extractMessage(error), 'error');
    }
    return Promise.reject(error);
  }
);

export default api;
