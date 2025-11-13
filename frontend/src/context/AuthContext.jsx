import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data.user);
      setProfile(response.data.profile);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

const login = async (email, password) => {
  const response = await authAPI.login({ email, password });
  const { access_token, user, profile } = response.data;
  
  localStorage.setItem('token', access_token);
  localStorage.setItem('user', JSON.stringify(user));
  
  // Small delay to ensure localStorage write completes
  await new Promise(resolve => setTimeout(resolve, 50));
  
  setUser(user);
  setProfile(profile);
  
  return user;
};

const signup = async (data) => {
  const response = await authAPI.signup(data);
  const { access_token, user } = response.data;
  
  // CRITICAL: Set token FIRST, then set state
  localStorage.setItem('token', access_token);
  localStorage.setItem('user', JSON.stringify(user));
  
  // Add a small delay to ensure localStorage is written
  await new Promise(resolve => setTimeout(resolve, 100));
  
  setUser(user);
  
  return user;
};

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (data) => {
    const response = await authAPI.updateProfile(data);
    setProfile(response.data.profile);
    return response.data.profile;
  };

  const value = {
    user,
    profile,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isDoctor: user?.role === 'doctor',
    isPatient: user?.role === 'patient',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};