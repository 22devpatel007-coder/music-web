import React, {
  createContext, useContext, useState,
  useCallback, useEffect,
} from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, getDoc, serverTimestamp,
  arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const PlaylistContext = createContext();
export const usePlaylist = () => useContext(PlaylistContext);

// PERMANENT FIX: Robust Firestore Timestamp → ms conversion.
// Three cases must be handled:
//   1. Live Firestore Timestamp   → has .toDate() method
//   2. IndexedDB-restored object  → plain { _seconds, _nanoseconds } (no .toDate())
//   3. ISO string / Date / null   → fallback to new Date()
// Without this, sorting admin playlists returns 0 for all items when data
// is served from the offline IndexedDB cache (persistentLocalCache), making
// the sort a silent no-op.
function tsToMs(v) {
  if (!v) return 0;
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  if (typeof v._seconds === 'number') return v._seconds * 1000 + Math.floor((v._nanoseconds || 0) / 1e6);
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export const PlaylistProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [playlists,      setPlaylists]      = useState([]);
  const [adminPlaylists, setAdminPlaylists] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [adminLoading,   setAdminLoading]   = useState(true);

  // ── User's own playlists ──────────────────────────────────────────────────
  // Single-field where + orderBy on same field = no composite index needed.
  // isAdmin filter is done client-side to avoid compound index requirement.
  useEffect(() => {
    if (!currentUser) {
      setPlaylists([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'playlists'),
      where('ownerId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q,
      (snap) => {
        const userOwned = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => !p.isAdmin);   // client-side filter — no extra index
        setPlaylists(userOwned);
        setLoading(false);
      },
      (err) => {
        console.error('[PlaylistContext] user playlists error:', err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [currentUser]);

  // ── Admin / Library playlists ─────────────────────────────────────────────
  // Single-field query on isAdmin only — no composite index needed.
  // isPublic and sort are handled client-side.
  // PERMANENT FIX: sort uses tsToMs() which handles all three Timestamp forms
  // (live Firestore Timestamp, IndexedDB-restored plain object, ISO string).
  useEffect(() => {
    const q = query(
      collection(db, 'playlists'),
      where('isAdmin', '==', true)
    );

    const unsub = onSnapshot(q,
      (snap) => {
        const adminOnes = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.isPublic === true)
          .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt));
        setAdminPlaylists(adminOnes);
        setAdminLoading(false);
      },
      (err) => {
        console.error('[PlaylistContext] adminPlaylists error:', err.message);
        setAdminLoading(false);
      }
    );

    return unsub;
  }, []);

  // ── assertExists ──────────────────────────────────────────────────────────
  const assertExists = useCallback(async (playlistId) => {
    const snap = await getDoc(doc(db, 'playlists', playlistId));
    if (!snap.exists()) {
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      throw new Error(
        `Playlist "${playlistId}" no longer exists. It may have been deleted.`
      );
    }
    return snap;
  }, []);

  // ── CRUD (user playlists only) ────────────────────────────────────────────

  const createPlaylist = useCallback(async (name, description = '') => {
    if (!currentUser) throw new Error('Not authenticated');
    const ref = await addDoc(collection(db, 'playlists'), {
      name:        name.trim(),
      description: description.trim(),
      ownerId:     currentUser.uid,
      ownerEmail:  currentUser.email,
      songIds:     [],
      coverUrl:    '',
      coverType:   'auto',
      isPublic:    false,
      isAdmin:     false,
      isFeatured:  false,
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    });
    return ref.id;
  }, [currentUser]);

  const deletePlaylist = useCallback(async (playlistId) => {
    await deleteDoc(doc(db, 'playlists', playlistId));
  }, []);

  const updatePlaylist = useCallback(async (playlistId, fields) => {
    await assertExists(playlistId);
    await updateDoc(doc(db, 'playlists', playlistId), {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  }, [assertExists]);

  const addSongToPlaylist = useCallback(async (playlistId, songId) => {
    await assertExists(playlistId);
    await updateDoc(doc(db, 'playlists', playlistId), {
      songIds:   arrayUnion(songId),
      updatedAt: serverTimestamp(),
    });
  }, [assertExists]);

  const removeSongFromPlaylist = useCallback(async (playlistId, songId) => {
    await assertExists(playlistId);
    await updateDoc(doc(db, 'playlists', playlistId), {
      songIds:   arrayRemove(songId),
      updatedAt: serverTimestamp(),
    });
  }, [assertExists]);

  const reorderSongs = useCallback(async (playlistId, newSongIds) => {
    await assertExists(playlistId);
    await updateDoc(doc(db, 'playlists', playlistId), {
      songIds:   newSongIds,
      updatedAt: serverTimestamp(),
    });
  }, [assertExists]);

  return (
    <PlaylistContext.Provider value={{
      playlists,
      adminPlaylists,
      loading,
      adminLoading,
      createPlaylist,
      deletePlaylist,
      updatePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      reorderSongs,
    }}>
      {children}
    </PlaylistContext.Provider>
  );
};