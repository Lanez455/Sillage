import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { supabase } from './supabase';

export type Bucket = 'bike-photos' | 'avatars';

export function publicUrl(bucket: Bucket, path: string | null | undefined) {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Propose caméra ou galerie, retourne l'URI locale de l'image choisie. */
export function pickImage(opts: { aspect?: [number, number] } = {}): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: opts.aspect ?? [4, 3],
    quality: 0.7,
  };

  return new Promise((resolve) => {
    Alert.alert('Ajouter une photo', undefined, [
      {
        text: 'Prendre une photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Accès refusé', "Autorise l'appareil photo dans les réglages.");
            return resolve(null);
          }
          const res = await ImagePicker.launchCameraAsync(options);
          resolve(res.canceled ? null : res.assets[0].uri);
        },
      },
      {
        text: 'Choisir dans la galerie',
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync(options);
          resolve(res.canceled ? null : res.assets[0].uri);
        },
      },
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/** Envoie une image locale dans `<uid>/<nom>.jpg` et retourne son chemin de stockage. */
export async function uploadImage(bucket: Bucket, userId: string, localUri: string) {
  const res = await fetch(localUri);
  const body = await res.arrayBuffer();
  const ext = localUri.split('.').pop()?.toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === 'png' || ext === 'webp' ? ext : 'jpg'}`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeImage(bucket: Bucket, path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}
