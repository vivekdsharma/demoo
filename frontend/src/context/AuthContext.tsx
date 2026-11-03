import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { googleLoginApi, fetchCurrentUser } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  loginDemo: (email: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'reachinbox_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          // Check backend for active user
          try {
            const activeUser = await fetchCurrentUser();
            if (activeUser) {
              setUser(activeUser);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(activeUser));
            }
          } catch {
            // Not authenticated yet
          }
        }
      } catch (err) {
        console.error('[Auth] Error restoring session:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginWithGoogleCredential = async (credential: string) => {
    setLoading(true);
    try {
      const loggedUser = await googleLoginApi(credential);
      setUser(loggedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async (email: string, name: string) => {
    setLoading(true);
    try {
      const loggedUser = await googleLoginApi(undefined, email, name);
      setUser(loggedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogleCredential,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
