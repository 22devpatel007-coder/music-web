import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axiosInstance.get('/api/users');
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-white text-3xl font-bold mb-8">
          Users List
        </h1>

        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md bg-gray-800 text-white px-4 py-3 
            rounded-lg outline-none focus:ring-2 focus:ring-green-500
            placeholder-gray-500 mb-6"
        />

        <div className="bg-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-gray-400 text-left px-4 py-3">Name</th>
                <th className="text-gray-400 text-left px-4 py-3">Email</th>
                <th className="text-gray-400 text-left px-4 py-3">Role</th>
                <th className="text-gray-400 text-left px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id}
                  className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3 text-white">
                    {user.displayName || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm px-2 py-1 rounded-full
                      ${user.role === 'admin'
                        ? 'bg-green-500 bg-opacity-20 text-green-400'
                        : 'bg-gray-600 text-gray-300'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {user.createdAt?.toDate
                      ? user.createdAt.toDate().toLocaleDateString()
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersList;