import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import Navbar from '../components/Navbar';

const UploadMusic = () => {
  const [form, setForm] = useState({
    title: '', artist: '', genre: '', duration: ''
  });
  const [songFile, setSongFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!songFile) return setError('Please select an MP3 file');
    if (!coverFile) return setError('Please select a cover image');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('artist', form.artist);
      formData.append('genre', form.genre);
      formData.append('duration', form.duration);
      formData.append('song', songFile);
      formData.append('cover', coverFile);

      await axiosInstance.post('/api/songs', formData, {
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
        },
      });

      setSuccess('Song uploaded successfully!');
      setProgress(0);
      setForm({ title: '', artist: '', genre: '', duration: '' });
      setSongFile(null);
      setCoverFile(null);
      setTimeout(() => navigate('/admin/songs'), 1500);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Upload failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-xl mx-auto px-6 py-8">
        <h1 className="text-white text-3xl font-bold mb-8">
          Upload Song
        </h1>

        {error && (
          <div className="bg-red-500 bg-opacity-20 text-red-400 
            px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-500 bg-opacity-20 text-green-400 
            px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="title"
            placeholder="Song Title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full bg-gray-800 text-white px-4 py-3 
              rounded-lg outline-none focus:ring-2 focus:ring-green-500
              placeholder-gray-500"
          />
          <input
            name="artist"
            placeholder="Artist Name"
            value={form.artist}
            onChange={handleChange}
            required
            className="w-full bg-gray-800 text-white px-4 py-3 
              rounded-lg outline-none focus:ring-2 focus:ring-green-500
              placeholder-gray-500"
          />
          <input
            name="genre"
            placeholder="Genre (Pop, Rock, etc.)"
            value={form.genre}
            onChange={handleChange}
            required
            className="w-full bg-gray-800 text-white px-4 py-3 
              rounded-lg outline-none focus:ring-2 focus:ring-green-500
              placeholder-gray-500"
          />
          <input
            name="duration"
            type="number"
            placeholder="Duration (in seconds)"
            value={form.duration}
            onChange={handleChange}
            required
            className="w-full bg-gray-800 text-white px-4 py-3 
              rounded-lg outline-none focus:ring-2 focus:ring-green-500
              placeholder-gray-500"
          />

          {/* MP3 Upload */}
          <div className="bg-gray-800 rounded-lg p-4">
            <label className="text-gray-400 text-sm block mb-2">
              MP3 File (max 10MB)
            </label>
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={(e) => setSongFile(e.target.files[0])}
              className="text-white w-full"
            />
            {songFile && (
              <p className="text-green-400 text-xs mt-1">
                ✅ {songFile.name}
              </p>
            )}
          </div>

          {/* Cover Image Upload */}
          <div className="bg-gray-800 rounded-lg p-4">
            <label className="text-gray-400 text-sm block mb-2">
              Cover Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files[0])}
              className="text-white w-full"
            />
            {coverFile && (
              <p className="text-green-400 text-xs mt-1">
                ✅ {coverFile.name}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 
              text-black font-bold py-3 rounded-lg transition
              disabled:opacity-50">
            {loading ? `Uploading... ${progress}%` : 'Upload Song'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadMusic;