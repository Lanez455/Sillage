import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BikeInput } from '@/hooks/garage';
import { pickImage, publicUrl } from '@/lib/photos';
import { colors, radius, space } from '@/lib/theme';
import type { Bike } from '@/lib/types';
import { Button, Field, Icon } from './ui';

function toInt(v: string) {
  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

/** Formulaire moto : création et édition de la fiche. */
export function BikeForm({
  bike,
  saving,
  onSubmit,
}: {
  bike?: Bike;
  saving: boolean;
  onSubmit: (input: BikeInput, photoUri: string | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const [brand, setBrand] = useState(bike?.brand ?? '');
  const [model, setModel] = useState(bike?.model ?? '');
  const [year, setYear] = useState(bike?.year ? String(bike.year) : '');
  const [cc, setCc] = useState(bike?.displacement_cc ? String(bike.displacement_cc) : '');
  const [km, setKm] = useState(bike?.mileage_km != null ? String(bike.mileage_km) : '');
  const [description, setDescription] = useState(bike?.description ?? '');
  const [modifications, setModifications] = useState(bike?.modifications ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const photo = photoUri ?? publicUrl('bike-photos', bike?.photo_path);

  const submit = () => {
    const y = toInt(year);
    const c = toInt(cc);
    if (!brand.trim() || !model.trim()) return Alert.alert('Fiche incomplète', 'Indique au moins la marque et le modèle.');
    if (y != null && (y < 1900 || y > new Date().getFullYear() + 1)) return Alert.alert('Année invalide');
    if (c != null && (c < 50 || c > 3000)) return Alert.alert('Cylindrée invalide', 'Entre 50 et 3000 cm³.');
    onSubmit(
      {
        brand: brand.trim(),
        model: model.trim(),
        year: y,
        displacement_cc: c,
        mileage_km: toInt(km),
        description: description.trim() || null,
        modifications: modifications.trim() || null,
      },
      photoUri,
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 110 }]} keyboardShouldPersistTaps="handled">
        <Pressable
          style={styles.photo}
          onPress={async () => {
            const uri = await pickImage({ aspect: [4, 3] });
            if (uri) setPhotoUri(uri);
          }}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={{ alignItems: 'center', gap: space.sm }}>
              <Icon name="camera-plus" size={40} color={colors.faint} />
              <Text style={styles.photoText}>Ajouter une photo</Text>
            </View>
          )}
          {photo && (
            <View style={styles.photoBadge}>
              <Icon name="camera" size={14} />
              <Text style={styles.photoBadgeText}>Changer</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.row}>
          <Field label="Marque" value={brand} onChangeText={setBrand} placeholder="Yamaha" maxLength={40} style={{ flex: 1 }} />
          <Field label="Modèle" value={model} onChangeText={setModel} placeholder="MT-09" maxLength={60} style={{ flex: 1 }} />
        </View>
        <View style={styles.row}>
          <Field label="Année" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} placeholder="2021" style={{ flex: 1 }} />
          <Field label="Cylindrée (cm³)" value={cc} onChangeText={setCc} keyboardType="number-pad" maxLength={4} placeholder="890" style={{ flex: 1 }} />
        </View>
        <Field label="Kilométrage" value={km} onChangeText={setKm} keyboardType="number-pad" maxLength={7} placeholder="18 500" />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          placeholder="Son histoire, ce que tu aimes chez elle…"
        />
        <Field
          label="Préparation et équipements"
          value={modifications}
          onChangeText={setModifications}
          multiline
          maxLength={2000}
          placeholder="Échappement, pneus, bagagerie, réglages…"
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button title={bike ? 'Enregistrer' : 'Ajouter au garage'} icon="content-save" loading={saving} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { padding: space.lg, gap: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  photo: {
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoText: { color: colors.muted, fontWeight: '700' },
  photoBadge: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#000B',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoBadgeText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.bg + 'F5',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
