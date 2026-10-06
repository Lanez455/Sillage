export type RideKind = 'route' | 'circuit';
export type RideLevel = 'detente' | 'intermediaire' | 'confirme' | 'expert';

/** Position [longitude, latitude], format GeoJSON. */
export type LngLat = [number, number];

export type Profile = {
  id: string;
  pseudo: string;
  avatar_path: string | null;
  race_number: number | null;
  city: string | null;
  bio: string | null;
  created_at: string;
};

export type ProfileSummary = Pick<Profile, 'id' | 'pseudo' | 'avatar_path' | 'race_number'>;

export type Bike = {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  year: number | null;
  displacement_cc: number | null;
  mileage_km: number | null;
  description: string | null;
  modifications: string | null;
  photo_path: string | null;
  created_at: string;
};

export type BikeSummary = Pick<
  Bike,
  'id' | 'brand' | 'model' | 'year' | 'displacement_cc' | 'photo_path'
>;

export type Ride = {
  id: string;
  organizer_id: string;
  title: string;
  kind: RideKind;
  level: RideLevel;
  starts_at: string;
  meeting_point: string;
  route: LngLat[];
  distance_km: number;
  duration_min: number | null;
  elevation_gain_m: number | null;
  max_riders: number;
  description: string | null;
  created_at: string;
};

export type RideListItem = Ride & {
  organizer: ProfileSummary;
  participants: { count: number }[];
};

export type Participant = {
  user_id: string;
  joined_at: string;
  rider: ProfileSummary;
  bike: BikeSummary | null;
};

export type RideDetail = Ride & {
  organizer: ProfileSummary;
  participants: Participant[];
};

export type PilotStats = {
  user_id: string;
  rides_done: number;
  circuit_days: number;
  expert_rides: number;
  km_total: number;
  elevation_total: number;
  rides_organized: number;
  riders_hosted: number;
  bikes_count: number;
  xp: number;
};

export const LEVELS: { value: RideLevel; label: string; color: string; short: string }[] = [
  { value: 'detente', label: 'Détente', short: 'DÉT', color: '#2ECC71' },
  { value: 'intermediaire', label: 'Intermédiaire', short: 'INT', color: '#3FA9F5' },
  { value: 'confirme', label: 'Confirmé', short: 'CONF', color: '#FF9F1C' },
  { value: 'expert', label: 'Expert', short: 'EXP', color: '#E10600' },
];

export const KINDS: { value: RideKind; label: string }[] = [
  { value: 'route', label: 'Route' },
  { value: 'circuit', label: 'Circuit' },
];

export function levelInfo(level: RideLevel) {
  return LEVELS.find((l) => l.value === level) ?? LEVELS[0];
}

export function kindLabel(kind: RideKind) {
  return KINDS.find((k) => k.value === kind)?.label ?? kind;
}
