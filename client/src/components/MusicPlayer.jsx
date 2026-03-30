import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

const MusicPlayer = () => {
  const { currentSong, isPlaying, togglePlay, 
    playNext, playPrev, audioRef } = usePlayer();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;

    const updateProgress = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, [audioRef]);

  const handleSeek = (e) => {
    audioRef.current.currentTime = e.target.value;
    setProgress(e.target.value);
  };

  const formatTime = (time) => {
    if (!time) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 
      border-t border-gray-700 px-6 py-3 z-50">
      <div className="flex items-center justify-between max-w-6xl mx-auto">

        {/* Song Info */}
        <div className="flex items-center gap-4 w-1/4">
          <img
            src={currentSong.coverUrl}
            alt={currentSong.title}
            className="w-14 h-14 rounded-lg object-cover"
          />
          <div>
            <p className="text-white font-semibold text-sm truncate">
              {currentSong.title}
            </p>
            <p className="text-gray-400 text-xs">{currentSong.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center w-2/4">
          <div className="flex items-center gap-6 mb-2">
            <button onClick={playPrev}
              className="text-gray-400 hover:text-white text-xl transition">
              ⏮
            </button>
            <button onClick={togglePlay}
              className="bg-green-500 hover:bg-green-400 text-black 
                w-10 h-10 rounded-full flex items-center justify-center 
                text-xl transition">
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={playNext}
              className="text-gray-400 hover:text-white text-xl transition">
              ⏭
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-gray-400 text-xs">
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min="0"
              max={duration}
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 accent-green-500 cursor-pointer"
            />
            <span className="text-gray-400 text-xs">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-1/4 justify-end">
          <span className="text-gray-400">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            defaultValue="1"
            onChange={(e) => {
              audioRef.current.volume = e.target.value;
            }}
            className="w-24 h-1 accent-green-500 cursor-pointer"
          />
        </div>

      </div>
    </div>
  );
};

export default MusicPlayer;