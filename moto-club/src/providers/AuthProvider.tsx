import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  userId: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, userId: null, loading: true });

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ session, userId: session?.user.id ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Identifiant de l'utilisateur connecté (écrans protégés uniquement). */
export function useUserId() {
  const { userId } = useAuth();
  if (!userId) throw new Error('useUserId appelé hors session');
  return userId;
}
