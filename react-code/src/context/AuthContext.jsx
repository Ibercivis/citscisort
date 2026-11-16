import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import googleAuthService from '../services/googleAuthService';
import legalService from '../services/legalService';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [legalStatus, setLegalStatus] = useState(null);
  const [legalLoading, setLegalLoading] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  // is_staff only gates UI links; the API enforces it. Not persisted in localStorage.
  const refreshStaffFlag = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const { data } = await api.get('/api/profiles/me/');
      setIsStaff(!!data.is_staff);
    } catch { /* link just stays hidden */ }
  };

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      checkLegalStatus();
      refreshStaffFlag();
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
      refreshStaffFlag();
    }
    return data;
  };

  const register = async (email, password1, password2, first_name = '', last_name = '', prefs = {}) => {
    const data = await authService.register(email, password1, password2, first_name, last_name, prefs);
    return data;
  };

  const loginWithGoogle = async (tokenResponse) => {
    const data = await googleAuthService.loginWithGoogle(tokenResponse);
    if (data.user) {
      setUser(data.user);
      await checkLegalStatus();
      refreshStaffFlag();
    }
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setLegalStatus(null);
    setIsStaff(false);
  };

  const value = {
    user,
    login,
    register,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    isStaff,
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
