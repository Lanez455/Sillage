import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDate, formatDuration, formatKm, formatTime } from '@/lib/format';
import { colors, font, radius, space } from '@/lib/theme';
import { kindLabel, levelInfo, type RideListItem } from '@/lib/types';
import { Badge, Icon } from './ui';

export function RideCard({ ride }: { ride: RideListItem }) {
  const level = levelInfo(ride.level);
  const taken = ride.participants[0]?.count ?? 0;
  const left = ride.max_riders - taken;
  const full = left <= 0;
  const d = new Date(ride.starts_at);

  return (
    <Link href={{ pathname: '/ride/[id]', params: { id: ride.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
        <View style={[styles.stripe, { backgroundColor: level.color }]} />
        <View style={styles.date}>
          <Text style={styles.day}>{d.getDate()}</Text>
          <Text style={styles.month}>{formatDate(d).split(' ').slice(-1)[0]}</Text>
          <Text style={styles.time}>{formatTime(d)}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.badges}>
            <Badge label={kindLabel(ride.kind)} color={ride.kind === 'circuit' ? colors.gold : colors.muted} />
            <Badge label={level.label} color={level.color} />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {ride.title}
          </Text>
          <View style={styles.meta}>
            <Icon name="map-marker" size={14} color={colors.muted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {ride.meeting_point}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.metric}>{formatKm(ride.distance_km)}</Text>
            <Text style={styles.metric}>{formatDuration(ride.duration_min)}</Text>
            <View style={{ flex: 1 }} />
            <Icon name="racing-helmet" size={14} color={full ? colors.danger : colors.ok} />
            <Text style={[styles.metric, { color: full ? colors.danger : colors.text }]}>
              {full ? 'Complet' : `${taken}/${ride.max_riders}`}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  stripe: { width: 4 },
  date: {
    width: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.line,
    paddingVertical: space.md,
  },
  day: { color: colors.text, fontSize: 28, ...font.display, ...font.mono },
  month: { color: colors.accent, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  time: { color: colors.muted, fontSize: 12, marginTop: 4, ...font.mono },
  body: { flex: 1, padding: space.md, gap: 6 },
  badges: { flexDirection: 'row', gap: 6 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.muted, fontSize: 13, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  metric: { color: colors.text, fontSize: 13, fontWeight: '700', ...font.mono },
});
