import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from 'features/auth/components/ProtectedRoute';
import AdminRoute from 'features/auth/components/AdminRoute';

import Login from 'features/auth/pages/Login';
import Register from 'features/auth/pages/Register';
import Home from 'features/songs/pages/Home';
import Search from 'features/search/pages/Search';
import Player from 'features/player/pages/Player';
import LikedSongs from 'features/liked/pages/LikedSongs';
import PlaylistsPage from 'features/playlists/pages/PlaylistsPage';
import PlaylistDetail from 'features/playlists/pages/PlaylistDetail';

import AdminDashboard from 'features/admin/pages/AdminDashboard';
import UploadMusic from 'features/admin/pages/UploadMusic';
import MusicList from 'features/admin/pages/MusicList';
import UsersList from 'features/admin/pages/UsersList';
import UploadPlaylistZip from 'features/admin/pages/UploadPlaylistZip';
import BulkUpload from 'features/admin/pages/BulkUpload';

import NotFound from 'shared/components/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
