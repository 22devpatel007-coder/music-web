import React from 'react';
import { AuthProvider } from 'features/auth/context/AuthContext';
import { SongsProvider } from 'features/songs/context/SongsContext';
import { PlaylistProvider } from 'features/playlists/context/PlaylistContext';
import { PlayerProvider } from 'features/player/context/PlayerContext';

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <SongsProvider>
        <PlaylistProvider>
          <PlayerProvider>{children}</PlayerProvider>
        </PlaylistProvider>
      </SongsProvider>
    </AuthProvider>
  );
}
