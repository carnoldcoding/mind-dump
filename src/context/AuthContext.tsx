import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { backend } from '../api/backend';

interface AuthContextType {
  isLoggedIn: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          await backend.verifyToken(token);
          setIsLoggedIn(true);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('adminToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      const { token } = await backend.login(password);
      localStorage.setItem('adminToken', token);
      setIsLoggedIn(true);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};