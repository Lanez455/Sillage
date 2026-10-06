import * as Haptics from 'expo-haptics';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BikePicker } from '@/components/BikePicker';
import { RiderGrid } from '@/components/RiderGrid';
import { RouteMap } from '@/components/RouteMap';
import { Avatar, Badge, Body, Button, Card, ErrorView, Icon, Label, Loading, Stat } from '@/components/ui';
import { useBikes } from '@/hooks/garage';
import { useChangeRideBike, useDeleteRide, useJoinRide, useLeaveRide, useRide } from '@/hooks/rides';
import {
  bikeName,
  errorMessage,
  formatDuration,
  formatElevation,
  formatKm,
  formatLongDate,
  formatTime,
} from '@/lib/format';
import { publicUrl } from '@/lib/photos';
import { colors, font, space } from '@/lib/theme';
import { kindLabel, levelInfo } from '@/lib/types';
import { useUserId } from '@/providers/AuthProvider';

export default function RideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useUserId();
  const insets = useSafeAreaInsets();
  const ride = useRide(id);
  const bikes = useBikes(me);
  const join = useJoinRide(id);
  const leave = useLeaveRide(id, me);
  const changeBike = useChangeRideBike(id, me);
  const del = useDeleteRide(id);
  const [picker, setPicker] = useState<null | 'join' | 'change'>(null);
  const [openedAt] = useState(() => Date.now());

  if (ride.isPending) return <Loading />;
  if (ride.isError) return <ErrorView error={ride.error} onRetry={ride.refetch} />;

  const r = ride.data;
  const level = levelInfo(r.level);
  const mine = r.participants.find((p) => p.user_id === me);
  const isOrganizer = r.organizer_id === me;
  const started = new Date(r.starts_at).getTime() <= Math.max(openedAt, ride.dataUpdatedAt);
  const left = r.max_riders - r.participants.length;
  const full = left <= 0;

  const onPick = (bikeId: string) => {
    const mutation = picker === 'change' ? changeBike : join;
    setPicker(null);
    mutation.mutate(bikeId, {
      onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      onError: (e) => Alert.alert('Oups', errorMessage(e)),
    });
  };

  const confirmLeave = () =>
    Alert.alert('Se désinscrire ?', 'Ta place sera libérée pour un autre motard.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Me désinscrire',
        style: 'destructive',
        onPress: () => leave.mutate(undefined, { onError: (e) => Alert.alert('Oups', errorMessage(e)) }),
      },
    ]);

  const confirmDelete = () =>
    Alert.alert('Supprimer la sortie ?', 'Les inscrits seront retirés de la grille.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          del.mutate(undefined, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('Oups', errorMessage(e)),
          }),
      },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: kindLabel(r.kind),
          headerRight: isOrganizer
            ? () => (
                <Pressable onPress={confirmDelete} hitSlop={12} accessibilityLabel="Supprimer la sortie">
                  <Icon name="trash-can-outline" color={colors.danger} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={ride.isRefetching} onRefresh={ride.refetch} tintColor={colors.accent} />}
      >
        <Link href={{ pathname: '/ride/[id]/map', params: { id } }} asChild>
          <Pressable>
            <RouteMap points={r.route} style={{ height: 260 }} />
            <View style={styles.expand}>
              <Icon name="arrow-expand" size={16} />
              <Text style={styles.expandText}>Plein écran</Text>
            </View>
          </Pressable>
        </Link>

        <View style={styles.content}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Badge label={kindLabel(r.kind)} color={r.kind === 'circuit' ? colors.gold : colors.muted} />
            <Badge label={level.label} color={level.color} />
            {started && <Badge label="Terminée" color={colors.faint} />}
          </View>
          <Text style={styles.title}>{r.title}</Text>

          <View style={styles.when}>
            <Icon name="calendar-clock" color={colors.accent} />
            <Text style={styles.whenText}>
              {formatLongDate(r.starts_at)} · {formatTime(r.starts_at)}
            </Text>
          </View>

          <Card style={styles.stats}>
            <Stat icon="map-marker-distance" label="Distance" value={formatKm(r.distance_km)} />
            <Stat icon="timer-outline" label="Durée" value={formatDuration(r.duration_min)} />
            <Stat icon="image-filter-hdr" label="Dénivelé +" value={formatElevation(r.elevation_gain_m)} />
          </Card>

          <View style={{ gap: space.sm }}>
            <Label>Rendez-vous</Label>
            <View style={styles.when}>
              <Icon name="map-marker" color={colors.ok} />
              <Body style={{ flex: 1 }}>{r.meeting_point}</Body>
            </View>
          </View>

          <Link href={{ pathname: '/pilot/[id]', params: { id: r.organizer.id } }} asChild>
            <Pressable style={styles.organizer}>
              <Avatar uri={publicUrl('avatars', r.organizer.avatar_path)} number={r.organizer.race_number} size={44} />
              <View style={{ flex: 1 }}>
                <Label>Organisé par</Label>
                <Text style={styles.orgName}>{r.organizer.pseudo}</Text>
              </View>
              <Icon name="chevron-right" color={colors.faint} />
            </Pressable>
          </Link>

          {r.description ? (
            <View style={{ gap: space.sm }}>
              <Label>Le mot de l’orga</Label>
              <Body>{r.description}</Body>
            </View>
          ) : null}

          <View style={{ gap: space.md }}>
            <View style={styles.gridHeader}>
              <Label>Grille de départ</Label>
              <Text style={[styles.places, full && { color: colors.danger }]}>
                {r.participants.length}/{r.max_riders} {full ? '· complet' : `· ${left} place${left > 1 ? 's' : ''}`}
              </Text>
            </View>
            <RiderGrid participants={r.participants} maxRiders={r.max_riders} organizerId={r.organizer_id} meId={me} />
          </View>
        </View>
      </ScrollView>

      {!started && (
        <View style={[styles.cta, { paddingBottom: insets.bottom + space.md }]}>
          {mine ? (
            <View style={{ gap: space.sm }}>
              <Text style={styles.ctaInfo} numberOfLines={1}>
                Inscrit avec <Text style={{ color: colors.text, fontWeight: '800' }}>{bikeName(mine.bike)}</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button
                  title="Changer de moto"
                  variant="secondary"
                  icon="swap-horizontal"
                  style={{ flex: 1 }}
                  loading={changeBike.isPending}
                  onPress={() => setPicker('change')}
                />
                {!isOrganizer && (
                  <Button
                    title="Me retirer"
                    variant="danger"
                    style={{ flex: 1 }}
                    loading={leave.isPending}
                    onPress={confirmLeave}
                  />
                )}
              </View>
            </View>
          ) : (
            <Button
              title={full ? 'Complet' : 'Rejoindre la grille'}
              icon={full ? 'lock' : 'flag-checkered'}
              disabled={full}
              loading={join.isPending}
              onPress={() => setPicker('join')}
            />
          )}
        </View>
      )}

      <BikePicker
        visible={picker !== null}
        bikes={bikes.data ?? []}
        selectedId={mine?.bike?.id}
        onSelect={(b) => onPick(b.id)}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  title: { color: colors.text, fontSize: 30, ...font.display, marginTop: -4 },
  when: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  whenText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  stats: { flexDirection: 'row', paddingHorizontal: space.sm, paddingVertical: space.sm },
  organizer: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  orgName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  gridHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  places: { color: colors.muted, fontSize: 13, fontWeight: '700', ...font.mono },
  expand: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#000B',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  expandText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  cta: {
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
  ctaInfo: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
