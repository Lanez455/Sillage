import { router } from 'expo-router';
import { FlatList, RefreshControl, View } from 'react-native';
import { BikeTile } from '@/components/BikeTile';
import { Button, Empty, ErrorView, Loading } from '@/components/ui';
import { useBikes } from '@/hooks/garage';
import { colors, space } from '@/lib/theme';
import { useUserId } from '@/providers/AuthProvider';

export default function GarageScreen() {
  const bikes = useBikes(useUserId());

  if (bikes.isPending) return <Loading />;
  if (bikes.isError) return <ErrorView error={bikes.error} onRetry={bikes.refetch} />;

  return (
    <FlatList
      data={bikes.data}
      keyExtractor={(b) => b.id}
      renderItem={({ item }) => <BikeTile bike={item} />}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={bikes.isRefetching} onRefresh={bikes.refetch} tintColor={colors.accent} />}
      ListEmptyComponent={
        <Empty
          icon="garage-open-variant"
          title="Garage vide"
          text="Ajoute ta moto pour pouvoir t’inscrire aux sorties."
        />
      }
      ListFooterComponent={
        <View style={{ marginTop: bikes.data.length ? 0 : space.lg }}>
          <Button title="Ajouter une moto" icon="plus" onPress={() => router.push('/bike/new')} />
        </View>
      }
    />
  );
}
