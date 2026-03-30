import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';

/* ─── helpers ───────────────────────────────────────────────────────────────── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                'Jul','Aug','Sep','Oct','Nov','Dec'];

const monthKey = (ts) => {
  if (!ts) return null;
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── component ─────────────────────────────────────────────────────────────── */
const AdminDashboard = () => {
  const [songs, setSongs]   = useState([]);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sRes, uRes] = await Promise.all([
          axiosInstance.get('/api/songs'),
          axiosInstance.get('/api/users'),
        ]);
        setSongs(sRes.data);
        setUsers(uRes.data);
      } catch (err) {
        console.error('Dashboard fetch failed:', err);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  /* top songs by playCount */
  const topSongs = useMemo(() =>
    [...songs]
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, 8)
      .map(s => ({ name: s.title.length > 14 ? s.title.slice(0, 14) + '…' : s.title, plays: s.playCount || 0 })),
    [songs]
  );

  /* uploads per month */
  const uploadsPerMonth = useMemo(() => {
    const map = {};
    songs.forEach(s => {
      const k = monthKey(s.createdAt);
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([month, count]) => ({ month, count }))
      .slice(-6);
  }, [songs]);

  /* users per month */
  const usersPerMonth = useMemo(() => {
    const map = {};
    users.forEach(u => {
      const k = monthKey(u.createdAt);
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([month, count]) => ({ month, count }))
      .slice(-6);
  }, [users]);

  /* genre breakdown */
  const genreBreakdown = useMemo(() => {
    const map = {};
    songs.forEach(s => {
      if (s.genre) map[s.genre] = (map[s.genre] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count }));
  }, [songs]);

  const recentSongs = songs.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-white text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Songs',  value: songs.length,  icon: '🎵', color: 'text-green-400' },
            { label: 'Total Users',  value: users.length,  icon: '👥', color: 'text-blue-400'  },
            { label: 'Total Plays',  value: songs.reduce((a, s) => a + (s.playCount || 0), 0), icon: '▶️', color: 'text-purple-400' },
            { label: 'Genres',       value: new Set(songs.map(s => s.genre).filter(Boolean)).size, icon: '🏷️', color: 'text-yellow-400' },
          ].map(card => (
            <div key={card.label} className="bg-gray-800 rounded-2xl p-5">
              <p className="text-gray-400 text-xs mb-1">{card.icon} {card.label}</p>
              <p className={`${card.color} text-3xl font-bold`}>
                {loading ? '—' : card.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Action links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link to="/admin/upload"
            className="bg-green-500 hover:bg-green-600 text-black
              font-bold py-4 rounded-xl text-center transition">
            ⬆️ Upload Song
          </Link>
          <Link to="/admin/songs"
            className="bg-gray-800 hover:bg-gray-700 text-white
              font-bold py-4 rounded-xl text-center transition">
            🎵 Manage Songs
          </Link>
          <Link to="/admin/users"
            className="bg-gray-800 hover:bg-gray-700 text-white
              font-bold py-4 rounded-xl text-center transition">
            👥 View Users
          </Link>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top songs by plays */}
          <div className="bg-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4 text-sm">📊 Top Songs by Plays</h2>
            {loading || topSongs.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">No play data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSongs} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="plays" fill="#22C55E" radius={[4, 4, 0, 0]} name="Plays" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Genre breakdown */}
          <div className="bg-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4 text-sm">🏷️ Songs by Genre</h2>
            {loading || genreBreakdown.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">No genre data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={genreBreakdown} layout="vertical"
                  margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis dataKey="genre" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#818CF8" radius={[0, 4, 4, 0]} name="Songs" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Uploads per month */}
          <div className="bg-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4 text-sm">📈 Uploads per Month</h2>
            {loading || uploadsPerMonth.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={uploadsPerMonth}
                  margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#22C55E"
                    strokeWidth={2} dot={{ fill: '#22C55E', r: 4 }} name="Uploads" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Users over time */}
          <div className="bg-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4 text-sm">👥 New Users per Month</h2>
            {loading || usersPerMonth.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={usersPerMonth}
                  margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#60A5FA"
                    strokeWidth={2} dot={{ fill: '#60A5FA', r: 4 }} name="Users" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent uploads */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <h2 className="text-white text-lg font-bold mb-4">🕐 Recent Uploads</h2>
          {recentSongs.length === 0 ? (
            <p className="text-gray-400 text-sm">No songs uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {recentSongs.map(song => (
                <div key={song.id}
                  className="flex items-center gap-4 border-b border-gray-700 pb-3">
                  <img src={song.coverUrl} alt={song.title}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{song.title}</p>
                    <p className="text-gray-400 text-sm">{song.artist}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-green-500 text-xs bg-green-500
                      bg-opacity-20 px-2 py-1 rounded-full block mb-1">
                      {song.genre}
                    </span>
                    <span className="text-gray-500 text-xs">
                      ▶ {(song.playCount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;