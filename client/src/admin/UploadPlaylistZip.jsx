import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosUpload } from '../utils/axiosInstance';
import Navbar from '../components/Navbar';

/**
 * UploadPlaylistZip — Upload a ZIP of songs that becomes a named playlist.
 *
 * ZIP structure:
 *   playlist.zip
 *   ├── songs/
 *   │   ├── 01 - Song Title.mp3
 *   │   └── 02 - Another Song.mp3
 *   ├── covers/              ← optional per-song covers
 *   │   ├── 01 - Song Title.jpg
 *   │   └── 02 - Another Song.png
 *   ├── playlist-cover.jpg   ← optional playlist cover
 *   └── manifest.json
 *
 * manifest.json:
 * {
 *   "name": "Chill Evening",
 *   "description": "Optional description",
 *   "cover": "playlist-cover.jpg",
 *   "songs": [
 *     { "file": "01 - Song Title.mp3", "title": "Song Title",
 *       "artist": "Artist", "genre": "Pop", "duration": 214 }
 *   ]
 * }
 *
 * Duplicate songs are SKIPPED with a toast notification and added to the
 * playlist using their existing Firestore ID — so the playlist still
 * includes those songs even if they weren't re-uploaded.
 */

const JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

const loadJSZip = () =>
  new Promise((resolve, reject) => {
    if (window.JSZip) return resolve(window.JSZip);
    const script = document.createElement('script');
    script.src = JSZIP_CDN;
    script.onload = () => resolve(window.JSZip);
    script.onerror = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(script);
  });

// ── Toast notification (non-blocking duplicate alert) ─────────────────────────
const Toast = ({ toasts }) => (
  <div style={toastStyles.container}>
    {toasts.map((t) => (
      <div key={t.id} style={{
        ...toastStyles.toast,
        background: t.type === 'duplicate' ? '#1a1a2e' : '#1a2e1a',
        borderColor: t.type === 'duplicate' ? '#f59e0b' : '#22c55e',
      }}>
        <span style={{ fontSize: 14 }}>{t.type === 'duplicate' ? '⚠️' : '✓'}</span>
        <span style={toastStyles.msg}>{t.message}</span>
      </div>
    ))}
  </div>
);

const toastStyles = {
  container: {
    position: 'fixed', top: 80, right: 20, zIndex: 999,
    display: 'flex', flexDirection: 'column', gap: 8,
    maxWidth: 360, pointerEvents: 'none',
  },
  toast: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    border: '1px solid', borderRadius: 10,
    padding: '12px 14px', fontSize: 13, color: '#e5e7eb',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    animation: 'slideIn 0.3s ease',
  },
  msg: { flex: 1, lineHeight: 1.4 },
};

let toastIdCounter = 0;

