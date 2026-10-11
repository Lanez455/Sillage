import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EMPTY_STATS } from '@/lib/gamification';
import { removeImage, uploadImage } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import type { PilotStats, Profile } from '@/lib/types';

export function useProfile(id: string) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

export function usePilotStats(userId: string) {
  return useQuery({
    queryKey: ['stats', userId],
    queryFn: async (): Promise<PilotStats> => {
      const { data, error } = await supabase
        .from('pilot_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { user_id: userId, ...EMPTY_STATS };
      // numeric arrive en chaîne depuis PostgREST.
      return { ...(data as PilotStats), km_total: Number(data.km_total) };
    },
  });
}

export type ProfileInput = Pick<Profile, 'pseudo' | 'race_number' | 'city' | 'bio'>;

export function useUpdateProfile(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      avatarUri,
      previousAvatar,
    }: {
      input: ProfileInput;
      avatarUri?: string | null;
      previousAvatar?: string | null;
    }) => {
      let avatar_path: string | undefined;
      if (avatarUri) avatar_path = await uploadImage('avatars', userId, avatarUri);
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...input, ...(avatar_path ? { avatar_path } : {}) })
        .eq('id', userId)
        .select()
        .single();
      if (error) {
        if (avatar_path) await removeImage('avatars', avatar_path);
        throw error;
      }
      if (avatar_path && previousAvatar) await removeImage('avatars', previousAvatar);
      return data as Profile;
    },
    onSuccess: (profile) => {
      qc.setQueryData(['profile', userId], profile);
      qc.invalidateQueries({ queryKey: ['rides'] });
      qc.invalidateQueries({ queryKey: ['ride'] });
    },
  });
}
