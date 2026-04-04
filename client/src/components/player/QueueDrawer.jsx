import useQueueStore from '../../store/queueStore';
import usePlayerStore from '../../store/playerStore';
import { truncateText } from '../../utils/formatters';

export const QueueDrawer = ({ open, onClose }) => {
  const { queue, removeFromQueue, currentIndex } = useQueueStore();
  const playSong = usePlayerStore((s) => s.playSong);

  if (!open) return null;
  return (
    <div className='fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-40 flex flex-col'>
      <div className='flex justify-between items-center p-4 border-b'>
        <h2 className='font-semibold'>Queue ({queue.length})</h2>
        <button onClick={onClose} className='text-gray-500 hover:text-gray-700'>x</button>
      </div>
      <ul className='flex-1 overflow-y-auto divide-y'>
        {queue.map((song, i) => (
          <li key={song.id + i} className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer ${i === currentIndex ? 'bg-blue-50' : ''}`}>
            <img src={song.coverUrl} alt='' className='w-10 h-10 rounded object-cover' />
            <div className='flex-1 min-w-0' onClick={() => playSong(song)}>
              <p className='text-sm font-medium truncate'>{truncateText(song.title, 30)}</p>
              <p className='text-xs text-gray-500 truncate'>{song.artist}</p>
            </div>
            <button onClick={() => removeFromQueue(i)} className='text-gray-400 hover:text-red-500 text-xs'>x</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
