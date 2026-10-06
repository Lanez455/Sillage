import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BikePicker } from '@/components/BikePicker';
import { RouteEditor } from '@/components/RouteEditor';
import { RouteMap } from '@/components/RouteMap';
import { Avatar, Button, Card, Chip, Field, Icon, Label, Stat } from '@/components/ui';
import { useBikes } from '@/hooks/garage';
import { useCreateRide } from '@/hooks/rides';
import {
  bikeName,
  bikeSpecs,
  errorMessage,
  formatDuration,
  formatElevation,
  formatKm,
  formatLongDate,
  formatTime,
} from '@/lib/format';
import { estimateDurationMin, fetchElevationGain, reverseGeocode, routeDistanceKm } from '@/lib/geo';
import { publicUrl } from '@/lib/photos';
import { colors, font, radius, space } from '@/lib/theme';
import { KINDS, LEVELS, type LngLat, type RideKind, type RideLevel } from '@/lib/types';
import { useUserId } from '@/providers/AuthProvider';

function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export default function NewRide() {
  const me = useUserId();
  const insets = useSafeAreaInsets();
  const bikes = useBikes(me);
  const create = useCreateRide();

  const [step, setStep] = useState<'route' | 'details'>('route');
  const [points, setPoints] = useState<LngLat[]>([]);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<RideKind>('route');
  const [level, setLevel] = useState<RideLevel>('intermediaire');
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [meetingPoint, setMeetingPoint] = useState('');
  // null : durée estimée automatiquement tant que l'organisateur ne la saisit pas.
  const [durationInput, setDurationInput] = useState<string | null>(null);
  const [elevation, setElevation] = useState<number | null>(null);
  const [elevationLoading, setElevationLoading] = useState(false);
  const [maxRiders, setMaxRiders] = useState(8);
  const [description, setDescription] = useState('');
  const [pickedBikeId, setBikeId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const distance = useMemo(() => routeDistanceKm(points), [points]);
  const duration = durationInput ?? String(estimateDurationMin(distance, level, kind));
  // Par défaut, la première moto du garage.
  const bikeId = pickedBikeId ?? bikes.data?.[0]?.id ?? null;
  const bike = bikes.data?.find((b) => b.id === bikeId) ?? null;

  const goToDetails = async () => {
    setStep('details');
    setElevationLoading(true);
    const [gain, address] = await Promise.all([
      fetchElevationGain(points),
      meetingPoint ? Promise.resolve(null) : reverseGeocode(points[0]),
    ]);
    setElevation(gain);
    setElevationLoading(false);
    if (address) setMeetingPoint((current) => current || address);
  };

  const pickDateAndroid = () => {
    DateTimePickerAndroid.open({
      value: startsAt,
      mode: 'date',
      minimumDate: new Date(),
      onValueChange: (_, date) => {
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: true,
          onValueChange: (__, time) => setStartsAt(time),
        });
      },
    });
  };

  const submit = () => {
    const durationMin = duration.trim() ? parseInt(duration, 10) : null;
    const problems: string[] = [];
    if (title.trim().length < 3) problems.push('un titre (3 caractères minimum)');
    if (meetingPoint.trim().length < 2) problems.push('un lieu de rendez-vous');
    if (startsAt.getTime() <= Date.now()) problems.push('une date dans le futur');
    if (!bikeId) problems.push('ta moto');
    if (durationMin != null && (Number.isNaN(durationMin) || durationMin < 0)) problems.push('une durée valide');
    if (problems.length) {
      Alert.alert('Il manque quelque chose', `Indique ${problems.join(', ')}.`);
      return;
    }

    create.mutate(
      {
        title,
        kind,
        level,
        startsAt,
        meetingPoint,
        route: points,
        distanceKm: distance,
        durationMin,
        elevationGainM: elevation,
        maxRiders,
        description,
        bikeId: bikeId!,
      },
      {
        onSuccess: (id) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.dismiss();
          router.push({ pathname: '/ride/[id]', params: { id } });
        },
        onError: (e) => Alert.alert('Création impossible', errorMessage(e)),
      },
    );
  };

  if (step === 'route') {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            title: 'Trace le parcours',
            headerLeft: () => (
              <Pressable onPress={() => router.back()} hitSlop={12}>
                <Icon name="close" />
              </Pressable>
            ),
            headerRight: () => (
              <Pressable onPress={goToDetails} disabled={points.length < 2} hitSlop={12}>
                <Text style={[styles.headerAction, points.length < 2 && { opacity: 0.35 }]}>Suivant</Text>
              </Pressable>
            ),
          }}
        />
        <RouteEditor points={points} onChange={setPoints} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: 'Infos de la sortie',
          headerLeft: () => (
            <Pressable onPress={() => setStep('route')} hitSlop={12}>
              <Icon name="chevron-left" size={28} />
            </Pressable>
          ),
          headerRight: undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => setStep('route')}>
          <RouteMap points={points} style={styles.preview} />
          <View style={styles.editBadge}>
            <Icon name="pencil" size={14} />
            <Text style={styles.editText}>Modifier le tracé</Text>
          </View>
        </Pressable>

        <Card style={{ flexDirection: 'row', paddingVertical: space.sm }}>
          <Stat icon="map-marker-distance" label="Distance" value={formatKm(distance)} />
          <Stat
            icon="timer-outline"
            label="Durée"
            value={formatDuration(duration.trim() ? parseInt(duration, 10) || 0 : null)}
          />
          <Stat
            icon="image-filter-hdr"
            label="Dénivelé +"
            value={elevationLoading ? '…' : formatElevation(elevation)}
          />
        </Card>

        <Field label="Titre" value={title} onChangeText={setTitle} placeholder="Ex. : Boucle des cols du Vercors" maxLength={80} />

        <View style={{ gap: space.sm }}>
          <Label>Type</Label>
          <View style={styles.row}>
            {KINDS.map((k) => (
              <Chip
                key={k.value}
                label={k.label}
                active={kind === k.value}
                color={k.value === 'circuit' ? colors.gold : colors.accent}
                onPress={() => setKind(k.value)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Label>Niveau</Label>
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {LEVELS.map((l) => (
              <Chip key={l.value} label={l.label} active={level === l.value} color={l.color} onPress={() => setLevel(l.value)} />
            ))}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Label>Date et heure du départ</Label>
          {Platform.OS === 'ios' ? (
            <View style={styles.dateBox}>
              <DateTimePicker
                value={startsAt}
                mode="datetime"
                display="compact"
                locale="fr-FR"
                minimumDate={new Date()}
                minuteInterval={5}
                themeVariant="dark"
                accentColor={colors.accent}
                onValueChange={(_, date) => setStartsAt(date)}
              />
            </View>
          ) : (
            <Pressable onPress={pickDateAndroid} style={styles.dateBox}>
              <Icon name="calendar-clock" color={colors.accent} />
              <Text style={styles.dateText}>
                {formatLongDate(startsAt)} à {formatTime(startsAt)}
              </Text>
            </Pressable>
          )}
        </View>

        <Field
          label="Lieu de rendez-vous"
          value={meetingPoint}
          onChangeText={setMeetingPoint}
          placeholder="Ex. : Station Total, sortie 12"
          maxLength={140}
          hint="Prérempli avec l’adresse du point de départ."
        />

        <Field
          label="Durée estimée (minutes)"
          value={duration}
          onChangeText={(v) => setDurationInput(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={4}
          hint={durationInput !== null ? undefined : 'Calculée selon la distance et le niveau. Modifiable.'}
        />

        <View style={{ gap: space.sm }}>
          <Label>Nombre de places (toi compris)</Label>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => setMaxRiders((n) => Math.max(2, n - 1))}>
              <Icon name="minus" />
            </Pressable>
            <Text style={styles.stepValue}>{maxRiders}</Text>
            <Pressable style={styles.stepBtn} onPress={() => setMaxRiders((n) => Math.min(100, n + 1))}>
              <Icon name="plus" />
            </Pressable>
          </View>
        </View>

        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          placeholder="Pauses prévues, rythme, équipement, pique-nique…"
        />

        <View style={{ gap: space.sm }}>
          <Label>Ta moto</Label>
          <Pressable style={styles.bikeRow} onPress={() => setPickerOpen(true)}>
            <Avatar uri={publicUrl('bike-photos', bike?.photo_path)} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bikeName}>{bike ? bikeName(bike) : 'Choisir une moto'}</Text>
              {bike ? <Text style={styles.bikeSpecs}>{bikeSpecs(bike)}</Text> : null}
            </View>
            <Icon name="chevron-right" color={colors.faint} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button title="Publier la sortie" icon="flag-checkered" loading={create.isPending} onPress={submit} />
      </View>

      <BikePicker
        visible={pickerOpen}
        bikes={bikes.data ?? []}
        selectedId={bikeId}
        onSelect={(b) => {
          setBikeId(b.id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerAction: { color: colors.accent, fontSize: 16, fontWeight: '900' },
  form: { padding: space.lg, gap: space.lg },
  preview: { height: 160, borderRadius: radius.lg },
  editBadge: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#000B',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: space.sm },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    minHeight: 48,
  },
  dateText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { color: colors.text, fontSize: 32, minWidth: 48, textAlign: 'center', ...font.display, ...font.mono },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  bikeName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  bikeSpecs: { color: colors.muted, fontSize: 13 },
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
