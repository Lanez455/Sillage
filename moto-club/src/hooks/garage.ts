import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { removeImage, uploadImage } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import type { Bike } from '@/lib/types';

export function useBikes(ownerId: string) {
  return useQuery({
    queryKey: ['bikes', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bikes')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Bike[];
    },
  });
}

export function useBike(id: string) {
  return useQuery({
    queryKey: ['bike', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('bikes').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Bike;
    },
  });
}

export type BikeInput = {
  brand: string;
  model: string;
  year: number | null;
  displacement_cc: number | null;
  mileage_km: number | null;
  description: string | null;
  modifications: string | null;
};

/** Crée ou met à jour une moto. `photoUri` : nouvelle photo locale à envoyer. */
export function useSaveBike(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      photoUri,
      previousPhoto,
    }: {
      id?: string;
      input: BikeInput;
      photoUri?: string | null;
      previousPhoto?: string | null;
    }) => {
      let photo_path: string | undefined;
      if (photoUri) photo_path = await uploadImage('bike-photos', userId, photoUri);

      const row = { ...input, ...(photo_path ? { photo_path } : {}) };
      const query = id
        ? supabase.from('bikes').update(row).eq('id', id).select().single()
        : supabase.from('bikes').insert(row).select().single();
      const { data, error } = await query;
      if (error) {
        if (photo_path) await removeImage('bike-photos', photo_path);
        throw error;
      }
      if (photo_path && previousPhoto) await removeImage('bike-photos', previousPhoto);
      return data as Bike;
    },
    onSuccess: (bike) => {
      qc.setQueryData(['bike', bike.id], bike);
      qc.invalidateQueries({ queryKey: ['bikes', userId] });
      qc.invalidateQueries({ queryKey: ['stats', userId] });
    },
  });
}

export function useDeleteBike(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bike: Bike) => {
      const { error } = await supabase.from('bikes').delete().eq('id', bike.id);
      if (error) throw error;
      await removeImage('bike-photos', bike.photo_path);
    },
    onSuccess: (_, bike) => {
      qc.removeQueries({ queryKey: ['bike', bike.id] });
      qc.invalidateQueries({ queryKey: ['bikes', userId] });
      qc.invalidateQueries({ queryKey: ['stats', userId] });
      qc.invalidateQueries({ queryKey: ['ride'] });
    },
  });
}
