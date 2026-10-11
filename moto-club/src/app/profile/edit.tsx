import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, ErrorView, Field, Loading } from '@/components/ui';
import { useProfile, useUpdateProfile } from '@/hooks/profile';
import { errorMessage } from '@/lib/format';
import { pickImage, publicUrl } from '@/lib/photos';
import { colors, space } from '@/lib/theme';
import type { Profile } from '@/lib/types';
import { useUserId } from '@/providers/AuthProvider';

export default function EditProfile() {
  const profile = useProfile(useUserId());
  if (profile.isPending) return <Loading />;
  if (profile.isError) return <ErrorView error={profile.error} onRetry={profile.refetch} />;
  return <ProfileForm profile={profile.data} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const insets = useSafeAreaInsets();
  const update = useUpdateProfile(profile.id);

  const [pseudo, setPseudo] = useState(profile.pseudo);
  const [number, setNumber] = useState(profile.race_number ? String(profile.race_number) : '');
  const [city, setCity] = useState(profile.city ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const submit = () => {
    const n = number ? parseInt(number, 10) : null;
    if (pseudo.trim().length < 2) return Alert.alert('Pseudo trop court', '2 caractères minimum.');
    if (n != null && (n < 1 || n > 99)) return Alert.alert('Numéro invalide', 'Choisis un numéro entre 1 et 99.');
    update.mutate(
      {
        input: { pseudo: pseudo.trim(), race_number: n, city: city.trim() || null, bio: bio.trim() || null },
        avatarUri,
        previousAvatar: profile.avatar_path,
      },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('Enregistrement impossible', errorMessage(e)),
      },
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <Pressable
          style={styles.avatar}
          onPress={async () => {
            const uri = await pickImage({ aspect: [1, 1] });
            if (uri) setAvatarUri(uri);
          }}
        >
          <Avatar uri={avatarUri ?? publicUrl('avatars', profile.avatar_path)} number={number ? Number(number) : null} size={110} />
          <Text style={styles.avatarText}>Changer la photo</Text>
        </Pressable>

        <View style={styles.row}>
          <Field label="Pseudo" value={pseudo} onChangeText={setPseudo} maxLength={30} style={{ flex: 2 }} />
          <Field
            label="Numéro"
            value={number}
            onChangeText={(v) => setNumber(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="46"
            style={{ flex: 1 }}
          />
        </View>
        <Field label="Ville" value={city} onChangeText={setCity} maxLength={60} placeholder="Lyon" />
        <Field
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={280}
          placeholder="Ton style de conduite, tes routes préférées…"
        />
        <Button title="Enregistrer" icon="content-save" loading={update.isPending} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { padding: space.lg, gap: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  avatar: { alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  avatarText: { color: colors.accent, fontWeight: '800' },
});
