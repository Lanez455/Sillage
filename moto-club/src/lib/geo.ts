import type { LngLat, RideKind, RideLevel } from './types';

const R = 6371; // rayon terrestre, km

export function haversineKm(a: LngLat, b: LngLat) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance cumulée le long des points posés, en km. */
export function routeDistanceKm(points: LngLat[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return total;
}

export function bounds(points: LngLat[]): { ne: LngLat; sw: LngLat } | null {
  if (points.length === 0) return null;
  let minLng = points[0][0];
  let maxLng = points[0][0];
  let minLat = points[0][1];
  let maxLat = points[0][1];
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  // Évite un cadrage dégénéré sur un seul point.
  const pad = 0.005;
  return { ne: [maxLng + pad, maxLat + pad], sw: [minLng - pad, minLat - pad] };
}

/**
 * Durée estimée : les points sont posés à la main (lignes droites), on applique
 * un coefficient de sinuosité et une moyenne selon le niveau.
 */
const AVG_SPEED_KMH: Record<RideLevel, number> = {
  detente: 50,
  intermediaire: 60,
  confirme: 70,
  expert: 80,
};

export function estimateDurationMin(distanceKm: number, level: RideLevel, kind: RideKind) {
  if (distanceKm <= 0) return 0;
  const sinuosity = kind === 'route' ? 1.25 : 1;
  const speed = kind === 'circuit' ? AVG_SPEED_KMH[level] * 1.6 : AVG_SPEED_KMH[level];
  const minutes = ((distanceKm * sinuosity) / speed) * 60;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

/** Rééchantillonne le tracé à intervalles réguliers (max `count` points). */
export function samplePoints(points: LngLat[], count: number): LngLat[] {
  if (points.length < 2) return points;
  const total = routeDistanceKm(points);
  if (total === 0) return [points[0]];
  const step = total / (count - 1);
  const out: LngLat[] = [points[0]];
  let seg = 1;
  let segStart = 0; // distance cumulée au début du segment courant
  for (let i = 1; i < count - 1; i++) {
    const target = i * step;
    while (seg < points.length - 1 && segStart + haversineKm(points[seg - 1], points[seg]) < target) {
      segStart += haversineKm(points[seg - 1], points[seg]);
      seg++;
    }
    const a = points[seg - 1];
    const b = points[seg];
    const len = haversineKm(a, b) || 1;
    const t = Math.min(1, Math.max(0, (target - segStart) / len));
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Dénivelé positif cumulé via l'API d'altitude Open-Meteo (gratuite, sans clé).
 * Retourne null si le service est indisponible.
 */
export async function fetchElevationGain(points: LngLat[]): Promise<number | null> {
  if (points.length < 2) return 0;
  const samples = samplePoints(points, Math.min(100, Math.max(10, points.length * 4)));
  const lat = samples.map((p) => p[1].toFixed(5)).join(',');
  const lng = samples.map((p) => p[0].toFixed(5)).join(',');
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { elevation?: number[] };
    const elev = json.elevation;
    if (!elev || elev.length === 0) return null;
    let gain = 0;
    for (let i = 1; i < elev.length; i++) {
      const d = elev[i] - elev[i - 1];
      if (d > 0) gain += d;
    }
    return Math.round(gain);
  } catch {
    return null;
  }
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

/** Adresse lisible d'un point (géocodage inverse Mapbox). */
export async function reverseGeocode([lng, lat]: LngLat): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&language=fr&limit=1&access_token=${MAPBOX_TOKEN}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      features?: { properties?: { full_address?: string; name?: string; place_formatted?: string } }[];
    };
    const p = json.features?.[0]?.properties;
    return p?.full_address ?? (p?.name && p.place_formatted ? `${p.name}, ${p.place_formatted}` : p?.name) ?? null;
  } catch {
    return null;
  }
}

/** Recherche d'un lieu pour déplacer la carte. */
export async function forwardGeocode(query: string): Promise<{ label: string; center: LngLat } | null> {
  if (!MAPBOX_TOKEN || query.trim().length < 2) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&language=fr&limit=1&access_token=${MAPBOX_TOKEN}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      features?: { geometry: { coordinates: LngLat }; properties?: { full_address?: string; name?: string } }[];
    };
    const f = json.features?.[0];
    if (!f) return null;
    return { label: f.properties?.full_address ?? f.properties?.name ?? query, center: f.geometry.coordinates };
  } catch {
    return null;
  }
}
