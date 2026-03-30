import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

const MusicPlayer = () => {
  const { currentSong, isPlaying, togglePlay, playNext, playPrev, audioRef } = usePlayer();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    const update = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', update);
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('loadedmetadata', update);
    };
  }, [audioRef]);

  const handleSeek = (e) => {
    const val = Number(e.target.value);
    audioRef.current.currentTime = val;
    setProgress(val);
  };

  const handleVolume = (e) => {
    const val = Number(e.target.value);
    audioRef.current.volume = val;
    setVolume(val);
  };

  const fmt = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const pct = duration ? (progress / duration) * 100 : 0;

  if (!currentSong) return null;

  return (
    <>
      <style>{`
        .player-bar { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .player-inner {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          height: 72px;
        }
        .player-vol { justify-content: flex-end; }
        input[type=range].player-range {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          background: transparent;
          outline: none;
          cursor: pointer;
        }
        input[type=range].player-range::-webkit-slider-runnable-track {
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(to right, #22c55e var(--pct, 0%), #3d3d3d var(--pct, 0%));
        }
        input[type=range].player-range::-moz-range-progress {
          height: 3px;
          background: #22c55e;
          border-radius: 2px;
        }
        input[type=range].player-range::-moz-range-track {
          height: 3px;
          background: #3d3d3d;
          border-radius: 2px;
        }
        input[type=range].player-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          margin-top: -4.5px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.5);
          transition: transform 0.15s;
        }
        input[type=range].player-range:hover::-webkit-slider-thumb {
          transform: scale(1.25);
        }
        .ctrl-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s;
        }
        .ctrl-btn:hover { color: #fff; }
        .play-btn {
          width: 38px;
          height: 38px;
          background: #22c55e;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, transform 0.15s;
          flex-shrink: 0;
        }
        .play-btn:hover { background: #16a34a; transform: scale(1.06); }
        @media (max-width: 640px) {
          .player-inner {
            grid-template-columns: 1fr;
            height: auto;
            padding: 10px 16px;
            gap: 10px;
          }
          .player-song-info { grid-row: 1; }
          .player-controls { grid-row: 2; }
          .player-vol { display: none !important; }
          .time-label { display: none; }
        }
        @media (max-width: 900px) {
          .player-vol { display: none; }
          .player-inner { grid-template-columns: 1fr auto; }
        }
      `}</style>
      <div className="player-bar" style={styles.bar}>
        {/* Progress bar at very top */}
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${pct}%` }} />
          <input
            type="range"
            className="player-range"
            min="0"
            max={duration || 0}
            value={progress}
            step="0.1"
            onChange={handleSeek}
            style={{ '--pct': `${pct}%`, ...styles.progressInput }}
          />
        </div>

        <div className="player-inner">
          {/* Song info */}
          <div className="player-song-info" style={styles.songInfo}>
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              style={styles.cover}
              onError={e => { e.target.src = 'https://placehold.co/48x48/111/555?text=♪'; }}
            />
            <div style={styles.songText}>
              <p style={styles.songTitle}>{currentSong.title}</p>
              <p style={styles.songArtist}>{currentSong.artist}</p>
            </div>
          </div>

          {/* Controls + time */}
          <div className="player-controls" style={styles.controls}>
            <button className="ctrl-btn" onClick={playPrev} title="Previous">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>
            <button className="play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
                  <rect x="6" y="5" width="4" height="14" rx="1"/>
                  <rect x="14" y="5" width="4" height="14" rx="1"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
                  <path d="M8 5.14v14l11-7-11-7z"/>
                </svg>
              )}
            </button>
            <button className="ctrl-btn" onClick={playNext} title="Next">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zm2.5-6l5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/>
              </svg>
            </button>
            <span className="time-label" style={styles.timeLabel}>{fmt(progress)} / {fmt(duration)}</span>
          </div>

          {/* Volume */}
          <div className="player-vol" style={styles.vol}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#6b7280">
              {volume === 0
                ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                : volume < 0.5
                ? <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              }
            </svg>
            <input
              type="range"
              className="player-range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolume}
              style={{ '--pct': `${volume * 100}%`, width: '80px' }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

const styles = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#1a1a1a',
    borderTop: '1px solid #2d2d2d',
    zIndex: 50,
    backdropFilter: 'blur(8px)',
  },
  progressTrack: {
    position: 'relative',
    height: '3px',
    background: '#2d2d2d',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: '#22c55e',
    pointerEvents: 'none',
    transition: 'width 0.1s linear',
  },
  progressInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    opacity: 0,
    height: '3px',
    margin: 0,
  },
  songInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  cover: {
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    objectFit: 'cover',
    flexShrink: 0,
    background: '#111',
  },
  songText: {
    minWidth: 0,
  },
  songTitle: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '2px',
  },
  songArtist: {
    color: '#6b7280',
    fontSize: '11px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
  },
  timeLabel: {
    color: '#6b7280',
    fontSize: '11px',
    marginLeft: '4px',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  vol: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'flex-end',
  },
};

export default MusicPlayer;