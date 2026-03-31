import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

const MusicPlayer = () => {
  const {
    currentSong, isPlaying, togglePlay, playNext, playPrev, audioRef,
    repeat, cycleRepeat, shuffle, toggleShuffle,
    songs, removeFromQueue, showQueue, toggleQueue,
  } = usePlayer();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [mini, setMini] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    const update = () => { setProgress(audio.currentTime); setDuration(audio.duration || 0); };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', update);
    return () => { audio.removeEventListener('timeupdate', update); audio.removeEventListener('loadedmetadata', update); };
  }, [audioRef]);

  const handleSeek = (e) => { const v = Number(e.target.value); audioRef.current.currentTime = v; setProgress(v); };
  const handleVolume = (e) => { const v = Number(e.target.value); audioRef.current.volume = v; setVolume(v); };
  const fmt = (t) => { if (!t || isNaN(t)) return '0:00'; const m = Math.floor(t / 60); return `${m}:${Math.floor(t % 60).toString().padStart(2, '0')}`; };
  const pct = duration ? (progress / duration) * 100 : 0;

  if (!currentSong) return null;

  // Mini pill mode
  if (mini) {
    return (
      <div style={styles.miniBar}>
        <img src={currentSong.coverUrl} alt="" style={styles.miniCover} onError={e => { e.target.src = 'https://placehold.co/36x36/111/555?text=♪'; }} />
        <div style={styles.miniText}>
          <span style={styles.miniTitle}>{currentSong.title}</span>
          <span style={styles.miniArtist}> — {currentSong.artist}</span>
        </div>
        <button className="ctrl-btn" onClick={togglePlay} style={styles.miniPlay}>
          {isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
        </button>
        <button onClick={() => setMini(false)} style={styles.miniExpand} title="Expand player">
          <ChevronUpIcon />
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .player-bar { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .player-inner {
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; gap: 16px;
          max-width: 1200px; margin: 0 auto;
          padding: 0 20px; height: 72px;
        }
        input[type=range].player-range {
          -webkit-appearance: none; appearance: none;
          height: 3px; background: transparent; outline: none; cursor: pointer;
        }
        input[type=range].player-range::-webkit-slider-runnable-track {
          height: 3px; border-radius: 2px;
          background: linear-gradient(to right, #22c55e var(--pct, 0%), #3d3d3d var(--pct, 0%));
        }
        input[type=range].player-range::-webkit-slider-thumb {
          -webkit-appearance: none; width: 12px; height: 12px;
          border-radius: 50%; background: #fff; margin-top: -4.5px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.5); transition: transform 0.15s;
        }
        input[type=range].player-range:hover::-webkit-slider-thumb { transform: scale(1.25); }
        .ctrl-btn { background: none; border: none; cursor: pointer; color: #9ca3af; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: color 0.15s; }
        .ctrl-btn:hover { color: #fff; }
        .ctrl-btn.active { color: #22c55e; }
        .play-btn { width: 38px; height: 38px; background: #22c55e; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, transform 0.15s; flex-shrink: 0; }
        .play-btn:hover { background: #16a34a; transform: scale(1.06); }
        @media (max-width: 900px) { .player-vol { display: none !important; } .player-inner { grid-template-columns: 1fr auto; } }
        @media (max-width: 640px) { .player-inner { grid-template-columns: 1fr; height: auto; padding: 10px 16px; gap: 10px; } .player-vol { display: none !important; } .time-label { display: none; } }

        /* Queue drawer */
        .queue-drawer { position: fixed; bottom: 75px; right: 16px; width: 320px; max-height: 420px; background: #1a1a1a; border: 1px solid #2d2d2d; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; z-index: 60; box-shadow: 0 16px 48px rgba(0,0,0,0.6); }
        .queue-header { padding: 14px 16px; border-bottom: 1px solid #2d2d2d; display: flex; justify-content: space-between; align-items: center; }
        .queue-list { overflow-y: auto; flex: 1; scrollbar-width: thin; scrollbar-color: #2d2d2d transparent; }
        .queue-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #1f1f1f; cursor: pointer; transition: background 0.15s; }
        .queue-item:hover { background: rgba(255,255,255,0.04); }
        .queue-item.active { background: rgba(34,197,94,0.08); }
      `}</style>

      {/* Queue Drawer */}
      {showQueue && (
        <div className="queue-drawer">
          <div className="queue-header">
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>Queue ({songs.length})</span>
            <button onClick={toggleQueue} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' }}>
              <XIcon />
            </button>
          </div>
          <div className="queue-list">
            {songs.length === 0 && <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '24px' }}>Queue is empty</p>}
            {songs.map((s, i) => (
              <div key={s.id} className={`queue-item${currentSong?.id === s.id ? ' active' : ''}`}>
                <img src={s.coverUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.src = 'https://placehold.co/36x36/111/555?text=♪'; }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: currentSong?.id === s.id ? '#22c55e' : '#fff', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</p>
                  <p style={{ color: '#6b7280', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.artist}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeFromQueue(s.id); }} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: '4px', display: 'flex' }} title="Remove">
                  <XIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="player-bar" style={styles.bar}>
        {/* Progress track */}
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${pct}%` }} />
          <input type="range" className="player-range" min="0" max={duration || 0} value={progress} step="0.1" onChange={handleSeek} style={{ '--pct': `${pct}%`, ...styles.progressInput }} />
        </div>

        <div className="player-inner">
          {/* Song info */}
          <div style={styles.songInfo}>
            <img src={currentSong.coverUrl} alt={currentSong.title} style={styles.cover} onError={e => { e.target.src = 'https://placehold.co/48x48/111/555?text=♪'; }} />
            <div style={styles.songText}>
              <p style={styles.songTitle}>{currentSong.title}</p>
              <p style={styles.songArtist}>{currentSong.artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <button className={`ctrl-btn${shuffle ? ' active' : ''}`} onClick={toggleShuffle} title="Shuffle"><ShuffleIcon /></button>
            <button className="ctrl-btn" onClick={playPrev} title="Previous"><PrevIcon /></button>
            <button className="play-btn" onClick={togglePlay}>{isPlaying ? <PauseIcon /> : <PlayIcon />}</button>
            <button className="ctrl-btn" onClick={playNext} title="Next"><NextIcon /></button>
            <button className={`ctrl-btn${repeat !== 'none' ? ' active' : ''}`} onClick={cycleRepeat} title={`Repeat: ${repeat}`}>
              {repeat === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
            </button>
            <span className="time-label" style={styles.timeLabel}>{fmt(progress)} / {fmt(duration)}</span>
          </div>

          {/* Vol + queue + mini */}
          <div className="player-vol" style={styles.vol}>
            <VolumeIcon volume={volume} />
            <input type="range" className="player-range" min="0" max="1" step="0.01" value={volume} onChange={handleVolume} style={{ '--pct': `${volume * 100}%`, width: '80px' }} />
            <button className={`ctrl-btn${showQueue ? ' active' : ''}`} onClick={toggleQueue} title="Queue"><QueueIcon /></button>
            <button className="ctrl-btn" onClick={() => setMini(true)} title="Minimize"><ChevronDownIcon /></button>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Icons ──
const PlayIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="#000"><path d="M8 5.14v14l11-7-11-7z"/></svg>;
const PauseIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="#000"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>;
const PrevIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>;
const NextIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6l5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/></svg>;
const ShuffleIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>;
const RepeatIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const RepeatOneIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><line x1="12" y1="9" x2="12" y2="15"/></svg>;
const QueueIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const ChevronDownIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>;
const ChevronUpIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>;
const XIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const VolumeIcon = ({ volume }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#6b7280">
    {volume === 0
      ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
      : volume < 0.5
      ? <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
      : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    }
  </svg>
);

const styles = {
  bar: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#1a1a1a', borderTop: '1px solid #2d2d2d',
    zIndex: 50, backdropFilter: 'blur(8px)',
  },
  progressTrack: { position: 'relative', height: '3px', background: '#2d2d2d' },
  progressFill: { position: 'absolute', top: 0, left: 0, height: '100%', background: '#22c55e', pointerEvents: 'none', transition: 'width 0.1s linear' },
  progressInput: { position: 'absolute', top: 0, left: 0, width: '100%', opacity: 0, height: '3px', margin: 0 },
  songInfo: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 },
  cover: { width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, background: '#111' },
  songText: { minWidth: 0 },
  songTitle: { color: '#fff', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' },
  songArtist: { color: '#6b7280', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  controls: { display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' },
  timeLabel: { color: '#6b7280', fontSize: '11px', marginLeft: '4px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  vol: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' },
  // Mini player
  miniBar: {
    position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
    background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: '40px',
    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px',
    zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
    maxWidth: '340px', width: 'calc(100% - 32px)',
  },
  miniCover: { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  miniText: { flex: 1, minWidth: 0, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  miniTitle: { color: '#fff', fontWeight: '600' },
  miniArtist: { color: '#6b7280' },
  miniPlay: { background: '#22c55e', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  miniExpand: { background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 },
};

export default MusicPlayer;