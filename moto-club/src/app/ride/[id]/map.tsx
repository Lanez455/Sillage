import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { RouteMap } from '@/components/RouteMap';
import { ErrorView, Loading } from '@/components/ui';
import { useRide } from '@/hooks/rides';
import { formatDuration, formatElevation, formatKm } from '@/lib/format';
import { colors, font, radius, space } from '@/lib/theme';

export default function RideMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ride = useRide(id);

  if (ride.isPending) return <Loading />;
  if (ride.isError) return <ErrorView error={ride.error} onRetry={ride.refetch} />;
  const r = ride.data;

  return (
    <View style={{ flex: 1 }}>
      <RouteMap points={r.route} interactive style={StyleSheet.absoluteFill} />
      <View style={styles.panel}>
        <Text style={styles.title} numberOfLines={1}>
          {r.title}
        </Text>
        <Text style={styles.meta}>
          {formatKm(r.distance_km)} · {formatDuration(r.duration_min)} · D+ {formatElevation(r.elevation_gain_m)}
        </Text>
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: colors.ok }]} />
          <Text style={styles.meta}>Départ</Text>
          <View style={[styles.dot, { backgroundColor: '#fff', borderWidth: 3, borderColor: '#111' }]} />
          <Text style={styles.meta}>Arrivée</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.xl,
    backgroundColor: colors.surface + 'F2',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: 4,
  },
  title: { color: colors.text, fontSize: 20, ...font.display },
  meta: { color: colors.muted, fontSize: 13, ...font.mono },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
