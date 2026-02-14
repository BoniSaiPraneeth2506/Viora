import {sanityClient} from './sanity';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
  image?: string;
  bio?: string;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

const AUTH_TOKEN_KEY = '@viora_auth_token';
const USER_DATA_KEY = '@viora_user_data';

/**
 * Sign up a new user with email and password
 */
export const signUp = async (
  email: string,
  password: string,
  name: string,
  username: string,
): Promise<AuthResponse> => {
  try {
    // Check if user already exists
    const existingUser = await sanityClient.fetch(
      `*[_type == "author" && email == $email][0]`,
      {email},
    );

    if (existingUser) {
      return {
        success: false,
        message: 'User with this email already exists',
      };
    }

    // Check if username is taken
    const existingUsername = await sanityClient.fetch(
      `*[_type == "author" && username == $username][0]`,
      {username},
    );

    if (existingUsername) {
      return {
        success: false,
        message: 'Username is already taken',
      };
    }

    // Create new user in Sanity
    const newUser = await sanityClient.create({
      _type: 'author',
      name,
      email,
      username,
      password, // TODO: Hash password in production
      bio: '',
      image: null,
    });

    // Generate simple token (in production, use JWT)
    const token = `${newUser._id}_${Date.now()}`;

    // Store auth data
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(newUser));

    return {
      success: true,
      user: newUser,
      token,
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      success: false,
      message: 'Failed to create account. Please try again.',
    };
  }
};

/**
 * Sign in with email and password
 */
export const signIn = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  try {
    // Find user by email
    const user = await sanityClient.fetch(
      `*[_type == "author" && email == $email && password == $password][0]{
        _id,
        name,
        email,
        username,
        image,
        bio
      }`,
      {email, password},
    );

    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // Generate token
    const token = `${user._id}_${Date.now()}`;

    // Store auth data
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));

    return {
      success: true,
      user,
      token,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      message: 'Failed to sign in. Please try again.',
    };
  }
};

/**
 * Sign out (clear stored auth data)
 */
export const signOut = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
  } catch (error) {
    console.error('Sign out error:', error);
  }
};

/**
 * Get current user from storage
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Get auth token from storage
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Get auth token error:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  userId: string,
  updates: Partial<User>,
): Promise<AuthResponse> => {
  try {
    const updatedUser = await sanityClient
      .patch(userId)
      .set(updates)
      .commit();

    // Update stored user data
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser));

    return {
      success: true,
      user: updatedUser,
    };
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      success: false,
      message: 'Failed to update profile',
    };
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAuthToken();
  const user = await getCurrentUser();
  return !!(token && user);
};
