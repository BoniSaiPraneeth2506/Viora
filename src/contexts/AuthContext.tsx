import React, {createContext, useContext, useState, useEffect} from 'react';
import {Alert} from 'react-native';
import * as authService from '../lib/auth';
import {Author} from '../types';

interface AuthContextType {
  user: Author | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string, username: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<Author>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<Author | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser(userData as Author);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.signIn(email, password);
      if (response.success && response.user) {
        setUser(response.user as Author);
        return true;
      } else {
        Alert.alert('Login Failed', response.message || 'Invalid credentials');
        return false;
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      Alert.alert('Error', 'Failed to sign in. Please try again.');
      return false;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    username: string,
  ): Promise<boolean> => {
    try {
      const response = await authService.signUp(email, password, name, username);
      if (response.success && response.user) {
        setUser(response.user as Author);
        return true;
      } else {
        Alert.alert('Sign Up Failed', response.message || 'Could not create account');
        return false;
      }
    } catch (error) {
      console.error('Sign up failed:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
      return false;
  }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUser = async (userData: Partial<Author>) => {
    try {
      if (!user) return;
      const response = await authService.updateProfile(user._id, userData);
      if (response.success && response.user) {
        setUser(response.user as Author);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        updateUser,
      }}>
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
