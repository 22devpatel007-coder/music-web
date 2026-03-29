import { usePlayer } from '../context/PlayerContext';

const SongCard = ({ song, songList }) => {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const isActive = currentSong?.id === song.id;

  return (
    <div
      onClick={() => playSong(song, songList)}
      className={`bg-gray-800 rounded-xl p-4 cursor-pointer 
        hover:bg-gray-700 transition transform hover:scale-105
        ${isActive ? 'ring-2 ring-green-500' : ''}`}>
      <div className="relative">
        <img
          src={song.coverUrl || 'https://via.placeholder.com/200'}
          alt={song.title}
          className="w-full h-48 object-cover rounded-lg mb-3"
        />
        {isActive && isPlaying && (
          <div className="absolute inset-0 flex items-center 
            justify-center bg-black bg-opacity-40 rounded-lg">
            <span className="text-green-400 text-4xl">▶</span>
          </div>
        )}
      </div>
      <h3 className="text-white font-semibold truncate">{song.title}</h3>
      <p className="text-gray-400 text-sm truncate">{song.artist}</p>
      <span className="text-xs text-green-500 bg-green-500 
        bg-opacity-20 px-2 py-1 rounded-full mt-1 inline-block">
        {song.genre}
      </span>
    </div>
  );
};

export default SongCard;