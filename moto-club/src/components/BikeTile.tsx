import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { bikeSpecs } from '@/lib/format';
import { publicUrl } from '@/lib/photos';
import { colors, font, radius, space } from '@/lib/theme';
import type { Bike } from '@/lib/types';
import { Icon } from './ui';

export function BikeTile({ bike }: { bike: Bike }) {
  const photo = publicUrl('bike-photos', bike.photo_path);
  return (
    <Link href={{ pathname: '/bike/[id]', params: { id: bike.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
        <View style={styles.photo}>
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <Icon name="motorbike" size={56} color={colors.faint} />
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.brand}>{bike.brand}</Text>
          <Text style={styles.model} numberOfLines={1}>
            {bike.model}
          </Text>
          <Text style={styles.specs}>{bikeSpecs(bike) || 'Fiche à compléter'}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  photo: {
    height: 180,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: space.lg, gap: 2 },
  brand: { color: colors.accent, ...font.label },
  model: { color: colors.text, fontSize: 22, ...font.display },
  specs: { color: colors.muted, fontSize: 13, ...font.mono },
});
