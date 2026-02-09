import { useState, useEffect } from 'react';
import { pb, type User } from '@/lib/pocketbase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(pb.authStore.model as User | null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if auth is valid on mount
    setIsLoading(false);
    setUser(pb.authStore.model as User | null);

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange(() => {
      setUser(pb.authStore.model as User | null);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      return authData;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const [firstName, ...lastParts] = name.split(' ');
      const lastName = lastParts.join(' ') || '';

      const userData = await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        firstName,
        lastName,
        role: 'client'
      });

      // Auto-login after registration
      await login(email, password);
      return userData;
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = () => {
    pb.authStore.clear();
  };

  const loginWithGoogle = async () => {
    try {
      // Step 1: Initiate OAuth flow - this redirects to Google
      const redirectUrl = `${window.location.origin}/oauth/callback`;
      const authData = await pb.collection('users').authWithOAuth2({
        provider: 'google',
        redirectUrl: redirectUrl,
        create: true, // Auto-create user if they don't exist
      });

      // PocketBase will redirect the browser to Google automatically
      // The authData here contains the redirect URL
      return authData;
    } catch (error: any) {
      throw new Error(error.message || 'OAuth login failed');
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: pb.authStore.isValid,
    isAuthResolved: !isLoading,
    login,
    register,
    logout,
    loginWithGoogle
  };
}
