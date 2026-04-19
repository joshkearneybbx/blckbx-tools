import { useEffect, useState } from 'react';
import { pb, type User } from '@/lib/pocketbase';
import { isToolSlug, type ToolSlug } from '@/lib/tool-access';

type AllowedToolValue = ToolSlug | 'all';

type AuthSnapshot = {
  user: User | null;
  isLoading: boolean;
};

function normalizeAllowedTools(value: unknown): AllowedToolValue[] {
  if (!Array.isArray(value)) return [];

  return value.filter((tool): tool is AllowedToolValue => (
    typeof tool === 'string' && (tool === 'all' || isToolSlug(tool))
  ));
}

let authSnapshot: AuthSnapshot = {
  user: pb.authStore.model as User | null,
  isLoading: true,
};

const authListeners = new Set<(snapshot: AuthSnapshot) => void>();
let authInitPromise: Promise<void> | null = null;
let authStoreUnsubscribe: (() => void) | null = null;

function emitAuthSnapshot() {
  authListeners.forEach((listener) => {
    listener(authSnapshot);
  });
}

function setAuthSnapshot(nextSnapshot: AuthSnapshot) {
  authSnapshot = nextSnapshot;
  emitAuthSnapshot();
}

function ensureAuthStoreSubscription() {
  if (authStoreUnsubscribe) {
    return;
  }

  authStoreUnsubscribe = pb.authStore.onChange(() => {
    setAuthSnapshot({
      user: pb.authStore.model as User | null,
      isLoading: false,
    });
  });
}

async function ensureAuthInitialized() {
  ensureAuthStoreSubscription();

  if (!authSnapshot.isLoading) {
    return;
  }

  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = (async () => {
    try {
      if (pb.authStore.isValid) {
        await pb.collection('users').authRefresh();
      }
    } catch {
      pb.authStore.clear();
    } finally {
      setAuthSnapshot({
        user: pb.authStore.model as User | null,
        isLoading: false,
      });
      authInitPromise = null;
    }
  })();

  return authInitPromise;
}

export function useAuth() {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(authSnapshot);
  const { user, isLoading } = snapshot;
  const allowedTools = normalizeAllowedTools(user?.allowed_tools);
  const hasAccess = (slug: ToolSlug): boolean => (
    allowedTools.includes('all') || allowedTools.includes(slug)
  );

  useEffect(() => {
    authListeners.add(setSnapshot);
    void ensureAuthInitialized();

    return () => {
      authListeners.delete(setSnapshot);
    };
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
        role: 'client',
        allowed_tools: []
      });

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
      const redirectUrl = `${window.location.origin}/oauth/callback`;
      const authData = await pb.collection('users').authWithOAuth2({
        provider: 'google',
        redirectUrl: redirectUrl,
        create: true,
      });

      return authData;
    } catch (error: any) {
      throw new Error(error.message || 'OAuth login failed');
    }
  };

  return {
    user,
    allowedTools,
    hasAccess,
    isLoading,
    isAuthenticated: pb.authStore.isValid,
    isAuthResolved: !isLoading,
    login,
    register,
    logout,
    loginWithGoogle
  };
}
