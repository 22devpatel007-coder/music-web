const SongSchema = {
  id: 'string',
  title: 'string',
  artist: 'string',
  album: 'string',
  duration: 'number',
  audioUrl: 'string',
  coverUrl: 'string',
  titleLower: 'string',
  artistLower: 'string',
  createdAt: 'timestamp',
  uploadedBy: 'string',
};

const createSongDefaults = () => ({
  album: '',
  duration: 0,
  coverUrl: '',
  titleLower: '',
  artistLower: '',
  createdAt: new Date(),
  uploadedBy: '',
});

module.exports = { SongSchema, createSongDefaults };
