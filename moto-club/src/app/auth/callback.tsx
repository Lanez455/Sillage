import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Loading } from '@/components/ui';
import { supabase } from '@/lib/supabase';

/**
 * Cible des liens profonds motoclub://auth/callback (confirmation d'email).
 * Les connexions OAuth échangent leur code directement dans lib/auth.ts.
 */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [done, setDone] = useState(!code);

  useEffect(() => {
    if (!code) return;
    supabase.auth.exchangeCodeForSession(code).finally(() => setDone(true));
  }, [code]);

  if (!done) return <Loading />;
  return <Redirect href="/" />;
}
