import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLikedSongs, toggleLikeSong } from '../services/users.service';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useLikedSongs = (uid) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEYS.LIKED_SONGS, uid],
    queryFn: () => getLikedSongs(uid),
    enabled: !!uid,
  });

  const toggle = useMutation({
    mutationFn: (songId) => toggleLikeSong(uid, songId),
    onMutate: async (songId) => {
      await qc.cancelQueries({ queryKey: [QUERY_KEYS.LIKED_SONGS, uid] });
      const previous = qc.getQueryData([QUERY_KEYS.LIKED_SONGS, uid]);
      qc.setQueryData([QUERY_KEYS.LIKED_SONGS, uid], (old = []) =>
        old.includes(songId) ? old.filter((id) => id !== songId) : [...old, songId]
      );
      return { previous };
    },
    onError: (_, __, context) => {
      qc.setQueryData([QUERY_KEYS.LIKED_SONGS, uid], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.LIKED_SONGS, uid] }),
  });

  return {
    likedSongs: query.data ?? [],
    isLoading: query.isLoading,
    toggleLike: toggle.mutate,
  };
};

export const useToggleLikeSong = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, songId }) => toggleLikeSong(uid, songId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LIKED_SONGS, variables.uid] });
    },
  });
};
