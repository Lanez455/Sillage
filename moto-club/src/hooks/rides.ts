import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { LngLat, RideDetail, RideKind, RideLevel, RideListItem } from '@/lib/types';

const PROFILE_FIELDS = 'id, pseudo, avatar_path, race_number';
const BIKE_FIELDS = 'id, brand, model, year, displacement_cc, photo_path';

export type RideFilter = {
  kind: RideKind | 'all';
  when: 'upcoming' | 'past';
};

export function useRides(filter: RideFilter) {
  return useQuery({
    queryKey: ['rides', filter],
    queryFn: async () => {
      const now = new Date().toISOString();
      let q = supabase
        .from('rides')
        .select(`*, organizer:profiles!rides_organizer_id_fkey(${PROFILE_FIELDS}), participants:ride_participants(count)`);
      q = filter.when === 'upcoming'
        ? q.gte('starts_at', now).order('starts_at', { ascending: true })
        : q.lt('starts_at', now).order('starts_at', { ascending: false });
      if (filter.kind !== 'all') q = q.eq('kind', filter.kind);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data as unknown as RideListItem[];
    },
  });
}

/** Sorties auxquelles un motard est inscrit (à venir). */
export function useMyUpcomingRides(userId: string) {
  return useQuery({
    queryKey: ['rides', 'mine', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rides')
        .select(
          `*, organizer:profiles!rides_organizer_id_fkey(${PROFILE_FIELDS}), participants:ride_participants(count), me:ride_participants!inner(user_id)`,
        )
        .eq('me.user_id', userId)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data as unknown as RideListItem[];
    },
  });
}

export function useRide(id: string) {
  return useQuery({
    queryKey: ['ride', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rides')
        .select(
          `*, organizer:profiles!rides_organizer_id_fkey(${PROFILE_FIELDS}),
           participants:ride_participants(user_id, joined_at,
             rider:profiles!ride_participants_user_id_fkey(${PROFILE_FIELDS}),
             bike:bikes!ride_participants_bike_id_fkey(${BIKE_FIELDS}))`,
        )
        .eq('id', id)
        .order('joined_at', { referencedTable: 'ride_participants', ascending: true })
        .single();
      if (error) throw error;
      return data as unknown as RideDetail;
    },
  });
}

function useInvalidateRides() {
  const qc = useQueryClient();
  return (rideId?: string) => {
    qc.invalidateQueries({ queryKey: ['rides'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
    if (rideId) qc.invalidateQueries({ queryKey: ['ride', rideId] });
  };
}

export function useJoinRide(rideId: string) {
  const invalidate = useInvalidateRides();
  return useMutation({
    mutationFn: async (bikeId: string) => {
      const { error } = await supabase.from('ride_participants').insert({ ride_id: rideId, bike_id: bikeId });
      if (error) throw error;
    },
    onSettled: () => invalidate(rideId),
  });
}

export function useChangeRideBike(rideId: string, userId: string) {
  const invalidate = useInvalidateRides();
  return useMutation({
    mutationFn: async (bikeId: string) => {
      const { error } = await supabase
        .from('ride_participants')
        .update({ bike_id: bikeId })
        .eq('ride_id', rideId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSettled: () => invalidate(rideId),
  });
}

export function useLeaveRide(rideId: string, userId: string) {
  const invalidate = useInvalidateRides();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ride_participants')
        .delete()
        .eq('ride_id', rideId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSettled: () => invalidate(rideId),
  });
}

export function useDeleteRide(rideId: string) {
  const invalidate = useInvalidateRides();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('rides').delete().eq('id', rideId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['ride', rideId] });
      invalidate();
    },
  });
}

export type NewRide = {
  title: string;
  kind: RideKind;
  level: RideLevel;
  startsAt: Date;
  meetingPoint: string;
  route: LngLat[];
  distanceKm: number;
  durationMin: number | null;
  elevationGainM: number | null;
  maxRiders: number;
  description: string;
  bikeId: string;
};

export function useCreateRide() {
  const invalidate = useInvalidateRides();
  return useMutation({
    mutationFn: async (r: NewRide) => {
      const { data, error } = await supabase.rpc('create_ride', {
        p_title: r.title.trim(),
        p_kind: r.kind,
        p_level: r.level,
        p_starts_at: r.startsAt.toISOString(),
        p_meeting_point: r.meetingPoint.trim(),
        p_route: r.route.map(([lng, lat]) => [Number(lng.toFixed(6)), Number(lat.toFixed(6))]),
        p_distance_km: Math.round(r.distanceKm * 10) / 10,
        p_duration_min: r.durationMin,
        p_elevation_gain_m: r.elevationGainM,
        p_max_riders: r.maxRiders,
        p_description: r.description.trim() || null,
        p_bike_id: r.bikeId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidate(),
  });
}
