import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Icon } from '@/components/ui';
import { signInWithApple, signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/lib/auth';
import { errorMessage } from '@/lib/format';
import { colors, font, space } from '@/lib/theme';

export default function SignIn() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [busy, setBusy] = useState<null | 'email' | 'apple' | 'google'>(null);
  const [appleNative, setAppleNative] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleNative);
  }, []);

  const run = async (kind: 'email' | 'apple' | 'google', fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Connexion impossible', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const submit = () =>
    run('email', async () => {
      if (!email.includes('@')) throw new Error('Adresse email invalide.');
      if (mode === 'login') return signInWithEmail(email, password);
      if (pseudo.trim().length < 2) throw new Error('Choisis un pseudo (2 caractères minimum).');
      const loggedIn = await signUpWithEmail(email, password, pseudo);
      if (!loggedIn) {
        Alert.alert('Vérifie tes emails', 'Un lien de confirmation vient de t’être envoyé.');
        setMode('login');
      }
    });

  return (
    <LinearGradient colors={['#2A0503', colors.bg, colors.bg]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <Icon name="flag-checkered" size={40} color={colors.accent} />
              <Text style={styles.brand}>MOTO CLUB</Text>
              <Text style={styles.tagline}>Organise tes sorties, rejoins la grille, gagne tes galons.</Text>
            </View>

            <View style={{ gap: space.md }}>
              {Platform.OS === 'ios' && appleNative ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={14}
                  style={{ height: 50 }}
                  onPress={() => run('apple', signInWithApple)}
                />
              ) : (
                <Button
                  title="Continuer avec Apple"
                  icon="apple"
                  variant="secondary"
                  loading={busy === 'apple'}
                  onPress={() => run('apple', signInWithApple)}
                />
              )}
              <Button
                title="Continuer avec Google"
                icon="google"
                variant="secondary"
                loading={busy === 'google'}
                onPress={() => run('google', signInWithGoogle)}
              />
            </View>

            <View style={styles.separator}>
              <View style={styles.line} />
              <Text style={styles.or}>ou par email</Text>
              <View style={styles.line} />
            </View>

            <View style={{ gap: space.md }}>
              {mode === 'signup' && (
                <Field label="Pseudo" value={pseudo} onChangeText={setPseudo} placeholder="Ex. : Doc46" maxLength={30} />
              )}
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="toi@exemple.fr"
              />
              <Field
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="6 caractères minimum"
              />
              <Button
                title={mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                onPress={submit}
                loading={busy === 'email'}
              />
              <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ padding: space.sm }}>
                <Text style={styles.switch}>
                  {mode === 'login' ? 'Pas encore de compte ? Inscris-toi' : 'Déjà membre ? Connecte-toi'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.xl, gap: space.xl, flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: space.sm, marginBottom: space.lg },
  brand: { color: colors.text, fontSize: 44, ...font.display },
  tagline: { color: colors.muted, fontSize: 15, textAlign: 'center' },
  separator: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  or: { color: colors.faint, fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
  switch: { color: colors.muted, textAlign: 'center', fontSize: 14 },
});
