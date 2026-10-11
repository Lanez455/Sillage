import Mapbox, { Camera, CircleLayer, LineLayer, MapView, ShapeSource } from '@rnmapbox/maps';
import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { bounds } from '@/lib/geo';
import { colors } from '@/lib/theme';
import type { LngLat } from '@/lib/types';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

export const MAP_STYLE = Mapbox.StyleURL.Dark;
export const FRANCE_CENTER: LngLat = [2.35, 46.6];

/** Couches partagées : tracé + départ (vert) + arrivée (damier) + points intermédiaires. */
export function RouteLayers({ points, showVertices = false }: { points: LngLat[]; showVertices?: boolean }) {
  const line = useMemo<GeoJSON.Feature<GeoJSON.LineString>>(
    () => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } }),
    [points],
  );
  const markers = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: 'FeatureCollection',
      features: points.map((p, i) => ({
        type: 'Feature',
        properties: {
          role: i === 0 ? 'start' : i === points.length - 1 && points.length > 1 ? 'end' : 'mid',
        },
        geometry: { type: 'Point', coordinates: p },
      })),
    }),
    [points],
  );

  return (
    <>
      {points.length > 1 && (
        <ShapeSource id="route-line" shape={line}>
          <LineLayer
            id="route-line-casing"
            style={{ lineColor: '#000', lineWidth: 8, lineOpacity: 0.6, lineJoin: 'round', lineCap: 'round' }}
          />
          <LineLayer
            id="route-line-main"
            aboveLayerID="route-line-casing"
            style={{ lineColor: colors.accent, lineWidth: 4.5, lineJoin: 'round', lineCap: 'round' }}
          />
        </ShapeSource>
      )}
      <ShapeSource id="route-points" shape={markers}>
        <CircleLayer
          id="route-mid"
          filter={['==', ['get', 'role'], 'mid']}
          style={{
            circleRadius: 5,
            circleColor: '#fff',
            circleStrokeColor: colors.accent,
            circleStrokeWidth: 2,
            visibility: showVertices ? 'visible' : 'none',
          }}
        />
        <CircleLayer
          id="route-end"
          filter={['==', ['get', 'role'], 'end']}
          style={{ circleRadius: 9, circleColor: '#fff', circleStrokeColor: '#111', circleStrokeWidth: 4 }}
        />
        <CircleLayer
          id="route-start"
          filter={['==', ['get', 'role'], 'start']}
          style={{ circleRadius: 9, circleColor: colors.ok, circleStrokeColor: '#fff', circleStrokeWidth: 3 }}
        />
      </ShapeSource>
    </>
  );
}

/** Carte en lecture seule, cadrée sur le parcours. */
export function RouteMap({
  points,
  interactive = false,
  style,
}: {
  points: LngLat[];
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const b = bounds(points);
  return (
    <View style={[styles.wrap, style]} pointerEvents={interactive ? 'auto' : 'none'}>
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL={MAP_STYLE}
        scaleBarEnabled={false}
        compassEnabled={interactive}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={false}
      >
        <Camera
          bounds={b ? { ne: b.ne, sw: b.sw } : undefined}
          centerCoordinate={b ? undefined : FRANCE_CENTER}
          zoomLevel={b ? undefined : 5}
          padding={{ paddingTop: 40, paddingBottom: 40, paddingLeft: 40, paddingRight: 40 }}
          animationDuration={0}
        />
        <RouteLayers points={points} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.surface2 },
});
