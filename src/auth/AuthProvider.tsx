import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  sessionError: string | null;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setSessionError(null);
      setIsLoading(false);
      return;
    }

    setSessionError(null);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setSession(data.session);
    } catch {
      setSession(null);
      setSessionError('session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let authEventVersion = 0;
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventVersion += 1;
      setSession(nextSession);
      setSessionError(null);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setIsPasswordRecovery(false);
      setIsLoading(false);
    });
    const initialEventVersion = authEventVersion;

    void supabase.auth
      .getSession()
      .then(({ data: sessionData, error }) => {
        if (authEventVersion !== initialEventVersion) return;
        if (error) throw error;
        setSession(sessionData.session);
        setSessionError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (authEventVersion !== initialEventVersion) return;
        setSession(null);
        setSessionError('session');
        setIsLoading(false);
      });

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured: isSupabaseConfigured,
      sessionError,
      isPasswordRecovery,
      clearPasswordRecovery,
      refreshSession,
    }),
    [clearPasswordRecovery, isLoading, isPasswordRecovery, refreshSession, session, sessionError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
