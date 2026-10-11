import { Image } from 'expo-image';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BikeForm } from '@/components/BikeForm';
import { Avatar, Body, Button, Card, ErrorView, Icon, Label, Loading, Stat } from '@/components/ui';
import { useBike, useDeleteBike, useSaveBike } from '@/hooks/garage';
import { useProfile } from '@/hooks/profile';
import { errorMessage, formatNumber } from '@/lib/format';
import { publicUrl } from '@/lib/photos';
import { colors, font, space } from '@/lib/theme';
import { useUserId } from '@/providers/AuthProvider';

/** Fiche d'une moto. Le propriétaire peut l'éditer ou la retirer du garage. */
export default function BikeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useUserId();
  const bike = useBike(id);
  const owner = useProfile(bike.data?.owner_id ?? me);
  const save = useSaveBike(me);
  const del = useDeleteBike(me);
  const [editing, setEditing] = useState(false);

  if (bike.isPending) return <Loading />;
  if (bike.isError) return <ErrorView error={bike.error} onRetry={bike.refetch} />;

  const b = bike.data;
  const mine = b.owner_id === me;
  const photo = publicUrl('bike-photos', b.photo_path);

  if (editing) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Modifier',
            headerRight: () => (
              <Pressable onPress={() => setEditing(false)} hitSlop={12}>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>Annuler</Text>
              </Pressable>
            ),
          }}
        />
        <BikeForm
          bike={b}
          saving={save.isPending}
          onSubmit={(input, photoUri) =>
            save.mutate(
              { id: b.id, input, photoUri, previousPhoto: b.photo_path },
              {
                onSuccess: () => setEditing(false),
                onError: (e) => Alert.alert('Enregistrement impossible', errorMessage(e)),
              },
            )
          }
        />
      </>
    );
  }

  const confirmDelete = () =>
    Alert.alert('Retirer cette moto ?', 'Elle disparaîtra de ton garage. Tes inscriptions passées sont conservées.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () =>
          del.mutate(b, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('Suppression impossible', errorMessage(e)),
          }),
      },
    ]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: mine
            ? () => (
                <Pressable onPress={() => setEditing(true)} hitSlop={12} accessibilityLabel="Modifier">
                  <Icon name="pencil" />
                </Pressable>
              )
            : undefined,
        }}
      />
      <View style={styles.hero}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <Icon name="motorbike" size={96} color={colors.faint} />
        )}
      </View>

      <View style={styles.content}>
        <View>
          <Text style={styles.brand}>{b.brand}</Text>
          <Text style={styles.model}>{b.model}</Text>
        </View>

        <Card style={{ flexDirection: 'row', paddingVertical: space.sm }}>
          <Stat icon="calendar" label="Année" value={b.year ? String(b.year) : '—'} />
          <Stat icon="engine" label="Cylindrée" value={b.displacement_cc ? `${b.displacement_cc} cm³` : '—'} />
          <Stat icon="speedometer" label="Compteur" value={b.mileage_km != null ? `${formatNumber(b.mileage_km)} km` : '—'} />
        </Card>

        {b.description ? (
          <View style={{ gap: space.sm }}>
            <Label>Description</Label>
            <Body>{b.description}</Body>
          </View>
        ) : null}

        {b.modifications ? (
          <View style={{ gap: space.sm }}>
            <Label>Préparation et équipements</Label>
            <Body>{b.modifications}</Body>
          </View>
        ) : null}

        {!mine && owner.data && (
          <Link href={{ pathname: '/pilot/[id]', params: { id: owner.data.id } }} asChild>
            <Pressable style={styles.owner}>
              <Avatar uri={publicUrl('avatars', owner.data.avatar_path)} number={owner.data.race_number} size={44} />
              <View style={{ flex: 1 }}>
                <Label>Pilote</Label>
                <Text style={styles.ownerName}>{owner.data.pseudo}</Text>
              </View>
              <Icon name="chevron-right" color={colors.faint} />
            </Pressable>
          </Link>
        )}

        {mine && (
          <View style={{ gap: space.sm }}>
            {!b.description && !b.modifications && (
              <Body muted>Ajoute une description et la préparation de ta moto pour la présenter aux autres.</Body>
            )}
            <Button title="Modifier la fiche" icon="pencil" variant="secondary" onPress={() => setEditing(true)} />
            <Button title="Retirer du garage" variant="danger" loading={del.isPending} onPress={confirmDelete} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 280,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: space.lg, gap: space.lg },
  brand: { color: colors.accent, ...font.label, fontSize: 13 },
  model: { color: colors.text, fontSize: 34, ...font.display },
  owner: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  ownerName: { color: colors.text, fontSize: 17, fontWeight: '800' },
});
