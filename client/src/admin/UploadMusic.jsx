import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// FIX: Use axiosUpload (5-min timeout) instead of axiosInstance (15s timeout).
// Song uploads to Cloudinary can take 30-120s on slow connections.
import { axiosUpload } from '../utils/axiosInstance';
import Navbar from '../components/Navbar';

const UploadMusic = () => {
  const [form, setForm] = useState({ title: '', artist: '', genre: '', duration: '' });
  const [songFile, setSongFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!songFile)  return setError('Please select an MP3 file.');
    if (!coverFile) return setError('Please select a cover image.');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title',    form.title);
      fd.append('artist',   form.artist);
      fd.append('genre',    form.genre);
      fd.append('duration', form.duration);
      fd.append('song',     songFile);
      fd.append('cover',    coverFile);

      await axiosUpload.post('/api/songs', fd, {
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      setSuccess('Song uploaded successfully!');
      setProgress(0);
      setForm({ title: '', artist: '', genre: '', duration: '' });
      setSongFile(null);
      setCoverFile(null);
      setTimeout(() => navigate('/admin/songs'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.heading}>Upload Song</h1>
          <p style={styles.subheading}>Add a new track to your library</p>
        </div>

        <div style={styles.card}>
          {error   && <div style={styles.errorBox}>{error}</div>}
          {success && <div style={styles.successBox}>{success}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.row}>
              <Field label="Song Title"   name="title"  placeholder="e.g. Blinding Lights" value={form.title}    onChange={handleChange} required />
              <Field label="Artist Name"  name="artist" placeholder="e.g. The Weeknd"       value={form.artist}   onChange={handleChange} required />
            </div>
            <div style={styles.row}>
              <Field label="Genre"                name="genre"    placeholder="Pop, Rock, Hip-Hop…" value={form.genre}    onChange={handleChange} required />
              <Field label="Duration (seconds)"   name="duration" type="number" placeholder="e.g. 214" value={form.duration} onChange={handleChange} required />
            </div>

            <FileField
              label="MP3 File"
              hint="Max 50 MB · .mp3 only"
              accept=".mp3,audio/mpeg"
              file={songFile}
              onChange={(e) => setSongFile(e.target.files[0])}
            />
            <FileField
              label="Cover Image"
              hint="JPG, PNG, WEBP"
              accept="image/*"
              file={coverFile}
              onChange={(e) => setCoverFile(e.target.files[0])}
            />

            {progress > 0 && (
              <div style={styles.progressWrap}>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                </div>
                <span style={styles.progressLabel}>{progress}%</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? `Uploading… ${progress}%` : 'Upload Song'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, name, type = 'text', placeholder, value, onChange, required }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <input
        type={type} name={name} placeholder={placeholder}
        value={value} onChange={onChange} required={required}
        style={{ ...styles.input, borderColor: focused ? '#22c55e' : '#2d2d2d' }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
};

const FileField = ({ label, hint, accept, file, onChange }) => (
  <div style={styles.fileField}>
    <div style={styles.fileTop}>
      <label style={styles.label}>{label}</label>
      <span style={styles.fileHint}>{hint}</span>
    </div>
    <label style={styles.fileLabel}>
      <input type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} />
      <span style={styles.fileBrowse}>Browse file</span>
      <span style={styles.fileName}>{file ? `✓  ${file.name}` : 'No file selected'}</span>
    </label>
  </div>
);

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  container: { maxWidth: '680px', margin: '0 auto', padding: '32px 20px 80px' },
  pageHeader: { marginBottom: '24px' },
  heading: { color: '#fff', fontSize: '22px', fontWeight: '700', letterSpacing: '-0.3px', marginBottom: '4px' },
  subheading: { color: '#6b7280', fontSize: '13px' },
  card: { background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: '14px', padding: '28px' },
  errorBox: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', marginBottom: '20px',
  },
  successBox: {
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
    color: '#4ade80', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', marginBottom: '20px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#9ca3af', fontSize: '12px', fontWeight: '500' },
  input: {
    background: '#111', border: '1px solid #2d2d2d', borderRadius: '8px',
    padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none',
    transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  fileField: { background: '#111', border: '1px solid #2d2d2d', borderRadius: '8px', padding: '14px' },
  fileTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  fileHint: { color: '#4b5563', fontSize: '11px' },
  fileLabel: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' },
  fileBrowse: {
    background: '#2d2d2d', color: '#e5e7eb', borderRadius: '6px',
    padding: '6px 14px', fontSize: '12px', fontWeight: '500', flexShrink: 0,
  },
  fileName: { color: '#6b7280', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
  progressBar: { flex: 1, height: '4px', background: '#2d2d2d', borderRadius: '2px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#22c55e', borderRadius: '2px', transition: 'width 0.2s' },
  progressLabel: { color: '#22c55e', fontSize: '12px', fontWeight: '600', minWidth: '34px', textAlign: 'right' },
  submitBtn: {
    background: '#22c55e', color: '#000', border: 'none', borderRadius: '8px',
    padding: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
    marginTop: '4px', fontFamily: 'inherit', transition: 'background 0.2s',
  },
};

export default UploadMusic;