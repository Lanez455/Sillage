import type { PilotStats } from './types';

/**
 * Barème d'XP (calculé en base dans la vue `pilot_stats`) :
 *   sortie terminée +100 · 1 km roulé +1 · journée circuit +50 · sortie Expert +50
 *   sortie organisée +150 · motard accueilli +10 · moto au garage +20 (5 max)
 */
export const XP_RULES = [
  { label: 'Sortie terminée', xp: '+100' },
  { label: 'Kilomètre roulé', xp: '+1' },
  { label: 'Journée circuit', xp: '+50' },
  { label: 'Sortie niveau Expert', xp: '+50' },
  { label: 'Sortie organisée', xp: '+150' },
  { label: 'Motard accueilli sur ta sortie', xp: '+10' },
  { label: 'Moto au garage (5 max)', xp: '+20' },
];

export const MAX_LEVEL = 50;

/** XP totale nécessaire pour atteindre le niveau `level` (niveau 1 = 0 XP). */
export function xpForLevel(level: number) {
  if (level <= 1) return 0;
  return Math.round(150 * Math.pow(level - 1, 1.55));
}

export function levelFromXp(xp: number) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level);
  const next = level < MAX_LEVEL ? xpForLevel(level + 1) : floor;
  const progress = level < MAX_LEVEL ? (xp - floor) / (next - floor) : 1;
  return { level, floor, next, progress, toNext: Math.max(0, next - xp) };
}

export type Rank = {
  id: string;
  label: string;
  minLevel: number;
  color: string;
  tagline: string;
};

/** Rangs inspirés de l'échelle des Grands Prix. */
export const RANKS: Rank[] = [
  { id: 'rookie', label: 'Rookie', minLevel: 1, color: '#9AA0A6', tagline: 'Premiers tours de roue' },
  { id: 'moto3', label: 'Moto3', minLevel: 5, color: '#2ECC71', tagline: 'Ça commence à attaquer' },
  { id: 'moto2', label: 'Moto2', minLevel: 10, color: '#3FA9F5', tagline: 'Régulier et rapide' },
  { id: 'motogp', label: 'MotoGP', minLevel: 18, color: '#E10600', tagline: 'Catégorie reine' },
  { id: 'champion', label: 'Champion du monde', minLevel: 30, color: '#F5B700', tagline: 'Le titre est à toi' },
  { id: 'legend', label: 'Légende', minLevel: 40, color: '#B57BFF', tagline: 'Ton nom est sur les tribunes' },
];

export function rankForLevel(level: number): Rank {
  let rank = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) rank = r;
  return rank;
}

export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null;
}

export type Trophy = {
  id: string;
  title: string;
  description: string;
  icon: string; // MaterialCommunityIcons
  tier: 'bronze' | 'argent' | 'or';
  goal: number;
  value: (s: PilotStats) => number;
};

export const TIER_COLORS = { bronze: '#CD7F32', argent: '#C0C6CC', or: '#F5B700' } as const;

export const TROPHIES: Trophy[] = [
  { id: 'first-ride', title: 'Premier départ', description: 'Termine ta première sortie', icon: 'flag-checkered', tier: 'bronze', goal: 1, value: (s) => s.rides_done },
  { id: 'regular', title: 'Habitué du paddock', description: 'Termine 10 sorties', icon: 'calendar-check', tier: 'argent', goal: 10, value: (s) => s.rides_done },
  { id: 'veteran', title: 'Vétéran', description: 'Termine 50 sorties', icon: 'medal', tier: 'or', goal: 50, value: (s) => s.rides_done },
  { id: 'km-1000', title: '1 000 bornes', description: 'Roule 1 000 km en sortie', icon: 'road-variant', tier: 'bronze', goal: 1000, value: (s) => s.km_total },
  { id: 'km-5000', title: 'Tour de France', description: 'Roule 5 000 km en sortie', icon: 'map-marker-distance', tier: 'argent', goal: 5000, value: (s) => s.km_total },
  { id: 'km-20000', title: 'Bouffeur de bitume', description: 'Roule 20 000 km en sortie', icon: 'earth', tier: 'or', goal: 20000, value: (s) => s.km_total },
  { id: 'track-1', title: 'Jour de piste', description: 'Participe à une sortie circuit', icon: 'go-kart-track', tier: 'bronze', goal: 1, value: (s) => s.circuit_days },
  { id: 'track-10', title: 'Pilote de circuit', description: '10 sorties circuit', icon: 'racing-helmet', tier: 'or', goal: 10, value: (s) => s.circuit_days },
  { id: 'climber', title: 'Grimpeur', description: 'Cumule 10 000 m de dénivelé', icon: 'image-filter-hdr', tier: 'argent', goal: 10000, value: (s) => s.elevation_total },
  { id: 'expert', title: 'Genou par terre', description: 'Termine 5 sorties niveau Expert', icon: 'fire', tier: 'or', goal: 5, value: (s) => s.expert_rides },
  { id: 'organizer', title: 'Chef de meute', description: 'Organise ta première sortie', icon: 'bullhorn', tier: 'bronze', goal: 1, value: (s) => s.rides_organized },
  { id: 'team-manager', title: 'Team manager', description: 'Organise 10 sorties', icon: 'account-group', tier: 'or', goal: 10, value: (s) => s.rides_organized },
  { id: 'host', title: 'Hôte du paddock', description: 'Accueille 25 motards sur tes sorties', icon: 'handshake', tier: 'argent', goal: 25, value: (s) => s.riders_hosted },
  { id: 'collector', title: 'Collectionneur', description: 'Gare 3 motos dans ton garage', icon: 'garage-variant', tier: 'argent', goal: 3, value: (s) => s.bikes_count },
];

export function trophyProgress(stats: PilotStats) {
  return TROPHIES.map((t) => {
    const value = t.value(stats);
    return { trophy: t, value, unlocked: value >= t.goal, ratio: Math.min(1, value / t.goal) };
  });
}

export const EMPTY_STATS: Omit<PilotStats, 'user_id'> = {
  rides_done: 0,
  circuit_days: 0,
  expert_rides: 0,
  km_total: 0,
  elevation_total: 0,
  rides_organized: 0,
  riders_hosted: 0,
  bikes_count: 0,
  xp: 0,
};
