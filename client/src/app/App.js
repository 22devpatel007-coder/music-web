import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppProviders from './providers';
import AppRoutes from './routes';
import MusicPlayer from 'features/player/components/MusicPlayer';

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
        <MusicPlayer />
      </AppProviders>
    </BrowserRouter>
  );
}
