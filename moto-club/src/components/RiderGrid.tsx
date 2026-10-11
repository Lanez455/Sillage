import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { bikeName } from '@/lib/format';
import { publicUrl } from '@/lib/photos';
import { colors, font, radius, space } from '@/lib/theme';
import type { Participant } from '@/lib/types';
import { Avatar, Badge } from './ui';

/** Grille de départ : position, pilote, moto. Les places libres restent visibles. */
export function RiderGrid({
  participants,
  maxRiders,
  organizerId,
  meId,
}: {
  participants: Participant[];
  maxRiders: number;
  organizerId: string;
  meId: string;
}) {
  const free = Math.max(0, maxRiders - participants.length);
  return (
    <View style={{ gap: space.sm }}>
      {participants.map((p, i) => {
        const photo = publicUrl('bike-photos', p.bike?.photo_path);
        return (
          <Link key={p.user_id} href={{ pathname: '/pilot/[id]', params: { id: p.user_id } }} asChild>
            <Pressable style={[styles.row, p.user_id === meId && styles.me]}>
              <Text style={styles.pos}>P{i + 1}</Text>
              <Avatar uri={publicUrl('avatars', p.rider.avatar_path)} number={p.rider.race_number} size={42} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {p.rider.race_number ? `#${p.rider.race_number} ` : ''}
                    {p.rider.pseudo}
                  </Text>
                  {p.user_id === organizerId && <Badge label="Orga" color={colors.gold} />}
                </View>
                <Text style={styles.bike} numberOfLines={1}>
                  {bikeName(p.bike)}
                  {p.bike?.displacement_cc ? ` · ${p.bike.displacement_cc} cm³` : ''}
                </Text>
              </View>
              {photo && <Avatar uri={photo} size={42} />}
            </Pressable>
          </Link>
        );
      })}
      {Array.from({ length: Math.min(free, 3) }).map((_, i) => (
        <View key={`free-${i}`} style={[styles.row, styles.free]}>
          <Text style={[styles.pos, { color: colors.faint }]}>P{participants.length + i + 1}</Text>
          <Text style={styles.freeText}>Place libre</Text>
        </View>
      ))}
      {free > 3 && <Text style={styles.more}>+ {free - 3} autres places libres</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  me: { borderColor: colors.accent },
  free: { borderStyle: 'dashed', backgroundColor: 'transparent', minHeight: 60 },
  pos: { width: 34, color: colors.accent, fontSize: 18, ...font.display, ...font.mono },
  name: { color: colors.text, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  bike: { color: colors.muted, fontSize: 13 },
  freeText: { color: colors.faint, fontSize: 14, fontStyle: 'italic' },
  more: { color: colors.faint, fontSize: 13, textAlign: 'center' },
});
