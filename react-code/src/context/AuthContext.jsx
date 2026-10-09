import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import googleAuthService from '../services/googleAuthService';
import legalService from '../services/legalService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [legalStatus, setLegalStatus] = useState(null);
  const [legalLoading, setLegalLoading] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      checkLegalStatus();
    }
    setLoading(false);
  }, []);

  const checkLegalStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const status = await legalService.getStatus();
      setLegalStatus(status);
    } catch {}
  };

  const acceptLegal = async () => {
    setLegalLoading(true);
    try {
      const status = await legalService.accept();
      setLegalStatus(status);
    } finally {
      setLegalLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    if (data.user) {
      setUser(data.user);
      await checkLegalStatus();
    }
    return data;
  };

  const register = async (email, password1, password2, first_name = '', last_name = '') => {
    const data = await authService.register(email, password1, password2, first_name, last_name);
    return data;
  };

  const loginWithGoogle = async (tokenResponse) => {
    const data = await googleAuthService.loginWithGoogle(tokenResponse);
    if (data.user) {
      setUser(data.user);
      await checkLegalStatus();
    }
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setLegalStatus(null);
  };

  const value = {
    user,
    login,
    register,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    loading,
    legalStatus,
    legalLoading,
    acceptLegal,
    checkLegalStatus,
    needsLegalAcceptance: !!legalStatus?.needs_acceptance,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
