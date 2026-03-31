import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, getDoc, serverTimestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const PlaylistContext = createContext();
export const usePlaylist = () => useContext(PlaylistContext);

export const PlaylistProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading]     = useState(true);

  // ── Real-time listener ────────────────────────────────────────────────────
  // onSnapshot fires automatically on every Firestore write, so any mutation
  // (add song, remove song, rename, delete) instantly updates all components
  // that read from this context — no manual refresh needed.
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

    const unsub = onSnapshot(q, (snap) => {
      setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('[PlaylistContext] snapshot error:', err.message);
      setLoading(false);
    });

    return unsub;
  }, [currentUser]);

  // ── assertExists: verify doc exists before mutating ───────────────────────
  // updateDoc throws "No document to update" on missing docs.
  // This check gives a clear error and instantly purges stale local state.
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

  // ── CRUD ──────────────────────────────────────────────────────────────────
  // Every write below goes straight to Firestore. The onSnapshot listener
  // above picks up the change and pushes the new state to all consumers
  // automatically — no setState() calls needed after writes.

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
      isFeatured:  false,
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    });
    return ref.id;
  }, [currentUser]);

  const deletePlaylist = useCallback(async (playlistId) => {
    await deleteDoc(doc(db, 'playlists', playlistId));
    // onSnapshot fires → stale entry removed from state automatically
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
    // onSnapshot fires → playlists[x].songIds updated → all consumers re-render
  }, [assertExists]);

  const removeSongFromPlaylist = useCallback(async (playlistId, songId) => {
    await assertExists(playlistId);
    await updateDoc(doc(db, 'playlists', playlistId), {
      songIds:   arrayRemove(songId),
      updatedAt: serverTimestamp(),
    });
    // onSnapshot fires → playlists[x].songIds updated → PlaylistDetail re-renders
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
      playlists, loading,
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