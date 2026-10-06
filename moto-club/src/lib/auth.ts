import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = Linking.createURL('auth/callback');

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** Retourne true si une session est ouverte, false si l'email doit être confirmé. */
export async function signUpWithEmail(email: string, password: string, pseudo: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { pseudo: pseudo.trim() }, emailRedirectTo: redirectTo },
  });
  if (error) throw error;
  return data.session != null;
}

/** OAuth via le navigateur système (Google, et Apple sur Android). Flux PKCE. */
async function signInWithOAuth(provider: 'google' | 'apple') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;

  const { queryParams } = Linking.parse(result.url);
  const errDesc = queryParams?.error_description;
  if (errDesc) throw new Error(String(errDesc));
  const code = queryParams?.code;
  if (typeof code !== 'string') throw new Error('Connexion interrompue.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return true;
}

export function signInWithGoogle() {
  return signInWithOAuth('google');
}

/** Apple : natif sur iOS (jeton d'identité + nonce), navigateur ailleurs. */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') return signInWithOAuth('apple');

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error("Apple n'a pas renvoyé de jeton.");

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) throw error;

    // Apple ne transmet le nom qu'à la première connexion : on l'enregistre comme pseudo.
    const given = credential.fullName?.givenName;
    if (given) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase.auth.updateUser({ data: { full_name: given } });
        await supabase.from('profiles').update({ pseudo: given.slice(0, 30) }).eq('id', data.user.id);
      }
    }
    return true;
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
}

export function signOut() {
  return supabase.auth.signOut();
}
