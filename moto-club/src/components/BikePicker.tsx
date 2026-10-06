import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bikeName, bikeSpecs } from '@/lib/format';
import { publicUrl } from '@/lib/photos';
import { colors, radius, space } from '@/lib/theme';
import type { Bike } from '@/lib/types';
import { Avatar, Button, Icon, Title } from './ui';

/** Feuille de choix de la moto avec laquelle on vient. */
export function BikePicker({
  visible,
  bikes,
  selectedId,
  title = 'Avec quelle moto ?',
  onSelect,
  onClose,
}: {
  visible: boolean;
  bikes: Bike[];
  selectedId?: string | null;
  title?: string;
  onSelect: (bike: Bike) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.handle} />
        <Title style={{ fontSize: 22 }}>{title}</Title>
        {bikes.length === 0 ? (
          <View style={{ gap: space.md, paddingVertical: space.lg }}>
            <Text style={styles.empty}>Ton garage est vide. Ajoute ta moto pour rejoindre la grille.</Text>
            <Button
              title="Ajouter une moto"
              icon="plus"
              onPress={() => {
                onClose();
                router.push('/bike/new');
              }}
            />
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: space.sm, paddingVertical: space.md }}>
            {bikes.map((b) => {
              const active = b.id === selectedId;
              return (
                <Pressable key={b.id} onPress={() => onSelect(b)} style={[styles.item, active && styles.active]}>
                  <Avatar uri={publicUrl('bike-photos', b.photo_path)} size={52} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{bikeName(b)}</Text>
                    <Text style={styles.specs}>{bikeSpecs(b) || '—'}</Text>
                  </View>
                  <Icon
                    name={active ? 'check-circle' : 'circle-outline'}
                    color={active ? colors.accent : colors.faint}
                    size={24}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000A' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface3,
    marginBottom: space.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  active: { borderColor: colors.accent },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  specs: { color: colors.muted, fontSize: 13, marginTop: 2 },
  empty: { color: colors.muted, fontSize: 15 },
});
