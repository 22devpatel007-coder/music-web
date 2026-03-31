import React, {
  createContext, useContext, useState,
  useCallback, useEffect,
} from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const PlaylistContext = createContext();
export const usePlaylist = () => useContext(PlaylistContext);

export const PlaylistProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Real-time listener for current user's playlists
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

  // Create
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

  // Delete
  const deletePlaylist = useCallback(async (playlistId) => {
    await deleteDoc(doc(db, 'playlists', playlistId));
  }, []);

  // Rename / update metadata
  const updatePlaylist = useCallback(async (playlistId, fields) => {
    await updateDoc(doc(db, 'playlists', playlistId), {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  }, []);

  // Add song
  const addSongToPlaylist = useCallback(async (playlistId, songId) => {
    await updateDoc(doc(db, 'playlists', playlistId), {
      songIds:   arrayUnion(songId),
      updatedAt: serverTimestamp(),
    });
  }, []);

  // Remove song
  const removeSongFromPlaylist = useCallback(async (playlistId, songId) => {
    await updateDoc(doc(db, 'playlists', playlistId), {
      songIds:   arrayRemove(songId),
      updatedAt: serverTimestamp(),
    });
  }, []);

  // Reorder songs (full array replace)
  const reorderSongs = useCallback(async (playlistId, newSongIds) => {
    await updateDoc(doc(db, 'playlists', playlistId), {
      songIds:   newSongIds,
      updatedAt: serverTimestamp(),
    });
  }, []);

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