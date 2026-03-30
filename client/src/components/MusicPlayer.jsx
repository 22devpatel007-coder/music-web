import { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const fmt = (t) => {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/* ─── Queue Drawer ──────────────────────────────────────────────────────────── */
const QueueDrawer = ({ songs, currentSong, onPlay, onRemove, onClose }) => (
  <div className="fixed bottom-[88px] right-4 w-80 max-h-96 bg-gray-800 rounded-2xl
    shadow-2xl border border-gray-700 overflow-hidden z-50 flex flex-col">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
      <span className="text-white font-semibold text-sm">
        Up Next · {songs.length} songs
      </span>
      <button onClick={onClose} className="text-gray-400 hover:text-white transition">
        ✕
      </button>
    </div>
    <div className="overflow-y-auto flex-1">
      {songs.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-8">Queue is empty</div>
      ) : (
        songs.map((song, i) => (
          <div
            key={song.id}
            className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-700 
              transition group cursor-pointer
              ${currentSong?.id === song.id ? 'bg-gray-700' : ''}`}>
            <span className="text-gray-600 text-xs w-4 text-center flex-shrink-0">
              {currentSong?.id === song.id ? '▶' : i + 1}
            </span>
            <img
              src={song.coverUrl}
              alt={song.title}
              className="w-9 h-9 rounded-md object-cover flex-shrink-0"
              onClick={() => onPlay(song)}
            />
            <div className="flex-1 min-w-0" onClick={() => onPlay(song)}>
              <p className={`text-xs font-medium truncate ${currentSong?.id === song.id ? 'text-green-400' : 'text-white'}`}>
                {song.title}
              </p>
              <p className="text-gray-500 text-xs truncate">{song.artist}</p>
            </div>
            <button
              onClick={() => onRemove(song.id)}
              className="text-gray-600 hover:text-red-400 transition opacity-0
                group-hover:opacity-100 text-xs flex-shrink-0">
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  </div>
);

/* ─── Main MusicPlayer ──────────────────────────────────────────────────────── */
const MusicPlayer = () => {
  const {
    currentSong, isPlaying, togglePlay,
    playNext, playPrev, audioRef,
    repeat, cycleRepeat,
    shuffle, toggleShuffle,
    isMuted, toggleMute,
    volume, handleVolumeChange,
    songs, playSong,
    showQueue, toggleQueue,
    removeFromQueue,
  } = usePlayer();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mini, setMini]         = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    const onTime = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onTime);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onTime);
    };
  }, [audioRef]);

  const handleSeek = (e) => {
    audioRef.current.currentTime = e.target.value;
    setProgress(Number(e.target.value));
  };

  if (!currentSong) return null;

  /* ── Mini player ─────────────────────────────────────────────────────────── */
  if (mini) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-gray-800 rounded-2xl
        shadow-2xl border border-gray-700 p-3 flex items-center gap-3 w-72
        hover:bg-gray-750 transition">
        <img
          src={currentSong.coverUrl}
          alt={currentSong.title}
          className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {currentSong.title}
          </p>
          <p className="text-gray-400 text-xs truncate">{currentSong.artist}</p>
        </div>
        <button
          onClick={togglePlay}
          className="bg-green-500 hover:bg-green-400 text-black
            w-9 h-9 rounded-full flex items-center justify-center
            text-lg transition flex-shrink-0">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={() => setMini(false)}
          className="text-gray-500 hover:text-white transition text-xs flex-shrink-0"
          title="Expand">
          ↑
        </button>
      </div>
    );
  }

  /* ── Full player bar ─────────────────────────────────────────────────────── */
  return (
    <>
      {/* Queue Drawer */}
      {showQueue && (
        <QueueDrawer
          songs={songs}
          currentSong={currentSong}
          onPlay={(song) => playSong(song, songs)}
          onRemove={removeFromQueue}
          onClose={toggleQueue}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900
        border-t border-gray-700 px-4 py-3 z-40">
        <div className="flex items-center justify-between max-w-6xl mx-auto gap-4">

          {/* Song Info */}
          <div className="flex items-center gap-3 w-1/4 min-w-0">
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-lg"
            />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {currentSong.title}
              </p>
              <p className="text-gray-400 text-xs truncate">{currentSong.artist}</p>
            </div>
          </div>

          {/* Controls + Progress */}
          <div className="flex flex-col items-center w-2/4">
            <div className="flex items-center gap-5 mb-2">
              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                title="Shuffle (keyboard: S)"
                className={`text-lg transition ${shuffle ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}>
                🔀
              </button>

              {/* Prev */}
              <button
                onClick={playPrev}
                title="Previous (←)"
                className="text-gray-400 hover:text-white text-xl transition">
                ⏮
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                title="Play/Pause (Space)"
                className="bg-green-500 hover:bg-green-400 text-black
                  w-11 h-11 rounded-full flex items-center justify-center
                  text-xl transition shadow-lg shadow-green-500/30">
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Next */}
              <button
                onClick={playNext}
                title="Next (→)"
                className="text-gray-400 hover:text-white text-xl transition">
                ⏭
              </button>

              {/* Repeat */}
              <button
                onClick={cycleRepeat}
                title={`Repeat: ${repeat}`}
                className={`text-lg transition ${repeat !== 'none' ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}>
                {repeat === 'one' ? '🔂' : '🔁'}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 w-full">
              <span className="text-gray-400 text-xs w-10 text-right">
                {fmt(progress)}
              </span>
              <div className="flex-1 relative group">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-1 accent-green-500 cursor-pointer
                    group-hover:accent-green-400"
                />
              </div>
              <span className="text-gray-400 text-xs w-10">
                {fmt(duration)}
              </span>
            </div>
          </div>

          {/* Right controls: Volume + Queue + Mini */}
          <div className="flex items-center gap-3 w-1/4 justify-end">
            {/* Queue toggle */}
            <button
              onClick={toggleQueue}
              title="Queue"
              className={`text-lg transition ${showQueue ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}>
              📋
            </button>

            {/* Mute */}
            <button
              onClick={toggleMute}
              title="Mute (M)"
              className="text-gray-400 hover:text-white transition text-lg">
              {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-20 h-1 accent-green-500 cursor-pointer"
            />

            {/* Mini player toggle */}
            <button
              onClick={() => setMini(true)}
              title="Minimise player"
              className="text-gray-400 hover:text-white transition text-sm ml-1">
              ↓
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MusicPlayer;