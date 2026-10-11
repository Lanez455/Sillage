import { Camera, MapView } from '@rnmapbox/maps';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatKm } from '@/lib/format';
import { bounds, forwardGeocode, haversineKm, routeDistanceKm } from '@/lib/geo';
import { colors, font, radius, space } from '@/lib/theme';
import type { LngLat } from '@/lib/types';
import { FRANCE_CENTER, MAP_STYLE, RouteLayers } from './RouteMap';
import { Icon, type IconName } from './ui';

/**
 * Tracé à la main : chaque appui sur la carte ajoute un point.
 * Le premier point est le départ, le dernier l'arrivée.
 */
export function RouteEditor({
  points,
  onChange,
}: {
  points: LngLat[];
  onChange: (points: LngLat[]) => void;
}) {
  const camera = useRef<Camera>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [initial] = useState(() => bounds(points));
  const distance = routeDistanceKm(points);
  const isLoop = points.length > 2 && haversineKm(points[0], points[points.length - 1]) < 0.05;

  const add = (p: LngLat) => {
    Haptics.selectionAsync();
    onChange([...points, p]);
  };

  const search = async () => {
    Keyboard.dismiss();
    setSearching(true);
    const hit = await forwardGeocode(query);
    setSearching(false);
    if (hit) camera.current?.setCamera({ centerCoordinate: hit.center, zoomLevel: 11, animationDuration: 800 });
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL={MAP_STYLE}
        scaleBarEnabled={false}
        pitchEnabled={false}
        onPress={(f) => add(f.geometry.coordinates as LngLat)}
      >
        <Camera
          ref={camera}
          defaultSettings={
            initial
              ? { bounds: { ne: initial.ne, sw: initial.sw }, padding: { paddingTop: 140, paddingBottom: 200, paddingLeft: 40, paddingRight: 40 } }
              : { centerCoordinate: FRANCE_CENTER, zoomLevel: 5 }
          }
        />
        <RouteLayers points={points} showVertices />
      </MapView>

      <View style={styles.search}>
        <Icon name="magnify" color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Aller à une ville, un col…"
          placeholderTextColor={colors.faint}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {searching && <Text style={styles.hint}>…</Text>}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelRow}>
          <View>
            <Text style={styles.distance}>{formatKm(distance)}</Text>
            <Text style={styles.hint}>
              {points.length === 0
                ? 'Touche la carte pour poser le départ'
                : points.length === 1
                  ? 'Départ posé. Ajoute les points du parcours'
                  : `${points.length} points${isLoop ? ' · boucle' : ''}`}
            </Text>
          </View>
        </View>
        <View style={styles.tools}>
          <Tool icon="undo" label="Annuler" disabled={points.length === 0} onPress={() => onChange(points.slice(0, -1))} />
          <Tool
            icon="sync"
            label="Boucler"
            disabled={points.length < 2 || isLoop}
            onPress={() => onChange([...points, points[0]])}
          />
          <Tool
            icon="crosshairs-gps"
            label="Recadrer"
            disabled={points.length === 0}
            onPress={() => {
              const b = bounds(points);
              if (b) camera.current?.fitBounds(b.ne, b.sw, [140, 40, 200, 40], 600);
            }}
          />
          <Tool icon="delete-outline" label="Effacer" disabled={points.length === 0} onPress={() => onChange([])} />
        </View>
      </View>
    </View>
  );
}

function Tool({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.tool, disabled && { opacity: 0.35 }]}>
      <Icon name={icon} size={22} />
      <Text style={styles.toolLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    position: 'absolute',
    top: space.md,
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface + 'F0',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, minHeight: 46 },
  panel: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.lg,
    backgroundColor: colors.surface + 'F2',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.md,
  },
  panelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  distance: { color: colors.text, fontSize: 30, ...font.display, ...font.mono },
  hint: { color: colors.muted, fontSize: 13 },
  tools: { flexDirection: 'row', justifyContent: 'space-between' },
  tool: { alignItems: 'center', gap: 4, paddingHorizontal: space.sm, minWidth: 64 },
  toolLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});
