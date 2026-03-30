import React, { createContext, useContext, useState, useRef } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songs, setSongs] = useState([]);
  const audioRef = useRef(new Audio());

  const playSong = (song, songList = []) => {
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    audioRef.current.src = song.fileUrl;
    audioRef.current.play();
    setCurrentSong(song);
    setIsPlaying(true);
    if (songList.length > 0) setSongs(songList);
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    const index = songs.findIndex(s => s.id === currentSong?.id);
    if (index < songs.length - 1) playSong(songs[index + 1], songs);
  };

  const playPrev = () => {
    const index = songs.findIndex(s => s.id === currentSong?.id);
    if (index > 0) playSong(songs[index - 1], songs);
  };

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, audioRef,
      playSong, togglePlay, playNext, playPrev
    }}>
      {children}
    </PlayerContext.Provider>
  );
};