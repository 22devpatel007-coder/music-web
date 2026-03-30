import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Search from './pages/Search';
import Player from './pages/Player';
import NotFound from './pages/NotFound';

import AdminDashboard from './admin/AdminDashboard';
import UploadMusic from './admin/UploadMusic';
import MusicList from './admin/MusicList';
import UsersList from './admin/UsersList';

import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import MusicPlayer from './components/MusicPlayer';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected User Routes */}
            <Route path="/home" element={
              <ProtectedRoute><Home /></ProtectedRoute>
            } />
            <Route path="/search" element={
              <ProtectedRoute><Search /></ProtectedRoute>
            } />
            <Route path="/player/:id" element={
              <ProtectedRoute><Player /></ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute><AdminDashboard /></AdminRoute>
            } />
            <Route path="/admin/upload" element={
              <AdminRoute><UploadMusic /></AdminRoute>
            } />
            <Route path="/admin/songs" element={
              <AdminRoute><MusicList /></AdminRoute>
            } />
            <Route path="/admin/users" element={
              <AdminRoute><UsersList /></AdminRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MusicPlayer />
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;