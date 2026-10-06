import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { RideCard } from '@/components/RideCard';
import { Chip, Empty, ErrorView, Icon, Loading } from '@/components/ui';
import { useRides, type RideFilter } from '@/hooks/rides';
import { colors, space } from '@/lib/theme';

export default function RidesScreen() {
  const [filter, setFilter] = useState<RideFilter>({ kind: 'all', when: 'upcoming' });
  const rides = useRides(filter);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filters}>
        <Chip label="Tout" active={filter.kind === 'all'} onPress={() => setFilter({ ...filter, kind: 'all' })} />
        <Chip label="Route" active={filter.kind === 'route'} onPress={() => setFilter({ ...filter, kind: 'route' })} />
        <Chip
          label="Circuit"
          active={filter.kind === 'circuit'}
          color={colors.gold}
          onPress={() => setFilter({ ...filter, kind: 'circuit' })}
        />
        <View style={{ flex: 1 }} />
        <Chip
          label={filter.when === 'upcoming' ? 'À venir' : 'Passées'}
          active={filter.when === 'past'}
          color={colors.surface3}
          onPress={() => setFilter({ ...filter, when: filter.when === 'upcoming' ? 'past' : 'upcoming' })}
        />
      </View>

      {rides.isPending ? (
        <Loading />
      ) : rides.isError ? (
        <ErrorView error={rides.error} onRetry={rides.refetch} />
      ) : (
        <FlatList
          data={rides.data}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <RideCard ride={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          refreshControl={
            <RefreshControl refreshing={rides.isRefetching} onRefresh={rides.refetch} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <Empty
              icon="road-variant"
              title={filter.when === 'upcoming' ? 'Aucune sortie prévue' : 'Aucune sortie passée'}
              text={filter.when === 'upcoming' ? 'Lance la première : pose un parcours et ouvre la grille.' : undefined}
            />
          }
        />
      )}

      <Pressable
        accessibilityLabel="Créer une sortie"
        onPress={() => router.push('/ride/new')}
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
      >
        <Icon name="plus" size={30} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  list: { padding: space.lg, paddingTop: space.xs, paddingBottom: 120, flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: space.lg,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
