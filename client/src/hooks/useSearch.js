import { useMemo } from 'react';

export default function useSearch(songs, query) {
  const results = useMemo(() => {
    const text = (query || '').trim().toLowerCase();
    if (!text) return songs || [];
    return (songs || []).filter((song) => {
      const title = (song?.title || '').toLowerCase();
      const artist = (song?.artist || '').toLowerCase();
      return title.includes(text) || artist.includes(text);
    });
  }, [songs, query]);

  return results;
}