const UploadPlaylistZip = () => {
  const navigate = useNavigate();
  const dropRef  = useRef(null);

  const [zipFile,  setZipFile]  = useState(null);
  const [dragging, setDragging] = useState(false);
  const [stage,    setStage]    = useState('idle'); // idle | parsing | uploading | done
  const [manifest, setManifest] = useState(null);  // parsed manifest object
  const [results,  setResults]  = useState([]);    // per-song results
  const [current,  setCurrent]  = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [globalError, setGlobalError] = useState('');
  const [toasts,   setToasts]   = useState([]);

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = (message, type = 'duplicate') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.zip')) handleZipSelected(file);
    else setGlobalError('Please drop a .zip file.');
  };
  const onFileInput = (e) => { if (e.target.files[0]) handleZipSelected(e.target.files[0]); };

  // ── Parse ZIP ─────────────────────────────────────────────────────────────
  const handleZipSelected = async (file) => {
    setGlobalError('');
    setZipFile(file);
    setStage('parsing');
    setManifest(null);
    setResults([]);

    try {
      const JSZip = await loadJSZip();
      const zip   = await JSZip.loadAsync(file);

      const manifestEntry = Object.values(zip.files).find(
        (f) => !f.dir && f.name.toLowerCase().endsWith('manifest.json')
      );
      if (!manifestEntry) throw new Error('manifest.json not found in ZIP.');

      const raw  = await manifestEntry.async('string');
      const data = JSON.parse(raw);

      if (!data.name || !data.name.trim()) throw new Error('manifest.json must have a "name" field.');
      if (!Array.isArray(data.songs) || data.songs.length === 0) throw new Error('manifest.json must have a non-empty "songs" array.');

      data.songs.forEach((s, i) => {
        if (!s.file)   throw new Error(`songs[${i}] missing "file" field.`);
        if (!s.title)  throw new Error(`songs[${i}] missing "title" field.`);
        if (!s.artist) throw new Error(`songs[${i}] missing "artist" field.`);
        if (!s.genre)  throw new Error(`songs[${i}] missing "genre" field.`);
      });

      setManifest(data);
      setStage('idle');
    } catch (err) {
      setGlobalError(err.message);
      setStage('idle');
      setZipFile(null);
    }
  };

  // ── Upload all songs then create playlist ─────────────────────────────────
  const handleUploadAll = async () => {
    if (!zipFile || !manifest) return;
    setGlobalError('');
    setStage('uploading');
    setProgress({ done: 0, total: manifest.songs.length });
    setResults([]);

    const JSZip = await loadJSZip();
    const zip   = await JSZip.loadAsync(zipFile);

    // Flat filename → ZipEntry map
    const fileMap = {};
    Object.values(zip.files).forEach((f) => {
      if (!f.dir) fileMap[f.name.split('/').pop()] = f;
    });

    // Upload playlist cover if specified
    let playlistCoverUrl = '';
    let playlistCoverStoragePath = '';
    if (manifest.cover && fileMap[manifest.cover]) {
      try {
        const coverBlob = await fileMap[manifest.cover].async('blob');
        const ext       = manifest.cover.split('.').pop();
        const coverFile = new File([coverBlob], manifest.cover, { type: `image/${ext}` });
        const fd = new FormData();
        fd.append('cover', coverFile);
        // We reuse the upload-song endpoint just for the cover — skip song
        // Actually we'll upload playlist cover separately after songs are done
        // Store blob for later
        playlistCoverUrl = `__blob__`; // sentinel — handled below
      } catch (err) {
        console.warn('[UploadPlaylistZip] Playlist cover upload failed:', err.message);
      }
    }

    const newResults = [];
    const collectedSongIds = [];

    for (let i = 0; i < manifest.songs.length; i++) {
      const entry = manifest.songs[i];
      setCurrent(entry.title);

      try {
        const songEntry = fileMap[entry.file];
        if (!songEntry) throw new Error(`File not found in ZIP: ${entry.file}`);

        const songBlob = await songEntry.async('blob');
        const songFile = new File([songBlob], entry.file, { type: 'audio/mpeg' });

        const base = entry.file.replace(/\.[^.]+$/, '');
        const coverEntry =
          fileMap[base + '.jpg']  ||
          fileMap[base + '.jpeg'] ||
          fileMap[base + '.png']  ||
          fileMap[base + '.webp'] ||
          null;

        const fd = new FormData();
        fd.append('title',    entry.title);
        fd.append('artist',   entry.artist);
        fd.append('genre',    entry.genre);
        fd.append('duration', String(entry.duration || 0));
        fd.append('song',     songFile);

        if (coverEntry) {
          const ext       = coverEntry.name.split('.').pop();
          const coverBlob = await coverEntry.async('blob');
          fd.append('cover', new File([coverBlob], `${base}.${ext}`, { type: `image/${ext}` }));
        } else {
          const placeholder = await fetch(
            'https://placehold.co/400x400/111111/555555?text=♪'
          ).then((r) => r.blob());
          fd.append('cover', new File([placeholder], `${base}-cover.png`, { type: 'image/png' }));
        }

        const res = await axiosUpload.post('/api/admin/playlists/upload-song', fd);

        if (res.data.status === 'duplicate') {
          // Non-blocking toast — continue to next song
          addToast(
            `Already exists — skipping: "${entry.title}" by ${entry.artist}`,
            'duplicate'
          );
          // Still add the existing song ID to the playlist
          collectedSongIds.push(res.data.songId);
          newResults.push({ title: entry.title, status: 'duplicate', songId: res.data.songId });
        } else {
          collectedSongIds.push(res.data.songId);
          newResults.push({ title: entry.title, status: 'uploaded', songId: res.data.songId });
        }
      } catch (err) {
        newResults.push({
          title:  entry.title,
          status: 'error',
          error:  err.response?.data?.error || err.message,
        });
      }

      setProgress({ done: i + 1, total: manifest.songs.length });
      setResults([...newResults]);
    }

    // ── Create the playlist document ──────────────────────────────────────
    const validSongIds = collectedSongIds.filter(Boolean);

    if (validSongIds.length === 0) {
      setGlobalError('No songs were successfully uploaded or found. Playlist not created.');
      setCurrent('');
      setStage('done');
      return;
    }

    try {
      // Upload playlist cover if we have one
      let finalCoverUrl = '';
      let finalCoverStoragePath = '';

      if (manifest.cover && fileMap[manifest.cover]) {
        try {
          const coverBlob = await fileMap[manifest.cover].async('blob');
          const ext       = manifest.cover.split('.').pop();
          const coverFile = new File([coverBlob], manifest.cover, { type: `image/${ext}` });
          const fd = new FormData();
          fd.append('cover', coverFile);
          // Upload cover via a dedicated endpoint — reuse upload-song with no song file
          // We'll pass it as JSON body with the cover URL approach instead:
          // Actually let's upload to a temp endpoint — we'll call update on a dummy song
          // Simplest: upload as a regular image via Cloudinary directly is not available client-side
          // Solution: pass the cover blob to the playlist creation and let the server handle it
          // For now store the object URL as a placeholder — in production you'd have a cover upload endpoint
          // We'll include the cover file in the createPlaylist call
          const playlistFd = new FormData();
          playlistFd.append('name',        manifest.name.trim());
          playlistFd.append('description', manifest.description || '');
          playlistFd.append('songIds',     JSON.stringify(validSongIds));
          playlistFd.append('cover',       coverFile);

          const playlistRes = await axiosUpload.post('/api/admin/playlists/with-cover', playlistFd);
          setCurrent('');
          setStage('done');
          return;
        } catch (coverErr) {
          console.warn('[UploadPlaylistZip] Playlist cover upload failed, creating without cover:', coverErr.message);
        }
      }

      // Create playlist (JSON — no cover or cover upload failed)
      await axiosUpload.post('/api/admin/playlists', {
        name:        manifest.name.trim(),
        description: manifest.description || '',
        songIds:     validSongIds,
        coverUrl:    finalCoverUrl,
        coverStoragePath: finalCoverStoragePath,
      });
    } catch (err) {
      setGlobalError(
        `Songs uploaded but playlist creation failed: ${err.response?.data?.error || err.message}`
      );
    }

    setCurrent('');
    setStage('done');
  };

  const handleReset = () => {
    setZipFile(null); setManifest(null); setResults([]);
    setStage('idle'); setGlobalError(''); setProgress({ done: 0, total: 0 });
    setCurrent(''); setToasts([]);
  };

  const uploadedCount  = results.filter((r) => r.status === 'uploaded').length;
  const duplicateCount = results.filter((r) => r.status === 'duplicate').length;
  const errorCount     = results.filter((r) => r.status === 'error').length;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={styles.page}>
      <Navbar />
      <Toast toasts={toasts} />

      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>

      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.heading}>Upload Playlist ZIP</h1>
          <p style={styles.subheading}>Upload a ZIP file to create a new library playlist</p>
        </div>

        {/* Format guide */}
        <div style={styles.guide}>
          <p style={styles.guideTitle}>ZIP Structure</p>
          <pre style={styles.pre}>{`your-playlist.zip
├── songs/
│   ├── 01 - Song Title.mp3
│   └── 02 - Another Song.mp3
├── covers/               ← optional per-song covers
│   ├── 01 - Song Title.jpg
│   └── 02 - Another Song.png
├── playlist-cover.jpg    ← optional playlist cover
└── manifest.json`}</pre>
          <p style={{ ...styles.guideTitle, marginTop: 12 }}>manifest.json</p>
          <pre style={styles.pre}>{`{
  "name":        "Chill Evening",
  "description": "Optional description",
  "cover":       "playlist-cover.jpg",
  "songs": [
    {
      "file":     "01 - Song Title.mp3",
      "title":    "Song Title",
      "artist":   "Artist Name",
      "genre":    "Pop",
      "duration": 214
    }
  ]
}`}</pre>
          <p style={styles.guideNote}>
            If a song already exists in the library it will be <strong>skipped</strong> but still
            added to the playlist. Duration is in <strong>seconds</strong>.
          </p>
        </div>

        {globalError && <div style={styles.errorBox}>{globalError}</div>}

        {/* Drop zone */}
        {stage !== 'uploading' && stage !== 'done' && (
          <div
            ref={dropRef}
            style={{
              ...styles.dropZone,
              borderColor: dragging ? '#22c55e' : '#2d2d2d',
              background:  dragging ? 'rgba(34,197,94,0.05)' : '#111',
              boxShadow:   dragging ? '0 0 0 3px rgba(34,197,94,0.15)' : 'none',
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div style={styles.dropIcon}><ZipIcon /></div>
            {zipFile ? (
              <>
                <p style={styles.dropTitle}><span style={{ color: '#22c55e' }}>✓</span> {zipFile.name}</p>
                <p style={styles.dropSub}>{(zipFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </>
            ) : (
              <>
                <p style={styles.dropTitle}>Drop your ZIP here</p>
                <p style={styles.dropSub}>or click to browse</p>
              </>
            )}
            <label style={styles.browseBtn}>
              <input type="file" accept=".zip,application/zip" onChange={onFileInput} style={{ display: 'none' }} />
              {zipFile ? 'Choose different file' : 'Browse ZIP'}
            </label>
          </div>
        )}

        {/* Manifest preview */}
        {manifest && stage !== 'uploading' && stage !== 'done' && (
          <div style={styles.preview}>
            <div style={styles.previewHeader}>
              <div>
                <p style={styles.previewTitle}>{manifest.name}</p>
                <p style={styles.previewSub}>{manifest.songs.length} songs ready to upload</p>
              </div>
              <button onClick={handleReset} style={styles.resetBtn}>Clear</button>
            </div>
            <div style={styles.manifestList}>
              {manifest.songs.map((s, i) => (
                <div key={i} style={styles.manifestRow}>
                  <span style={styles.manifestNum}>{i + 1}</span>
                  <div style={styles.manifestInfo}>
                    <p style={styles.manifestTitle}>{s.title}</p>
                    <p style={styles.manifestArtist}>{s.artist} · {s.genre}
                      {s.duration ? ` · ${Math.floor(s.duration / 60)}:${String(Math.floor(s.duration % 60)).padStart(2, '0')}` : ''}
                    </p>
                  </div>
                  <span style={styles.manifestFile}>{s.file}</span>
                </div>
              ))}
            </div>
            <button onClick={handleUploadAll} style={styles.uploadBtn}>
              Upload Playlist — {manifest.songs.length} Songs
            </button>
          </div>
        )}

        {/* Progress */}
        {(stage === 'uploading' || stage === 'done') && (
          <div style={styles.progressCard}>
            <div style={styles.progressHeader}>
              <p style={styles.progressTitle}>
                {stage === 'done'
                  ? `Done — ${uploadedCount} uploaded, ${duplicateCount} skipped, ${errorCount} failed`
                  : `Uploading ${progress.done} / ${progress.total}`}
              </p>
              <span style={styles.progressPct}>{pct}%</span>
            </div>
            <div style={styles.progressBarWrap}>
              <div style={{ ...styles.progressBarFill, width: `${pct}%` }} />
            </div>
            {current && <p style={styles.currentLabel}>Currently: {current}</p>}

            {results.length > 0 && (
              <div style={styles.resultList}>
                {results.map((r, i) => (
                  <div key={i} style={styles.resultRow}>
                    <span style={{
                      ...styles.resultStatus,
                      color: r.status === 'uploaded'  ? '#22c55e'
                           : r.status === 'duplicate' ? '#f59e0b'
                           : '#f87171',
                    }}>
                      {r.status === 'uploaded' ? '✓' : r.status === 'duplicate' ? '↩' : '✕'}
                    </span>
                    <span style={styles.resultTitle}>{r.title}</span>
                    <span style={{
                      ...styles.resultBadge,
                      background: r.status === 'uploaded'  ? 'rgba(34,197,94,0.1)'
                                : r.status === 'duplicate' ? 'rgba(245,158,11,0.1)'
                                : 'rgba(248,113,113,0.1)',
                      color: r.status === 'uploaded'  ? '#22c55e'
                           : r.status === 'duplicate' ? '#f59e0b'
                           : '#f87171',
                    }}>
                      {r.status === 'duplicate' ? 'skipped' : r.status}
                    </span>
                    {r.error && <span style={styles.resultError}>{r.error}</span>}
                  </div>
                ))}
              </div>
            )}

            {stage === 'done' && (
              <div style={styles.doneActions}>
                <button onClick={handleReset} style={styles.resetBtn2}>Upload Another</button>
                <button onClick={() => navigate('/playlists')} style={styles.viewBtn}>
                  View Playlists
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ZipIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="13" x2="12" y2="17"/>
    <polyline points="10 15 12 17 14 15"/>
  </svg>
);

const styles = {
  page:           { minHeight: '100vh', background: '#0f0f0f', fontFamily: "'Inter', sans-serif" },
  container:      { maxWidth: '720px', margin: '0 auto', padding: '32px 20px 80px' },
  pageHeader:     { marginBottom: 24 },
  heading:        { color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 4 },
  subheading:     { color: '#6b7280', fontSize: 13 },
  guide:          { background: '#111', border: '1px solid #2d2d2d', borderRadius: 12, padding: 20, marginBottom: 24 },
  guideTitle:     { color: '#9ca3af', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 },
  pre:            { background: '#0a0a0a', border: '1px solid #2d2d2d', borderRadius: 8, padding: '12px 14px', color: '#9ca3af', fontSize: 12, fontFamily: "'Fira Code', monospace", overflowX: 'auto', margin: 0 },
  guideNote:      { color: '#6b7280', fontSize: 12, marginTop: 12, lineHeight: 1.6 },
  errorBox:       { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, padding: '12px 14px', fontSize: 13, marginBottom: 20 },
  dropZone:       { border: '2px dashed #2d2d2d', borderRadius: 14, padding: '48px 24px', textAlign: 'center', transition: 'all 0.2s', marginBottom: 24 },
  dropIcon:       { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  dropTitle:      { color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 6 },
  dropSub:        { color: '#6b7280', fontSize: 13, marginBottom: 20 },
  browseBtn:      { display: 'inline-block', background: '#22c55e', color: '#000', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  preview:        { background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  previewHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #2d2d2d' },
  previewTitle:   { color: '#fff', fontSize: 15, fontWeight: 700 },
  previewSub:     { color: '#6b7280', fontSize: 12, marginTop: 2 },
  resetBtn:       { background: 'none', border: '1px solid #2d2d2d', color: '#9ca3af', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  manifestList:   { maxHeight: 300, overflowY: 'auto' },
  manifestRow:    { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1f1f1f' },
  manifestNum:    { color: '#4b5563', fontSize: 12, width: 20, textAlign: 'center', flexShrink: 0 },
  manifestInfo:   { flex: 1, minWidth: 0 },
  manifestTitle:  { color: '#fff', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  manifestArtist: { color: '#6b7280', fontSize: 11 },
  manifestFile:   { color: '#4b5563', fontSize: 11, flexShrink: 0, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  uploadBtn:      { display: 'block', width: '100%', background: '#22c55e', color: '#000', border: 'none', padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  progressCard:   { background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: 12, padding: 20 },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle:  { color: '#fff', fontSize: 14, fontWeight: 600 },
  progressPct:    { color: '#22c55e', fontSize: 14, fontWeight: 700 },
  progressBarWrap:{ height: 6, background: '#2d2d2d', borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressBarFill:{ height: '100%', background: '#22c55e', borderRadius: 3, transition: 'width 0.3s' },
  currentLabel:   { color: '#6b7280', fontSize: 12, marginBottom: 16 },
  resultList:     { maxHeight: 300, overflowY: 'auto', borderTop: '1px solid #2d2d2d', paddingTop: 12 },
  resultRow:      { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' },
  resultStatus:   { fontSize: 14, fontWeight: 700, flexShrink: 0, width: 18 },
  resultTitle:    { color: '#e5e7eb', fontSize: 13, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  resultBadge:    { borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 500, flexShrink: 0 },
  resultError:    { color: '#f87171', fontSize: 11, flexShrink: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  doneActions:    { display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' },
  resetBtn2:      { background: '#2d2d2d', color: '#9ca3af', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  viewBtn:        { background: '#22c55e', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
};

export default UploadPlaylistZip;