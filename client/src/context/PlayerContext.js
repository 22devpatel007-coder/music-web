import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const PlayerContext = createContext();
export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong]   = useState(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [songs, setSongs]               = useState([]);
  const [repeat, setRepeat]             = useState('none'); // 'none' | 'one' | 'all'
  const [shuffle, setShuffle]           = useState(false);
  const audioRef = useRef(new Audio());

  // ─── core play ───────────────────────────────────────────────────────────
  const playSong = useCallback((song, songList = []) => {
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    const audio = audioRef.current;
    audio.src   = song.fileUrl;
    audio.play().catch(console.error);
    setCurrentSong(song);
    setIsPlaying(true);
    if (songList.length > 0) setSongs(songList);
  }, [currentSong]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(prev => !prev);
  }, [isPlaying]);

  // ─── next / prev (exported so MusicPlayer buttons work) ──────────────────
  const playNext = useCallback((songList, song, shuffleOn, repeatMode) => {
    const list = songList.length ? songList : [];
    if (!list.length) return;

    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
      return;
    }

    let nextIndex;
    if (shuffleOn) {
      nextIndex = Math.floor(Math.random() * list.length);
    } else {
      const idx = list.findIndex(s => s.id === song?.id);
      nextIndex  = idx + 1;

      if (nextIndex >= list.length) {
        if (repeatMode === 'all') nextIndex = 0;
        else return; // end of list, stop
      }
    }

    const next = list[nextIndex];
    audioRef.current.src = next.fileUrl;
    audioRef.current.play().catch(console.error);
    setCurrentSong(next);
    setIsPlaying(true);
  }, []);

  const playPrev = useCallback(() => {
    setSongs(prevSongs => {
      setCurrentSong(prevSong => {
        const idx = prevSongs.findIndex(s => s.id === prevSong?.id);
        if (idx <= 0) return prevSong;
        const prev = prevSongs[idx - 1];
        audioRef.current.src = prev.fileUrl;
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
        return prev;
      });
      return prevSongs;
    });
  }, []);

  // ─── THE FIX: listen for 'ended' and auto-advance ────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      // read latest state via refs to avoid stale closure
      setSongs(latestSongs => {
        setCurrentSong(latestSong => {
          // use repeat=one shortcut
          if (repeat === 'one') {
            audio.currentTime = 0;
            audio.play().catch(console.error);
            return latestSong;
          }

          if (!latestSongs.length) return latestSong;
          const idx  = latestSongs.findIndex(s => s.id === latestSong?.id);
          let next;

          if (shuffle) {
            next = latestSongs[Math.floor(Math.random() * latestSongs.length)];
          } else {
            const nextIdx = idx + 1;
            if (nextIdx >= latestSongs.length) {
              if (repeat === 'all') next = latestSongs[0];
              else {
                setIsPlaying(false); // reached end
                return latestSong;
              }
            } else {
              next = latestSongs[nextIdx];
            }
          }

          audio.src = next.fileUrl;
          audio.play().catch(console.error);
          setIsPlaying(true);
          return next;
        });
        return latestSongs;
      });
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [repeat, shuffle]); // re-attach only when mode toggles

  // ─── expose helpers for MusicPlayer UI ───────────────────────────────────
  const handlePlayNext = () => playNext(songs, currentSong, shuffle, repeat);
  const handlePlayPrev = playPrev;
  const cycleRepeat = () => setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none');
  const toggleShuffle = () => setShuffle(s => !s);

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, audioRef,
      playSong, togglePlay,
      playNext: handlePlayNext,
      playPrev: handlePlayPrev,
      repeat, cycleRepeat,
      shuffle, toggleShuffle,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};