import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PlayerProvider } from "./context/PlayerContext";
import { PlaylistProvider } from "./context/PlaylistContext";
import { SongsProvider } from "./context/SongsContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Player from "./pages/Player";
import LikedSongs from "./pages/LikedSongs";
import NotFound from "./pages/NotFound";
import PlaylistsPage from "./pages/PlaylistsPage";
import PlaylistDetail from "./pages/PlaylistDetail";

import AdminDashboard from "./admin/AdminDashboard";
import UploadMusic from "./admin/UploadMusic";
import MusicList from "./admin/MusicList";
import UsersList from "./admin/UsersList";
import UploadPlaylistZip from "./admin/UploadPlaylistZip";
import BulkUpload from "./admin/BulkUpload"; // NEW

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import MusicPlayer from "./components/MusicPlayer";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SongsProvider>
          <PlaylistProvider>
            <PlayerProvider>
              <Routes>
                {/* Root */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected user routes */}
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/search"
                  element={
                    <ProtectedRoute>
                      <Search />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/player/:id"
                  element={
                    <ProtectedRoute>
                      <Player />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/liked"
                  element={
                    <ProtectedRoute>
                      <LikedSongs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/playlists"
                  element={
                    <ProtectedRoute>
                      <PlaylistsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/playlists/:id"
                  element={
                    <ProtectedRoute>
                      <PlaylistDetail />
                    </ProtectedRoute>
                  }
                />

                {/* Admin routes */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/upload"
                  element={
                    <AdminRoute>
                      <UploadMusic />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/songs"
                  element={
                    <AdminRoute>
                      <MusicList />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminRoute>
                      <UsersList />
                    </AdminRoute>
                  }
                />

                <Route
                  path="/admin/upload-playlist"
                  element={
                    <AdminRoute>
                      <UploadPlaylistZip />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/bulk-upload"
                  element={
                    <AdminRoute>
                      <BulkUpload />
                    </AdminRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <MusicPlayer />
            </PlayerProvider>
          </PlaylistProvider>
        </SongsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
