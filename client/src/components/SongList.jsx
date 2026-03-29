import SongCard from './SongCard';

const SongList = ({ songs }) => {
  if (!songs.length) {
    return (
      <div className="text-center text-gray-400 py-20">
        <p className="text-4xl mb-4">🎵</p>
        <p>No songs found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 
      md:grid-cols-4 lg:grid-cols-5 gap-4">
      {songs.map(song => (
        <SongCard key={song.id} song={song} songList={songs} />
      ))}
    </div>
  );
};

export default SongList;